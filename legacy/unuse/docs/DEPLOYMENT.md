# Deployment Checklist - WD BPI Web Report

## Pre-Deployment (Local)

### Code Review
- [ ] All features tested locally
- [ ] No hardcoded credentials in code
- [ ] Error logging configured
- [ ] Security headers configured
- [ ] Session security enabled

### Files Preparation
- [ ] Created `config.example.php`
- [ ] Exported database schema
- [ ] Removed development files
- [ ] Updated `.gitignore`
- [ ] Documentation complete

### Testing
- [ ] Login/logout works
- [ ] All reports generate correctly
- [ ] File uploads work
- [ ] Database operations successful
- [ ] Cross-browser testing done

---

## Deployment to AWS EC2

### Server Setup
- [ ] EC2 instance launched (Ubuntu 20.04+)
- [ ] Elastic IP assigned
- [ ] Domain DNS pointing to EC2
- [ ] Security Group configured (ports 22, 80, 443)
- [ ] SSH key pair downloaded

### Installation
- [ ] Connected to EC2 via SSH
- [ ] Uploaded project files
- [ ] Ran `deploy.sh` script
- [ ] Nginx installed and configured
- [ ] PHP-FPM installed

### Configuration
- [ ] Copied `config.example.php` to `config.php`
- [ ] Updated database credentials
- [ ] Updated APP_URL with domain
- [ ] Set ENVIRONMENT to 'production'
- [ ] Configured Nginx with domain name

### Database
- [ ] MySQL installed
- [ ] Database created
- [ ] User created with privileges
- [ ] Schema imported successfully
- [ ] Test connection from application

### SSL Certificate
- [ ] Certbot installed
- [ ] SSL certificate obtained
- [ ] HTTPS redirect working
- [ ] Certificate auto-renewal configured

### File Permissions
- [ ] Application directory: 755
- [ ] Logs directory: 775
- [ ] config.php: 600
- [ ] Setup directory: 700 (or removed)
- [ ] www-data owns files

---

## Post-Deployment

### Initial Setup
- [ ] Accessed setup.php
- [ ] Created admin account
- [ ] Imported initial data
- [ ] Tested all features on live site

### Security Hardening
- [ ] Setup directory removed/restricted
- [ ] Changed default passwords
- [ ] Verified error display is OFF
- [ ] Checked security headers
- [ ] Reviewed file permissions

### Monitoring Setup
- [ ] Error logs being written
- [ ] Security logs configured
- [ ] Log rotation configured
- [ ] Backup script created
- [ ] Monitoring alerts setup (optional)

### Performance
- [ ] OPcache enabled
- [ ] Gzip compression working
- [ ] Static files cached
- [ ] Database queries optimized
- [ ] Page load times acceptable (<2s)

### Final Checks
- [ ] All pages load without errors
- [ ] Login works correctly
- [ ] Reports generate successfully
- [ ] File uploads work
- [ ] Mobile responsive
- [ ] SSL certificate valid
- [ ] HTTPS redirect working
- [ ] Security scan passed

---

## Backup Strategy

### Regular Backups
- [ ] Daily database backup configured
- [ ] Weekly full backup configured
- [ ] Backup storage location secured
- [ ] Backup restoration tested

### Backup Script
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/wdbpi"
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u wdbpi_user -p[PASSWORD] wdbpi_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/wdbpi

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

---

## Rollback Plan

### If Issues Occur
1. Stop deployment immediately
2. Restore previous version from backup
3. Restore database from backup
4. Clear cache and sessions
5. Verify system functionality
6. Document issue for review

### Emergency Contacts
- Server Admin: _______________
- Database Admin: _______________
- Application Owner: _______________

---

## Maintenance Schedule

### Daily
- [ ] Check error logs
- [ ] Monitor disk space
- [ ] Verify backups completed

### Weekly
- [ ] Review security logs
- [ ] Check SSL certificate expiry
- [ ] Update system packages

### Monthly
- [ ] Review performance metrics
- [ ] Database optimization
- [ ] Security audit
- [ ] Update documentation

---

## Notes

Date Deployed: _______________
Deployed By: _______________
Server IP: _______________
Domain: _______________

**Issues Encountered:**
- 
- 

**Resolved:**
-
-

---

✅ **Deployment Complete** - Sign off: __________ Date: __________
