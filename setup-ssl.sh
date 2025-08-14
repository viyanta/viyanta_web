#!/bin/bash

echo "🔐 SSL Certificate Setup Script for Viyanta Web Application"
echo "=========================================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

echo "🌐 Server IP: 98.130.11.14"
echo "📋 Current SSL Status: Not secure (HTTPS warning)"
echo ""

# Update package list
echo "📦 Updating package list..."
apt update

# Install Certbot
echo "🔧 Installing Certbot (Let's Encrypt client)..."
apt install certbot python3-certbot-nginx -y

echo ""
echo "✅ Certbot installed successfully!"
echo ""

# Check if Nginx is running
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "⚠️  Nginx is not running. Starting it..."
    systemctl start nginx
    systemctl enable nginx
fi

echo ""
echo "🚀 Next Steps:"
echo "=============="
echo ""
echo "1. 📝 **Option A: With Domain Name (Recommended)**"
echo "   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo ""
echo "2. 🌍 **Option B: IP Address Only**"
echo "   sudo certbot certonly --standalone"
echo ""
echo "3. 🔄 **Setup Auto-renewal**"
echo "   echo '0 12 * * * /usr/bin/certbot renew --quiet' | sudo crontab -"
echo ""
echo "4. 🧪 **Test Renewal**"
echo "   sudo certbot renew --dry-run"
echo ""
echo "5. 📊 **Check Status**"
echo "   sudo certbot certificates"
echo ""
echo "⚠️  **Important Notes:**"
echo "   - Let's Encrypt works best with a domain name"
echo "   - Certificates expire every 90 days"
echo "   - Ensure ports 80 and 443 are open in firewall"
echo ""
echo "🔧 **Need to configure Nginx manually?**"
echo "   Check the ssl-setup-guide.md file for detailed Nginx configuration"
echo ""
echo "📞 **Troubleshooting:**"
echo "   - Check Nginx logs: sudo journalctl -u nginx"
echo "   - Test SSL: openssl s_client -connect 98.130.11.14:443"
echo "   - Verify firewall: sudo ufw status" 