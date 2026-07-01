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

MinIO console is bound to:

```txt
127.0.0.1:9001
```

Use SSH tunnel when needed:

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
```

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
SMTP_*
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
docker compose --env-file .env.production -f docker-compose.prod.yml exec app npx prisma migrate deploy
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
S3_ACCESS_KEY=${MINIO_ROOT_USER}
S3_SECRET_KEY=${MINIO_ROOT_PASSWORD}
```

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
docker compose --env-file .env.production -f docker-compose.prod.yml exec app npx prisma migrate deploy
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
