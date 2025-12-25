# WD BPI Web Report - AWS EC2 Deployment Guide

## Prerequisites

- AWS EC2 instance (Ubuntu 20.04 or later recommended)
- Domain name pointed to EC2 instance
- SSH access to EC2 instance
- Basic Linux command line knowledge

---

## Installation Steps

### 1. Prepare EC2 Instance

```bash
# Connect to your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt-get update
sudo apt-get upgrade -y
```

### 2. Upload Project Files

**Option A: Using Git (Recommended)**
```bash
cd /var/www
sudo git clone https://your-repo-url.git wdbpi
```

**Option B: Using SCP**
```bash
# From your local machine
scp -i your-key.pem -r C:\xampp\htdocs\wdbpi ubuntu@your-ec2-ip:/home/ubuntu/
```

### 3. Run Deployment Script

```bash
cd /var/www/wdbpi
sudo chmod +x deploy.sh
sudo ./deploy.sh
```

### 4. Configure Application

```bash
# Copy and edit configuration
cd /var/www/wdbpi
sudo cp config.example.php config.php
sudo nano config.php
```

Update the following:
- `DB_USERNAME` - Your MySQL username
- `DB_PASSWORD` - Your MySQL password  
- `DB_NAME` - Database name (default: wdbpi_db)
- `APP_URL` - Your production domain

### 5. Setup Database

```bash
# Login to MySQL
sudo mysql

# Create database and user
CREATE DATABASE wdbpi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'wdbpi_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON wdbpi_db.* TO 'wdbpi_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import schema
mysql -u wdbpi_user -p wdbpi_db < /var/www/wdbpi/database/schema.sql
```

### 6. Configure Nginx

```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/wdbpi
```

Update:
- `server_name` with your actual domain
- SSL certificate paths (after obtaining certificates)

```bash
# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Setup SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is setup automatically
# Test renewal
sudo certbot renew --dry-run
```

### 8. Initial Application Setup

1. Visit `https://yourdomain.com/setup.php`
2. Complete the setup wizard
3. Create admin account

### 9. Post-Installation Security

```bash
# Restrict setup directory access
sudo chmod 700 /var/www/wdbpi/setup

# Or completely remove after setup
# sudo rm -rf /var/www/wdbpi/setup

# Setup log rotation
sudo nano /etc/logrotate.d/wdbpi
```

Add to logrotate config:
```
/var/www/wdbpi/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

---

## Security Checklist

- [ ] SSL certificate installed and working
- [ ] HTTPS redirect enabled
- [ ] Strong database password set
- [ ] `config.php` has chmod 600
- [ ] Setup directory restricted/removed
- [ ] Error display disabled in production
- [ ] Security headers enabled in Nginx
- [ ] Firewall configured (allow 80, 443, 22 only)
- [ ] Regular backups configured

---

## AWS EC2 Security Group

Configure inbound rules:
- **SSH** (22) - Your IP only
- **HTTP** (80) - 0.0.0.0/0
- **HTTPS** (443) - 0.0.0.0/0

---

## Maintenance

### Backup Database
```bash
mysqldump -u wdbpi_user -p wdbpi_db > backup_$(date +%Y%m%d).sql
```

### Update Application
```bash
cd /var/www/wdbpi
sudo git pull origin main
sudo systemctl reload php7.4-fpm
sudo systemctl reload nginx
```

### Monitor Logs
```bash
# Application errors
tail -f /var/www/wdbpi/logs/error.log

# Nginx access
tail -f /var/log/nginx/wdbpi_access.log

# Nginx errors
tail -f /var/log/nginx/wdbpi_error.log
```

---

## Troubleshooting

### 502 Bad Gateway
```bash
# Check PHP-FPM status
sudo systemctl status php7.4-fpm

# Restart if needed
sudo systemctl restart php7.4-fpm
```

### Permission Errors
```bash
# Reset permissions
sudo chown -R www-data:www-data /var/www/wdbpi
sudo chmod -R 755 /var/www/wdbpi
sudo chmod -R 775 /var/www/wdbpi/logs
sudo chmod -R 775 /var/www/wdbpi/report_assets
```

### Database Connection Failed
```bash# Check MySQL status
sudo systemctl status mysql

# Check config.php credentials
sudo cat /var/www/wdbpi/config.php | grep DB_
```

---

## Performance Optimization

### Enable OPcache
```bash
sudo nano /etc/php/7.4/fpm/php.ini
```

Add/update:
```ini
opcache.enable=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=8
opcache.max_accelerated_files=4000
opcache.revalidate_freq=60
```

### Restart PHP-FPM
```bash
sudo systemctl restart php7.4-fpm
```

---

## Support

For issues or questions:
- Check error logs first
- Review Nginx configuration
- Verify file permissions
- Confirm database connection

---

**Last Updated:** 2025-12-05
