# SSL Certificate Setup Guide for Viyanta Web Application

## 🌐 Current Status
- **Server IP**: 98.130.11.14
- **Current Issue**: "Not secure" HTTPS connection
- **Goal**: Valid SSL certificate for secure connections

## 🔐 Option 1: Let's Encrypt (Free) - RECOMMENDED

### Prerequisites
- Domain name pointing to your server (optional but recommended)
- Server access via SSH
- Nginx or Apache web server

### Step-by-Step Setup

#### 1. SSH into your server
```bash
ssh ubuntu@98.130.11.14
```

#### 2. Install Certbot (Let's Encrypt client)
```bash
# Update package list
sudo apt update

# Install Certbot
sudo apt install certbot python3-certbot-nginx -y
```

#### 3. Get SSL Certificate

**Option A: With Domain Name (Recommended)**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Option B: IP Address Only (Limited)**
```bash
# For IP-only setup, you'll need to manually configure
sudo certbot certonly --standalone
```

#### 4. Auto-renewal Setup
```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Add to crontab for automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## 🌍 Option 2: Self-Signed Certificate (Development/Testing)

### Generate Self-Signed Certificate
```bash
# Create SSL directory
sudo mkdir -p /etc/ssl/private
sudo mkdir -p /etc/ssl/certs

# Generate private key
sudo openssl genrsa -out /etc/ssl/private/viyanta.key 2048

# Generate certificate
sudo openssl req -new -x509 -key /etc/ssl/private/viyanta.key -out /etc/ssl/certs/viyanta.crt -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=98.130.11.14"
```

### Configure Nginx
```nginx
server {
    listen 443 ssl;
    server_name 98.130.11.14;
    
    ssl_certificate /etc/ssl/certs/viyanta.crt;
    ssl_certificate_key /etc/ssl/private/viyanta.key;
    
    # Your existing configuration here
    location / {
        proxy_pass http://localhost:3000;  # Frontend
    }
    
    location /api {
        proxy_pass http://localhost:8000;  # Backend
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name 98.130.11.14;
    return 301 https://$server_name$request_uri;
}
```

## 🚀 Option 3: Cloudflare (Free SSL + CDN)

### Setup Steps
1. **Create Cloudflare Account**: Sign up at cloudflare.com
2. **Add Your Domain**: Add your domain or IP
3. **Update DNS**: Point to your server IP (98.130.11.14)
4. **Enable SSL**: Set SSL/TLS encryption mode to "Full" or "Full (strict)"
5. **Configure Rules**: Set up page rules for your application

## 📋 Quick Commands for Let's Encrypt

```bash
# Install Certbot
sudo apt update && sudo apt install certbot python3-certbot-nginx -y

# Get certificate (replace 'yourdomain.com' with actual domain)
sudo certbot --nginx -d yourdomain.com

# Test renewal
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates
```

## ⚠️ Important Notes

1. **Domain Name**: Let's Encrypt works best with a domain name
2. **Firewall**: Ensure ports 80 and 443 are open
3. **Web Server**: Make sure Nginx/Apache is properly configured
4. **Auto-renewal**: Certificates expire every 90 days
5. **Rate Limits**: Let's Encrypt has rate limits for free certificates

## 🔧 Troubleshooting

### Common Issues
- **Port 80 blocked**: Open port 80 for domain validation
- **Web server not running**: Start Nginx/Apache before getting certificate
- **Permission denied**: Use sudo for all commands
- **Certificate not trusted**: Self-signed certificates show warnings in browsers

### Check Certificate Status
```bash
# Check if certificate is valid
sudo openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout

# Check Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 📞 Need Help?

If you encounter issues:
1. Check server logs: `sudo journalctl -u nginx`
2. Verify firewall settings: `sudo ufw status`
3. Test SSL connection: `openssl s_client -connect 98.130.11.14:443` 