#!/usr/bin/env python3
"""Static file server with a local IGDB search proxy.

Usage: python3 dev_server.py [port]
Reads IGDB_CLIENT_ID and IGDB_CLIENT_SECRET from .env so the client secret
never reaches the browser.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", "8080"))


def load_env(path):
    values = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


ENV = load_env(ROOT / ".env")
TOKEN = {"value": None, "expires_at": 0.0}


def request(url, *, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method="POST" if data is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"IGDB request failed ({error.code}): {detail}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Could not reach IGDB: {error.reason}") from error


def igdb_token():
    now = time.time()
    if TOKEN["value"] and now < TOKEN["expires_at"] - 60:
        return TOKEN["value"]
    client_id = ENV.get("IGDB_CLIENT_ID", "").strip()
    client_secret = ENV.get("IGDB_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise RuntimeError("IGDB_CLIENT_ID and IGDB_CLIENT_SECRET must be set in .env")
    query = urllib.parse.urlencode({
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials",
    })
    payload = request(f"https://id.twitch.tv/oauth2/token?{query}", data=b"")
    TOKEN["value"] = payload["access_token"]
    TOKEN["expires_at"] = now + int(payload.get("expires_in", 3600))
    return TOKEN["value"]


def search_igdb(query):
    client_id = ENV.get("IGDB_CLIENT_ID", "").strip()
    escaped = query.replace("\\", "\\\\").replace('"', '\\"')
    body = (
        f'search "{escaped}"; '
        "fields name, first_release_date, cover.image_id, artworks.image_id; "
        "limit 10;"
    )
    items = request(
        "https://api.igdb.com/v4/games",
        data=body.encode("utf-8"),
        headers={
            "Client-ID": client_id,
            "Authorization": f"Bearer {igdb_token()}",
            "Accept": "application/json",
            "Content-Type": "text/plain",
        },
    )
    results = []
    for item in items:
        cover = item.get("cover") or {}
        artwork = (item.get("artworks") or [{}])[0]
        release_year = None
        if item.get("first_release_date"):
            release_year = datetime.fromtimestamp(item["first_release_date"], tz=timezone.utc).year
        results.append({
            "external_id": str(item.get("id", "")),
            "title": item.get("name") or "Untitled",
            "release_year": release_year,
            "poster_url": (
                f"https://images.igdb.com/igdb/image/upload/t_cover_big/{cover['image_id']}.jpg"
                if cover.get("image_id") else None
            ),
            "backdrop_url": (
                f"https://images.igdb.com/igdb/image/upload/t_1080p/{artwork['image_id']}.jpg"
                if artwork.get("image_id") else None
            ),
            "category": "games",
        })
    return results


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/igdb":
            query = (urllib.parse.parse_qs(parsed.query).get("q") or [""])[0].strip()
            if not query:
                return self.send_json(200, [])
            try:
                return self.send_json(200, search_igdb(query))
            except Exception as error:
                return self.send_json(502, {"error": str(error)})
        if self.is_private_path(parsed.path):
            return self.send_error(404)
        return super().do_GET()

    def is_private_path(self, path):
        parts = [part for part in path.split("/") if part]
        return any(part.startswith(".") for part in parts) or path == "/dev_server.py"

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Shutter: http://localhost:{PORT}  (IGDB proxy: /api/igdb)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
