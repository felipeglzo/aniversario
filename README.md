# Aniversario — Cofre de Recuerdos 🥂

App privada de Felipe y Fernanda: sitio con contador de la relación y recuerdos
anuales, más el correo automático de cada 24 de noviembre.

- Relación: 24 nov 2018 · Matrimonio: 14 ago 2021
- Sitio: https://aniversario.felipeorigel.com

## Cómo funciona

- **Sitio** (login privado): hero con contador en vivo y el cofre de recuerdos por año.
- **Recuerdos**: 2 por persona por año. Se crean solo entre el **24 nov y el 31 dic**
  (el correo trae el botón). Cada recuerdo admite **una corrección**, sin límite de
  tiempo. Los precargados de 2023–2025 se llenan editándolos (llenarlos no gasta la
  corrección).
- **Correo del 24 nov, 8:00 am (Vancouver)**: estadísticas dinámicas + un recuerdo
  de cada quien, de un año pasado al azar, **sin repetir** hasta agotar el pool.
- **Correo de prueba cada 10 nov**, solo a Felipe: confirma que el sistema vive.
- **Respaldos**: copia local semanal de la base (rota 12) y copia mensual + la del
  24 nov enviada por correo. Las **fotos** solo se respaldan en el servidor:
  descárgalas de vez en cuando.

## Operación (droplet)

```bash
# Instalar / actualizar (como root)
bash deploy/setup.sh

# Configurar (primera vez)
nano /opt/aniversario/data/config.env     # RESEND_API_KEY, MAIL_TO_FERNANDA...
cd /opt/aniversario
sudo -u aniversario node scripts/set-password.js felipe '...'
sudo -u aniversario node scripts/set-password.js fernanda '...'
systemctl restart aniversario

# Útiles
systemctl status aniversario              # ¿vive el sitio?
systemctl list-timers | grep aniversario  # ¿cuándo corre la tarea diaria?
sudo -u aniversario node scripts/preview-email.js   # ver el correo sin enviarlo
sudo -u aniversario node scripts/backup.js --email  # respaldo manual por correo
journalctl -u aniversario-daily -n 50     # logs de la tarea diaria
```

## Config (`data/config.env`)

```
RESEND_API_KEY=re_xxx
MAIL_FROM=Felipe y Fernanda del pasado <recuerdos@felipeorigel.com>
MAIL_TO_FELIPE=glzo.felipe@gmail.com
MAIL_TO_FERNANDA=...
SITE_URL=https://aniversario.felipeorigel.com
```

## Longevidad (plan a 8+ años)

- Sin servicios de paga: droplet + dominio (ya los tienes) + Resend gratis (~5 correos/año).
- Dependencias mínimas y fijadas; Node 22 LTS; SQLite (un archivo); Caddy renueva HTTPS solo.
- El correo de prueba del 10 nov avisa cada año si algo murió, con 2 semanas de margen.
- Si el droplet muere: nuevo droplet → `bash deploy/setup.sh` → restaurar el último
  `aniversario-*.db` del correo de respaldo en `/opt/aniversario/data/aniversario.db`.
