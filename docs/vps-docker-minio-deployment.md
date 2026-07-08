# TVA Collect VPS Deployment: Docker + PostgreSQL + Nginx + MinIO

## Target Architecture

```txt
Internet
  |
  v
Nginx on VPS
  |
  v
TVA Collect Next.js app container
  |
  +--> PostgreSQL container: operational database
  |
  +--> MinIO container: private S3-compatible document storage
```

Only Nginx is public.

PostgreSQL and MinIO API stay private inside the Docker network.

MinIO console is reachable two ways, both admin-only:

```txt
https://minio.tvacollect.com   (Nginx + Basic Auth, see "MinIO Console" below)
127.0.0.1:9001 via SSH tunnel  (fallback, unchanged)
```

SSH tunnel fallback:

```bash
ssh -L 9001:127.0.0.1:9001 root@YOUR_VPS_IP
```

Then open:

```txt
http://localhost:9001
```

## VPS Minimum

For pilots:

```txt
2 vCPU
4 GB RAM
60-80 GB SSD
Ubuntu 24.04 LTS
```

For real cabinets with files:

```txt
4 vCPU
8 GB RAM
160+ GB SSD
daily backups
```

## DNS

Point Cloudflare DNS to the VPS:

```txt
A    app    VPS_IP
A    @      VPS_IP
A    www    VPS_IP
A    minio  VPS_IP
```

`minio.tvacollect.com` can be Cloudflare-proxied (orange cloud) like the others — this hides the origin IP and is required if you add Cloudflare Access in front of it. DNS-only (grey cloud) also works if you rely on Nginx Basic Auth alone.

Recommended app URL:

```txt
https://app.tvacollect.com
```

## Server Setup

Install Docker:

```bash
apt update
apt install -y ca-certificates curl git ufw
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Firewall:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Deploy Code

```bash
git clone YOUR_REPO_URL /opt/tva-collect
cd /opt/tva-collect
cp deploy/.env.production.example .env.production
```

Edit:

```bash
nano .env.production
```

Change every placeholder password and secret.

Required:

```txt
POSTGRES_PASSWORD
AUTH_SECRET
NEXTAUTH_SECRET
APP_URL
NEXTAUTH_URL
MINIO_ROOT_USER
MINIO_ROOT_PASSWORD
S3_BUCKET
RESEND_API_KEY
EMAIL_FROM
ADMIN_EMAIL
```

## First Certificate

The provided Nginx config expects certificates at:

```txt
deploy/certbot/conf/live/app.tvacollect.com/
```

Before first HTTPS start, create certificates with Certbot on the host or with a temporary Nginx/Certbot setup.

Simple host option:

```bash
apt install -y certbot
systemctl stop nginx || true
certbot certonly --standalone -d app.tvacollect.com
mkdir -p deploy/certbot/conf/live
cp -a /etc/letsencrypt deploy/certbot/conf
```

If Nginx fails before cert exists, temporarily use an HTTP-only config, issue the certificate, then restore `deploy/nginx/tvacollect.conf`.

## Start Production Stack

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Run migrations:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app node node_modules/prisma/build/index.js migrate deploy
```

Create first SaaS admin:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app npm run create-admin
```

Health check:

```bash
curl https://app.tvacollect.com/api/health
```

## MinIO Storage

The `minio-init` service creates the bucket:

```txt
S3_BUCKET=tvacollect-uploads
```

The bucket is private:

```txt
mc anonymous set none
```

The app uses:

```env
UPLOAD_STORAGE=s3
S3_ENDPOINT=http://minio:9000
S3_BUCKET=tvacollect-uploads
S3_ACCESS_KEY=tvacollect-app
S3_SECRET_KEY=separate-long-app-s3-password
```

The S3 API port (`9000`) is never published to the host or the internet — only
`expose`d on the internal Docker network so `app` and `minio-init` can reach it
as `http://minio:9000`. Keep it that way; there is no reason for the S3 API
itself to be public.

## MinIO Console (`minio.tvacollect.com`, admin-only)

The console (port `9001`) is for the SaaS admin to inspect buckets/files. It is
never linked from the app and is not for cabinets or clients. Three layers
protect it, stacked:

1. Nginx Basic Auth (`deploy/nginx/minio.htpasswd`) — required, blocks the console entirely until a valid Basic Auth prompt is answered.
2. MinIO's own root login (`MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`) — MinIO's normal login screen, reached only after Basic Auth passes.
3. Cloudflare Access (optional, recommended) — an extra identity-based gate at Cloudflare's edge, before traffic even reaches the VPS.

The S3 API (`9000`) stays internal-only regardless — the console reverse proxy
does not change that.

### 1. DNS

Add the `A minio VPS_IP` record from the DNS section above and wait for it to resolve:

```bash
dig +short minio.tvacollect.com
```

### 2. Generate the Basic Auth file

Do this before starting/reloading Nginx — Nginx refuses to start if
`deploy/nginx/minio.htpasswd` does not exist (the same way it already refuses
to start without `.env.production`).

```bash
docker run --rm httpd:2.4-alpine htpasswd -Bbn admin 'CHOOSE-A-VERY-STRONG-PASSWORD' > deploy/nginx/minio.htpasswd
```

Use a different password than `MINIO_ROOT_PASSWORD` — these are two independent layers on purpose. `deploy/nginx/minio.htpasswd` is git-ignored; it must be generated per environment and never committed.

### 3. Set the browser redirect URL

`.env.production` needs:

```env
MINIO_BROWSER_REDIRECT_URL=https://minio.tvacollect.com
```

