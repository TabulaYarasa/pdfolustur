# PDF Oluşturucu - Deployment Kılavuzu

Bu kılavuz, uygulamanızı GitHub Container Registry ve Docker ile server'a nasıl yükleyeceğinizi adım adım anlatır.

## Gereksinimler

Server'ınızda şunların kurulu olması gerekir:
- Docker (v20.10 veya üstü)
- Docker Compose (v2.0 veya üstü)

## Önemli Bilgiler

- **Port:** 3099 (server'da diğer uygulamalar için 3000 kullanılamıyor)
- **Container Registry:** GitHub Container Registry (ghcr.io)
- **Otomatik Build:** Her main/master branch push'unda otomatik build edilir

---

## 📦 ADIM 1: GitHub'a Proje Yükleme

### 1.1 GitHub'da Yeni Repo Oluşturun

GitHub'da yeni bir repository oluşturun (örn: `pdfolustur`)

### 1.2 Local Projeyi GitHub'a Push Edin

```bash
cd /Users/furkan/Developer/3-PROJECTS/pdfolustur

# Git init (eğer yoksa)
git init
git add .
git commit -m "Initial commit with Docker and PWA support"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADI/pdfolustur.git
git push -u origin main
```

**⚠️ Önemli:** `docker-compose.yml` dosyasındaki `GITHUB_USERNAME` yerine kendi kullanıcı adınızı yazın!

```bash
# docker-compose.yml dosyasını düzenleyin
nano docker-compose.yml

# Bu satırı bulun:
# image: ghcr.io/GITHUB_USERNAME/pdfolustur:latest

# Değiştirin (örnek):
# image: ghcr.io/furkan/pdfolustur:latest
```

### 1.3 GitHub Actions İzinlerini Ayarlayın

1. GitHub repo'nuza gidin
2. **Settings** → **Actions** → **General**
3. **Workflow permissions** bölümünde:
   - ✅ "Read and write permissions" seçin
   - ✅ "Allow GitHub Actions to create and approve pull requests" işaretleyin
4. **Save** tıklayın

### 1.4 Otomatik Build Başlasın

Main branch'e push yaptığınızda otomatik olarak:
- Docker image build edilir
- GitHub Container Registry'ye push edilir
- `latest` tag'i ile yayınlanır

Build durumunu kontrol edin:
- GitHub repo → **Actions** sekmesi → Son workflow'u izleyin

---

## 🚀 ADIM 2: Server'a Deployment

### 2.1 Server'a Bağlanın

```bash
ssh kullanici@sunucu-ip-adresi
```

### 2.2 Dizin Oluşturun

```bash
mkdir -p ~/pdfolustur
cd ~/pdfolustur
```

### 2.3 docker-compose.yml Dosyasını Oluşturun

```bash
nano docker-compose.yml
```

Aşağıdaki içeriği yapıştırın (KULLANICI_ADI yerine kendi GitHub kullanıcı adınızı yazın):

```yaml
version: '3.8'

services:
  pdf-app:
    image: ghcr.io/KULLANICI_ADI/pdfolustur:latest
    container_name: pdf-olusturucu
    restart: unless-stopped
    ports:
      - "3099:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

`Ctrl + X`, ardından `Y` ve `Enter` ile kaydedin.

### 2.4 GitHub Container Registry'e Login (İlk Kez)

Eğer image **private** ise (public ise bu adım gerekli değil):

```bash
# GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
# "Generate new token (classic)" tıklayın
# Scope: read:packages seçin

# Login olun
echo YOUR_PAT_TOKEN | docker login ghcr.io -u GITHUB_USERNAME --password-stdin
```

### 2.5 Image'ı Çekin ve Başlatın

```bash
# En son image'ı çek
docker-compose pull

# Container'ı başlat
docker-compose up -d
```

### 2.6 Kontrol Edin

```bash
# Container durumunu kontrol edin
docker-compose ps

# Logları izleyin
docker-compose logs -f

# Çıkmak için Ctrl+C
```

### 2.7 Erişim Testi

Tarayıcınızdan:
```
http://sunucu-ip:3099
```

---

## 🌐 ADIM 3: Nginx Yapılandırması (Önerilen)

Server'ınızda zaten Nginx varsa, yeni bir site ekleyin:

### 3.1 Nginx Site Dosyası Oluşturun

```bash
sudo nano /etc/nginx/sites-available/pdf-app
```

İçeriği:

```nginx
server {
    listen 80;
    server_name pdf.yourdomain.com;  # Domain adınızı yazın

    location / {
        proxy_pass http://localhost:3099;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # PWA için cache headers
        location ~* \\.(?:manifest|sw\\.js)$ {
            expires 0;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
}
```

### 3.2 Site'ı Aktifleştirin

```bash
sudo ln -s /etc/nginx/sites-available/pdf-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3.3 SSL/HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d pdf.yourdomain.com
```

Artık şu adresten erişebilirsiniz:
```
https://pdf.yourdomain.com
```

---

## 🔄 Güncelleme (Yeni Kod Push Ettiğinizde)

### Otomatik Güncelleme Akışı:

1. **Local'de kod değiştirin** ve GitHub'a push edin:
```bash
git add .
git commit -m "Update: feature xyz"
git push
```

2. **GitHub Actions** otomatik olarak yeni image'ı build eder

3. **Server'da** yeni image'ı çekin:
```bash
cd ~/pdfolustur
docker-compose pull      # Yeni image'ı çek
docker-compose up -d     # Container'ı yeniden başlat
```

---

## 🛠️ Yönetim Komutları

```bash
# Container'ı durdurmak
docker-compose down

# Yeniden başlatmak
docker-compose restart

# Logları izlemek
docker-compose logs -f

# Tek komutla güncelleme
docker-compose pull && docker-compose up -d

# Container içine girmek
docker exec -it pdf-olusturucu sh

# Image silmek (disk temizliği)
docker system prune -a
```

---

## 📊 Monitoring ve Health Check

Container otomatik health check yapıyor. Durumu kontrol edin:

```bash
docker inspect pdf-olusturucu | grep -A 10 Health
```

---

## 🔒 Güvenlik Önerileri

### 1. Firewall Ayarları

```bash
sudo ufw allow 22     # SSH
sudo ufw allow 80     # HTTP
sudo ufw allow 443    # HTTPS
sudo ufw enable
```

Port 3099'u **dışarıya kapatın** (Nginx üzerinden erişilsin):

```bash
sudo ufw deny 3099
```

### 2. Image'ı Public Yapmak (Opsiyonel)

GitHub repo → **Settings** → **Packages** → package'ı seçin → **Package settings** → **Change visibility** → **Public**

Bu sayede PAT token'a gerek kalmaz.

---

## ❗ Sorun Giderme

### Container başlamıyor

```bash
# Detaylı logları kontrol edin
docker-compose logs

# Port çakışması varsa
sudo lsof -i :3099

# Container'ı tamamen sil ve yeniden başlat
docker-compose down
docker-compose up -d --force-recreate
```

### Image çekilemiyor

```bash
# GitHub'a login olun
echo YOUR_PAT | docker login ghcr.io -u USERNAME --password-stdin

# Yeniden deneyin
docker-compose pull
```

### Nginx 502 Bad Gateway

```bash
# Container çalışıyor mu?
docker-compose ps

# Nginx loglarını kontrol edin
sudo tail -f /var/log/nginx/error.log
```

---

## 📈 Performans İpuçları

1. **Resource Limits** (docker-compose.yml'e ekleyin):
```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
```

2. **Auto-restart** zaten aktif (`restart: unless-stopped`)

3. **Health check** otomatik çalışıyor

---

## 🎯 Özet: Hızlı Başlangıç

```bash
# 1. Local'de GitHub'a push
git push

# 2. Server'da dosya oluştur
cd ~/pdfolustur
nano docker-compose.yml  # İçeriği yapıştır

# 3. Çalıştır
docker-compose pull && docker-compose up -d

# 4. Kontrol et
docker-compose logs -f
```

**Erişim:** http://sunucu-ip:3099

---

## 📞 Destek

- GitHub Actions başarısız olursa: **Actions** sekmesinden hatayı kontrol edin
- Container sorunları: `docker-compose logs -f`
- Nginx sorunları: `sudo nginx -t` ve `/var/log/nginx/error.log`

**Başarılar!** 🎉
