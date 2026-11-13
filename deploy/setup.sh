#!/usr/bin/env bash
# Instalación en droplet Ubuntu recién creado (22.04/24.04).
# Uso (como root):  bash deploy/setup.sh
set -euo pipefail

APP_DIR=/opt/aniversario
REPO_URL=${REPO_URL:-https://github.com/felipeglzo/aniversario.git}

echo "== 1/6 Paquetes base =="
apt-get update -y
apt-get install -y curl git ufw ca-certificates

echo "== 2/6 Node.js 22 LTS =="
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "== 3/6 Caddy (HTTPS automático) =="
if ! command -v caddy >/dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

echo "== 4/6 Código =="
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"
npm install --omit=dev
id -u aniversario >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin -d "$APP_DIR" aniversario
mkdir -p "$APP_DIR/data/photos" "$APP_DIR/data/backups"
chown -R aniversario:aniversario "$APP_DIR/data"

echo "== 5/6 Servicios systemd =="
cp deploy/aniversario.service /etc/systemd/system/
cp deploy/aniversario-daily.service /etc/systemd/system/
cp deploy/aniversario-daily.timer /etc/systemd/system/
cp deploy/Caddyfile /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable --now aniversario
systemctl enable --now aniversario-daily.timer
systemctl reload caddy || systemctl restart caddy

echo "== 6/6 Firewall =="
ufw allow OpenSSH >/dev/null
ufw allow 80,443/tcp >/dev/null
yes | ufw enable >/dev/null || true

echo
echo "Listo. Pasos manuales:"
echo "  1) Edita $APP_DIR/data/config.env  (RESEND_API_KEY, MAIL_TO_FERNANDA)"
echo "  2) Contraseñas:  cd $APP_DIR && sudo -u aniversario node scripts/set-password.js felipe '...'"
echo "  3) Reinicia:     systemctl restart aniversario"
echo "  4) DNS: apunta aniversario.felipeorigel.com a la IP de este droplet (registro A)."