This is required behind a reverse proxy — without it, the console's internal redirects/asset URLs point at the container's own view of itself instead of the public hostname, and the UI misbehaves after login.

### 4. Validate, then start/reload

Confirm the file from step 2 actually landed as a file (a common Docker Compose
foot-gun: if `deploy/nginx/minio.htpasswd` does not exist yet, `up`/`restart`
silently creates an empty *directory* at that path instead of erroring, and
Nginx then fails to start because it cannot read a directory as the auth file):

```bash
test -f deploy/nginx/minio.htpasswd && echo OK || echo "MISSING — redo step 2 first"
```

Then dry-run the Nginx config before reloading the real container, so a typo
cannot take down `app.tvacollect.com`/`tvacollect.com` along with it:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm --no-deps --entrypoint nginx nginx -t -c /etc/nginx/nginx.conf
```

Once that reports `syntax is ok` / `test is successful`:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d minio nginx
```

### 5. Extend the TLS certificate to cover the new subdomain

`minio.tvacollect.com` is already in `deploy/nginx/tvacollect.conf`'s HTTP (port 80) block, so the ACME challenge works immediately — but the certificate itself needs the new name added to it once:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile certbot run --rm certbot
docker compose --env-file .env.production -f docker-compose.prod.yml restart nginx
```

The `certbot` service in `docker-compose.prod.yml` already lists `-d minio.tvacollect.com` alongside the existing domains, so this expands the existing certificate (same `app.tvacollect.com` cert lineage) instead of creating a separate one. The final `restart nginx` is required so Nginx picks up the updated certificate file — until then it serves the old certificate (which does not list `minio.tvacollect.com`), so browsers show a name-mismatch warning for that one hostname only; `app.tvacollect.com`, `tvacollect.com`, `www.tvacollect.com` and `admin.tvacollect.com` are unaffected either way.

### 6. Optional third layer: Cloudflare Access

If the DNS record is Cloudflare-proxied, add a Zero Trust Access application in the Cloudflare dashboard (not part of this repo's config, done once in the dashboard):

1. Cloudflare dashboard → Zero Trust → Access → Applications → Add an application → Self-hosted.
2. Domain: `minio.tvacollect.com`.
3. Policy: Allow, with a rule matching only the SaaS admin's email (or a short allowlist).
4. Save. Cloudflare now prompts for identity verification (e.g. email one-time code) before a request ever reaches Nginx/Basic Auth.

This is additive — Nginx Basic Auth and MinIO's own login still apply behind it.

Alternative/extra layer — IP allowlist: if the SaaS admin only ever connects from a small set of static IPs, add to the `minio.tvacollect.com` server block in `deploy/nginx/tvacollect.conf` (inside `location /`, before `proxy_pass`):

```nginx
allow 203.0.113.10;   # admin static IP
deny all;
```

Only practical with static IPs — skip it if the admin connects from home/mobile connections with changing IPs, since that would lock them out along with everyone else.

### 7. Test access

```bash
# DNS resolves
dig +short minio.tvacollect.com

# HTTPS works and returns a valid cert for the hostname
curl -vI https://minio.tvacollect.com 2>&1 | grep -E "subject:|HTTP/"

# Unauthenticated request is blocked (expect 401, not the console)
curl -s -o /dev/null -w "%{http_code}\n" https://minio.tvacollect.com

# Wrong Basic Auth credentials are blocked (expect 401)
curl -s -o /dev/null -w "%{http_code}\n" -u admin:wrong-password https://minio.tvacollect.com

# Correct Basic Auth credentials pass through to MinIO's own login page (expect 200)
curl -s -o /dev/null -w "%{http_code}\n" -u admin:YOUR_HTPASSWD_PASSWORD https://minio.tvacollect.com
```

Then manually:

1. Open `https://minio.tvacollect.com` in a browser — expect a Basic Auth prompt first.
2. Enter the `htpasswd` credentials from step 2 — expect MinIO's own console login screen next.
3. Log in with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` — expect the bucket/object browser.
4. Open a private/incognito window (or ask someone without the Basic Auth password) and confirm they are stopped at the Basic Auth prompt and cannot reach MinIO's login screen at all.
5. If Cloudflare Access is enabled, confirm step 4 is stopped even earlier, at Cloudflare's identity prompt, before Nginx is ever reached.
6. Confirm the app is unaffected: run a normal client upload through `/upload/[token]` and check `/app/documents` — this exercises `S3_ENDPOINT=http://minio:9000`, a completely separate internal path from the console.

## Backups

Database backup:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --file=/tmp/tvacollect.dump
docker cp tvacollect-postgres:/tmp/tvacollect.dump ./backups/tvacollect-$(date +%Y%m%d-%H%M%S).dump
```

MinIO data backup:

```bash
docker run --rm \
  --network tva-collect_default \
  -v "$PWD/backups:/backups" \
  minio/mc:RELEASE.2025-04-16T18-13-26Z \
  sh -c "mc alias set local http://minio:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD && mc mirror local/$S3_BUCKET /backups/minio-$S3_BUCKET-$(date +%Y%m%d-%H%M%S)"
```

Also keep off-server backups. VPS disk backups alone are not enough.

## Update Deployment

```bash
cd /opt/tva-collect
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml exec app node node_modules/prisma/build/index.js migrate deploy
docker compose --env-file .env.production -f docker-compose.prod.yml exec app npm run release:check
```

## Production Rule

Do not store real cabinet documents until:

```txt
HTTPS works
admin provisioning works
owner invite works
public upload works
document download works
database backup tested
MinIO backup tested
restore drill tested
```
