#!/bin/bash

# WD BPI Deployment Script for AWS EC2 (Nginx)
# Run this script on your EC2 instance after uploading files

set -e  # Exit on error

echo "======================================"
echo "WD BPI Production Deployment"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Variables
APP_DIR="/var/www/wdbpi"
NGINX_CONF="/etc/nginx/sites-available/wdbpi"
PHP_VERSION="7.4"  # Adjust as needed

echo -e "${YELLOW}Step 1: Installing required packages...${NC}"
apt-get update
apt-get install -y nginx php${PHP_VERSION}-fpm php${PHP_VERSION}-mysql php${PHP_VERSION}-mbstring php${PHP_VERSION}-xml php${PHP_VERSION}-curl mysql-server

echo -e "${GREEN}✓ Packages installed${NC}"
echo ""

echo -e "${YELLOW}Step 2: Creating application directory...${NC}"
mkdir -p ${APP_DIR}
mkdir -p ${APP_DIR}/logs
mkdir -p ${APP_DIR}/setup

echo -e "${GREEN}✓ Directories created${NC}"
echo ""

echo -e "${YELLOW}Step 3: Setting file permissions...${NC}"
chown -R www-data:www-data ${APP_DIR}
chmod -R 755 ${APP_DIR}
chmod -R 775 ${APP_DIR}/logs
chmod -R 775 ${APP_DIR}/report_assets

# Secure sensitive files
chmod 600 ${APP_DIR}/config.php
chmod 700 ${APP_DIR}/setup

echo -e "${GREEN}✓ Permissions set${NC}"
echo ""

echo -e "${YELLOW}Step 4: Configuring Nginx...${NC}"
if [ ! -f ${NGINX_CONF} ]; then
    cp ${APP_DIR}/nginx.conf ${NGINX_CONF}
    ln -s ${NGINX_CONF} /etc/nginx/sites-enabled/
    echo -e "${GREEN}✓ Nginx configuration created${NC}"
else
    echo -e "${YELLOW}⚠ Nginx configuration already exists${NC}"
fi
echo ""

echo -e "${YELLOW}Step 5: Testing Nginx configuration...${NC}"
nginx -t
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}✗ Nginx configuration has errors${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 6: Restarting services...${NC}"
systemctl restart nginx
systemctl restart php${PHP_VERSION}-fpm
systemctl enable nginx
systemctl enable php${PHP_VERSION}-fpm

echo -e "${GREEN}✓ Services restarted${NC}"
echo ""

echo -e "${YELLOW}Step 7: Database setup...${NC}"
echo "Please run the following SQL scripts manually:"
echo "1. mysql -u root -p < ${APP_DIR}/database/schema.sql"
echo "2. Update ${APP_DIR}/config.php with database credentials"
echo ""

echo -e "${YELLOW}Step 8: SSL Certificate (Let's Encrypt)...${NC}"
echo "To enable HTTPS, run:"
echo "  sudo apt-get install certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d your-domain.com"
echo ""

echo -e "${GREEN}======================================"
echo "Deployment Complete!"
echo "======================================${NC}"
echo ""
echo "Next steps:"
echo "1. Update ${APP_DIR}/config.php with your settings"
echo "2. Run database setup scripts"
echo "3. Setup SSL certificate"
echo "4. Access http://your-domain.com/setup.php"
echo "5. After setup, restrict access to /setup directory"
echo ""
echo -e "${YELLOW}Important: Update nginx.conf with your domain name!${NC}"
