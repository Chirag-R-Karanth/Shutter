import os, re, uuid, secrets, hashlib, mimetypes, subprocess
from pathlib import Path
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Request, Response, UploadFile, File, Form
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, String, Text, BigInteger, Integer, Float, DateTime, ForeignKey, Index, select, or_, and_, func, delete
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, Session, sessionmaker, selectinload
from pwdlib import PasswordHash
from PIL import Image, ImageOps
import io

load_dotenv()
BASE = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("DATA_DIR", BASE / "data")).resolve()
MEDIA_DIR = DATA_DIR / "media"
THUMB_DIR = DATA_DIR / "thumbs"
MEDIA_DIR.mkdir(parents=True, exist_ok=True); THUMB_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_URL = os.environ["DATABASE_URL"]
SESSION_SECRET = os.environ["SESSION_SECRET"]
ARCHIVE_PASSWORD_HASH = os.environ["ARCHIVE_PASSWORD_HASH"]
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "200"))
SESSION_TTL_HOURS = int(os.getenv("SESSION_TTL_HOURS", "168"))
ALLOWED = {"image", "video", "audio", "doc"}
MIME_PREFIX = {"image": "image/", "video": "video/", "audio": "audio/"}
DOC_MIMES = {"application/pdf", "text/plain", "application/rtf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=1800)
SessionLocal = sessionmaker(engine, expire_on_commit=False)
password_hash = PasswordHash.recommended()

class Base(DeclarativeBase): pass
class Media(Base):
    __tablename__ = "media"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    thumb_path: Mapped[str | None] = mapped_column(String(512))
    mime: Mapped[str] = mapped_column(String(160), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    duration: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    tags: Mapped[list["Tag"]] = relationship(secondary="media_tags", lazy="selectin")
class Tag(Base):
    __tablename__ = "tags"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
class MediaTag(Base):
    __tablename__ = "media_tags"
    media_id: Mapped[int] = mapped_column(ForeignKey("media.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

def db():
    s = SessionLocal()
    try: yield s
    finally: s.close()

def session_cookie(request: Request):
    token = request.cookies.get("shutter_session")
    if not token: return False
    expiry = request.cookies.get("shutter_exp")
    if not expiry: return False
    try:
        stamp, sig = expiry.split(".", 1)
        expected = hashlib.sha256((stamp + SESSION_SECRET + token).encode()).hexdigest()
        if not secrets.compare_digest(sig, expected) or int(stamp) < int(datetime.now(timezone.utc).timestamp()): return False
        return True
    except (ValueError, TypeError): return False

def require_auth(request: Request):
    if not session_cookie(request): raise HTTPException(401, "Login required")

def safe_title(name: str) -> str:
    name = Path(name or "upload").name
    name = re.sub(r"[\x00-\x1f<>:\"/\\|?*]", "_", name).strip(" .")
    return (name or "upload")[:255]

def media_type(mime: str) -> str:
    if mime.startswith("image/"): return "image"
    if mime.startswith("video/"): return "video"
    if mime.startswith("audio/"): return "audio"
    if mime in DOC_MIMES: return "doc"
    raise HTTPException(415, "Unsupported file type")

def make_thumbnail(src: Path, target: Path, kind: str):
    if kind == "image":
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im); im.thumbnail((640, 640))
            if im.mode not in ("RGB", "RGBA"): im = im.convert("RGB")
            im.save(target, "WEBP", quality=82, method=5)
            return im.width, im.height, None
    if kind == "video":
        ffmpeg = os.getenv("FFMPEG_PATH", "ffmpeg")
        subprocess.run([ffmpeg, "-nostdin", "-v", "error", "-ss", "00:00:01", "-i", str(src), "-frames:v", "1", "-vf", "scale='min(640,iw)':-2", str(target)], timeout=30, check=True)
    return None, None, None

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    yield
app = FastAPI(title="Shutter Archive API", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=BASE / "static", check_dir=False), name="static")

@app.get("/", response_class=HTMLResponse)
def index():
    p = BASE / "static" / "index.html"
    return p.read_text() if p.exists() else "<h1>Shutter</h1>"

@app.post("/api/login")
async def login(request: Request, response: Response):
    body = await request.json()
    if not password_hash.verify(str(body.get("password", "")), ARCHIVE_PASSWORD_HASH):
        raise HTTPException(401, "Invalid password")
    token = secrets.token_urlsafe(32)
    stamp = str(int((datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS)).timestamp()))
    sig = hashlib.sha256((stamp + SESSION_SECRET + token).encode()).hexdigest()
    response.set_cookie("shutter_session", token, httponly=True, samesite="lax", secure=os.getenv("COOKIE_SECURE", "false").lower() == "true", max_age=SESSION_TTL_HOURS*3600, path="/")
    response.set_cookie("shutter_exp", stamp + "." + sig, httponly=True, samesite="lax", secure=os.getenv("COOKIE_SECURE", "false").lower() == "true", max_age=SESSION_TTL_HOURS*3600, path="/")
    return {"ok": True}

@app.post("/api/logout")
def logout(response: Response):
    response.delete_cookie("shutter_session", path="/"); response.delete_cookie("shutter_exp", path="/")
    return {"ok": True}

def serialize(m: Media):
    return {"id":m.id,"title":m.title,"description":m.description,"type":m.type,"mime":m.mime,"size_bytes":m.size_bytes,"width":m.width,"height":m.height,"duration":m.duration,"created_at":m.created_at.isoformat() if m.created_at else None,"updated_at":m.updated_at.isoformat() if m.updated_at else None,"tags":[t.name for t in m.tags],"thumbnail_url":f"/api/media/{m.id}/thumbnail","file_url":f"/api/media/{m.id}/file"}

@app.get("/api/media")
def list_media(cursor: int|None=None, q: str|None=None, tag: str|None=None, type: str|None=None, sort: str="desc", limit: int=40, _: None=Depends(require_auth), s: Session=Depends(db)):
    limit=max(1,min(limit,40)); stmt=select(Media).options(selectinload(Media.tags))
    if cursor is not None: stmt=stmt.where(Media.id < cursor if sort=="desc" else Media.id > cursor)
    if q: stmt=stmt.where(or_(Media.title.ilike(f"%{q[:200]}%"), Media.description.ilike(f"%{q[:200]}%")))
    if type:
        if type not in ALLOWED: raise HTTPException(400,"Invalid type")
        stmt=stmt.where(Media.type==type)
    if tag: stmt=stmt.join(Media.tags).where(Tag.name==tag[:64])
    stmt=stmt.order_by(Media.id.desc() if sort=="desc" else Media.id.asc()).limit(limit+1)
    rows=s.scalars(stmt).unique().all(); more=len(rows)>limit; rows=rows[:limit]
    return {"items":[serialize(m) for m in rows],"next_cursor":rows[-1].id if more and rows else None}

@app.post("/api/media")
async def upload(files: list[UploadFile]=File(...), _: None=Depends(require_auth), s: Session=Depends(db)):
    if len(files)>30: raise HTTPException(413,"Maximum 30 files per request")
    result=[]
    for f in files:
        original=safe_title(f.filename or "upload")
        declared=f.content_type or mimetypes.guess_type(original)[0] or "application/octet-stream"
        kind=media_type(declared)
        ident=uuid.uuid4().hex
        ext=Path(original).suffix.lower()[:12]
        dest=MEDIA_DIR / (ident+ext); thumb=THUMB_DIR / (ident+".webp")
        total=0
        try:
            with dest.open("xb") as out:
                while chunk:=await f.read(1024*1024):
                    total+=len(chunk)
                    if total>MAX_UPLOAD_MB*1024*1024: raise HTTPException(413,f"{original}: exceeds {MAX_UPLOAD_MB} MB")
                    out.write(chunk)
            if total==0: raise HTTPException(400,"Empty upload")
            width=height=duration=None
            if kind=="image":
                # Verify actual image bytes rather than trusting the browser MIME.
                with Image.open(dest) as im:
                    im.verify()
                width,height,_=make_thumbnail(dest,thumb,kind)
                mime=declared
            elif kind=="video":
                make_thumbnail(dest,thumb,kind)
                mime=declared
            else: mime=declared
            m=Media(title=Path(original).stem[:255] or original, type=kind, file_path=str(dest.relative_to(DATA_DIR)), thumb_path=str(thumb.relative_to(DATA_DIR)) if thumb.exists() else None, mime=mime, size_bytes=total,width=width,height=height)
            s.add(m); s.commit(); s.refresh(m); result.append(serialize(m))
        except Exception:
            s.rollback()
            dest.unlink(missing_ok=True); thumb.unlink(missing_ok=True)
            raise
        finally: await f.close()
    return {"items":result}

@app.get("/api/media/{media_id}")
def get_media(media_id:int, _:None=Depends(require_auth), s:Session=Depends(db)):
    m=s.get(Media,media_id)
    if not m: raise HTTPException(404,"Not found")
    return serialize(m)

@app.patch("/api/media/{media_id}")
async def update_media(media_id:int, request:Request, _:None=Depends(require_auth), s:Session=Depends(db)):
    data=await request.json(); m=s.get(Media,media_id)
    if not m: raise HTTPException(404,"Not found")
    if "title" in data:
        title=str(data["title"]).strip()
        if not title or len(title)>255: raise HTTPException(422,"Title must be 1–255 characters")
        m.title=title
    if "description" in data: m.description=str(data["description"] or "")[:20000] or None
    if "tags" in data:
        if not isinstance(data["tags"],list) or len(data["tags"])>30: raise HTTPException(422,"Tags must be a list of at most 30 names")
        tags=[]
        for raw in data["tags"]:
            name=re.sub(r"\s+"," ",str(raw)).strip().lower()
            if not name or len(name)>64: continue
            tag=s.scalar(select(Tag).where(Tag.name==name))
            if tag is None: tag=Tag(name=name); s.add(tag); s.flush()
            if tag not in tags: tags.append(tag)
        m.tags=tags
    m.updated_at=datetime.now(timezone.utc); s.commit(); s.refresh(m)
    return serialize(m)

@app.delete("/api/media/{media_id}")
def delete_media(media_id:int, _:None=Depends(require_auth), s:Session=Depends(db)):
    m=s.get(Media,media_id)
    if not m: raise HTTPException(404,"Not found")
    paths=[DATA_DIR/m.file_path, DATA_DIR/m.thumb_path if m.thumb_path else None]
    s.delete(m); s.commit()
    for p in paths:
        if p:
            try: p.resolve().relative_to(DATA_DIR); p.unlink(missing_ok=True)
            except (ValueError,OSError): pass
    return {"ok":True}

@app.get("/api/media/{media_id}/thumbnail")
def thumbnail(media_id:int, _:None=Depends(require_auth), s:Session=Depends(db)):
    m=s.get(Media,media_id)
    if not m: raise HTTPException(404,"Not found")
    p=DATA_DIR/m.thumb_path if m.thumb_path else None
    if not p or not p.is_file(): raise HTTPException(404,"No thumbnail")
    return FileResponse(p,media_type="image/webp",headers={"Cache-Control":"private, max-age=86400","X-Content-Type-Options":"nosniff"})

@app.get("/api/media/{media_id}/file")
def file(media_id:int, request:Request, _:None=Depends(require_auth), s:Session=Depends(db)):
    m=s.get(Media,media_id)
    if not m: raise HTTPException(404,"Not found")
    p=(DATA_DIR/m.file_path).resolve()
    try: p.relative_to(MEDIA_DIR.resolve())
    except ValueError: raise HTTPException(404,"Not found")
    if not p.is_file(): raise HTTPException(404,"File missing from disk")
    size=p.stat().st_size; rng=request.headers.get("range")
    headers={"Accept-Ranges":"bytes","Cache-Control":"private, max-age=3600","X-Content-Type-Options":"nosniff","Content-Disposition":f'inline; filename="{safe_title(m.title)}"'}
    if rng and rng.startswith("bytes="):
        try:
            start_s,end_s=rng[6:].split("-",1); start=int(start_s) if start_s else max(0,size-int(end_s)); end=int(end_s) if end_s else size-1
            if start<0 or end<start or start>=size: raise ValueError()
            end=min(end,size-1)
        except ValueError: raise HTTPException(416,"Invalid byte range",headers={"Content-Range":f"bytes */{size}"})
        def stream():
            with p.open("rb") as f:
                f.seek(start); remaining=end-start+1
                while remaining:
                    chunk=f.read(min(1024*1024,remaining))
                    if not chunk: break
                    remaining-=len(chunk); yield chunk
        from fastapi.responses import StreamingResponse
        headers.update({"Content-Range":f"bytes {start}-{end}/{size}","Content-Length":str(end-start+1)})
        return StreamingResponse(stream(),status_code=206,media_type=m.mime,headers=headers)
    return FileResponse(p,media_type=m.mime,headers=headers)

@app.get("/api/tags")
def list_tags(_:None=Depends(require_auth), s:Session=Depends(db)):
    rows=s.execute(select(Tag.name,func.count(MediaTag.media_id)).join(MediaTag,Tag.id==MediaTag.tag_id).group_by(Tag.id).order_by(Tag.name)).all()
    return [{"name":name,"count":count} for name,count in rows]
