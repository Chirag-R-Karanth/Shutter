# Shutter — self-hosted archive

FastAPI + MariaDB + local filesystem; plain HTML/CSS/JS; no frontend build step. This is a separate implementation under `selfhosted/`; it does not replace or modify the existing Supabase app or its schema.

## Requirements
- Python 3.11+
- MariaDB 10.6+
- FFmpeg (video thumbnails)
- ImageMagick is not required

## Install on Fedora
```bash
sudo dnf install mariadb-server ffmpeg python3 python3-pip
sudo systemctl enable --now mariadb
sudo mariadb
```

In the MariaDB shell, set a strong password:
```sql
CREATE DATABASE shutter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'shutter_user'@'localhost' IDENTIFIED BY 'REPLACE_WITH_A_LONG_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON shutter.* TO 'shutter_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

From this directory:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`: set `DATABASE_URL` to the MariaDB credentials, set `SESSION_SECRET` to a random secret, and set `ARCHIVE_PASSWORD_HASH` to an Argon2 hash. Generate values:
```bash
python -c 'import secrets; print(secrets.token_urlsafe(48))'
python -c 'from pwdlib import PasswordHash; print(PasswordHash.recommended().hash(input("Password to hash: ")))'
```
Paste the outputs into the matching .env values. Do not use the plaintext password in configuration.

## Run
```bash
uvicorn main:app --app-dir . --host 127.0.0.1 --port 8000
```
Open http://127.0.0.1:8000. Keep the service bound to localhost unless you configure HTTPS and firewalling. Set `COOKIE_SECURE=true` behind HTTPS.

## Data and backup
Uploads are stored in `DATA_DIR/media`; generated thumbnails in `DATA_DIR/thumbs`. Back up both directories and MariaDB together. Deleting an archive item deletes its local file and thumbnail. The original Supabase data is not touched by this implementation. Before migrating old catalogue entries, export and validate them separately; legacy ratings/reviews/provider IDs are not currently represented in this file-oriented schema.

## API
- `POST /api/login`, `POST /api/logout`
- `GET /api/media?cursor=&q=&tag=&type=&sort=` (up to 40 records)
- `POST /api/media` (multipart field `files`, multiple uploads)
- `GET/PATCH/DELETE /api/media/{id}`
- `GET /api/media/{id}/thumbnail`, `GET /api/media/{id}/file`
- `GET /api/tags`

## Limitations to resolve before public exposure
This first implementation is a local/private baseline, not a hardened internet-facing deployment. Use HTTPS, add CSRF tokens/origin validation for cookie-authenticated writes, add rate limiting to login, and test large uploads and FFmpeg behavior on your target system. The cookie signature provides integrity and expiry but does not maintain a server-side revocation list; logout clears browser cookies only. Do not expose this directly to the internet without addressing those items.
