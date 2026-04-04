#!/bin/bash
# ═══════════════════════════════════════════
# PlexusMap — VPS Initial Setup (Ubuntu 22.04/24.04)
# Run as root on a fresh Hostinger VPS
# Usage: ssh root@YOUR_IP 'bash -s' < scripts/vps-setup.sh
# ═══════════════════════════════════════════

set -euo pipefail

echo "═══════════════════════════════════════════"
echo "🖥️  PlexusMap VPS Setup — $(date)"
echo "═══════════════════════════════════════════"

# ── 1. System update ──
echo ""
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# ── 2. Essential packages ──
echo ""
echo "🔧 Installing essentials..."
apt-get install -y \
  curl \
  wget \
  git \
  ufw \
  htop \
  unzip \
  nano \
  fail2ban \
  ca-certificates \
  gnupg \
  lsb-release

# ── 3. Create deploy user ──
echo ""
echo "👤 Creating deploy user..."
if ! id "plexus" &>/dev/null; then
  adduser --disabled-password --gecos "PlexusMap Deploy" plexus
  usermod -aG sudo plexus
  # Allow sudo without password for deploy
  echo "plexus ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/plexus

  # Copy SSH keys from root to plexus user
  mkdir -p /home/plexus/.ssh
  if [ -f /root/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys /home/plexus/.ssh/
  fi
  chown -R plexus:plexus /home/plexus/.ssh
  chmod 700 /home/plexus/.ssh
  chmod 600 /home/plexus/.ssh/authorized_keys 2>/dev/null || true
  echo "  ✓ User 'plexus' created with sudo access"
else
  echo "  ✓ User 'plexus' already exists"
fi

# ── 4. Install Docker ──
echo ""
echo "🐳 Installing Docker..."
if ! command -v docker &>/dev/null; then
  # Add Docker's official GPG key
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  # Add Docker repository
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  # Add plexus user to docker group
  usermod -aG docker plexus

  systemctl enable docker
  systemctl start docker
  echo "  ✓ Docker installed: $(docker --version)"
else
  echo "  ✓ Docker already installed: $(docker --version)"
fi

# ── 5. Firewall (UFW) ──
echo ""
echo "🔥 Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    comment "SSH"
ufw allow 80/tcp    comment "HTTP"
ufw allow 443/tcp   comment "HTTPS"
ufw --force enable
echo "  ✓ Firewall enabled (SSH, HTTP, HTTPS)"

# ── 6. Fail2Ban ──
echo ""
echo "🛡️  Configuring Fail2Ban..."
cat > /etc/fail2ban/jail.local << 'JAIL'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200
JAIL
systemctl enable fail2ban
systemctl restart fail2ban
echo "  ✓ Fail2Ban configured (SSH: 3 attempts, 2h ban)"

# ── 7. SSH Hardening ──
echo ""
echo "🔒 Hardening SSH..."
SSHD_CONFIG="/etc/ssh/sshd_config"
# Disable root login after plexus user is set up
# (uncomment the next line after verifying plexus SSH works)
# sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' $SSHD_CONFIG
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' $SSHD_CONFIG
sed -i 's/^#*MaxAuthTries.*/MaxAuthTries 3/' $SSHD_CONFIG
sed -i 's/^#*ClientAliveInterval.*/ClientAliveInterval 300/' $SSHD_CONFIG
sed -i 's/^#*ClientAliveCountMax.*/ClientAliveCountMax 2/' $SSHD_CONFIG
systemctl restart sshd
echo "  ✓ SSH hardened (password auth disabled, max 3 attempts)"

# ── 8. Swap (2GB — useful for small VPS) ──
echo ""
echo "💾 Configuring swap..."
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Optimize swappiness for a server
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  sysctl vm.swappiness=10
  echo "  ✓ 2GB swap created"
else
  echo "  ✓ Swap already exists"
fi

# ── 9. Create app directory ──
echo ""
echo "📁 Creating app directory..."
mkdir -p /opt/plexusmap
chown plexus:plexus /opt/plexusmap
echo "  ✓ /opt/plexusmap ready"

# ── 10. Install Nginx (host-level reverse proxy) ──
echo ""
echo "🌐 Installing Nginx..."
if ! command -v nginx &>/dev/null; then
  apt-get install -y nginx
  systemctl enable nginx
  echo "  ✓ Nginx installed"
else
  echo "  ✓ Nginx already installed"
fi

# ── 11. Install Certbot ──
echo ""
echo "📜 Installing Certbot..."
if ! command -v certbot &>/dev/null; then
  apt-get install -y certbot python3-certbot-nginx
  echo "  ✓ Certbot installed"
else
  echo "  ✓ Certbot already installed"
fi

# ── 12. Configure Nginx for PlexusMap ──
echo ""
echo "⚙️  Configuring Nginx..."
cat > /etc/nginx/sites-available/plexusmap << 'NGINX'
upstream plexusmap_upstream {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name plexusmap.com www.plexusmap.com;

    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://plexusmap_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_buffering off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location /_next/static/ {
        proxy_pass http://plexusmap_upstream;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ~* ^/(favicon\.ico|manifest\.json|sw\.js|robots\.txt|sitemap\.xml) {
        proxy_pass http://plexusmap_upstream;
        proxy_set_header Host $host;
        expires 1d;
        add_header Cache-Control "public";
        access_log off;
    }

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types text/plain text/css text/javascript application/javascript application/json application/xml image/svg+xml font/woff2;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 10m;
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/plexusmap /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
mkdir -p /var/www/certbot

nginx -t && systemctl restart nginx
echo "  ✓ Nginx configured for plexusmap.com"

# ── Summary ──
echo ""
echo "═══════════════════════════════════════════"
echo "✅ VPS Setup Complete!"
echo "═══════════════════════════════════════════"
echo ""
echo "What was installed:"
echo "  • Docker $(docker --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+')"
echo "  • Docker Compose $(docker compose version 2>/dev/null | grep -oP '\d+\.\d+\.\d+')"
echo "  • Nginx $(nginx -v 2>&1 | grep -oP '\d+\.\d+\.\d+')"
echo "  • Certbot $(certbot --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+')"
echo "  • UFW firewall (ports 22, 80, 443)"
echo "  • Fail2Ban (SSH protection)"
echo "  • 2GB swap"
echo ""
echo "Deploy user: plexus"
echo "App directory: /opt/plexusmap"
echo ""
echo "═══════════════════════════════════════════"
echo "NEXT STEPS:"
echo "═══════════════════════════════════════════"
echo ""
echo "1. Verify SSH access as plexus user:"
echo "   ssh plexus@$(curl -s ifconfig.me)"
echo ""
echo "2. Clone and deploy (as plexus user):"
echo "   cd /opt/plexusmap"
echo "   git clone https://github.com/YOUR_USER/plexusmap.git ."
echo "   cp .env.production.example .env.production"
echo "   nano .env.production  # fill in real values"
echo "   chmod +x scripts/deploy.sh"
echo "   ./scripts/deploy.sh"
echo ""
echo "3. Seed production data:"
echo "   docker compose run --rm -e SEED_MODE=production plexusmap npx tsx prisma/seed.ts"
echo ""
echo "4. Setup SSL (after DNS A record points here):"
echo "   sudo certbot --nginx -d plexusmap.com -d www.plexusmap.com"
echo ""
echo "5. Disable root SSH login (after verifying plexus access):"
echo "   sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config"
echo "   sudo systemctl restart sshd"
echo ""
