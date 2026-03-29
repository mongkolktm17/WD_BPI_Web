# WD Security Dashboard - AWS EC2 Deployment Guide

A web-based dashboard for real-time monitoring of NVR status, security personnel, parking occupancy, and metal detector health. Integrated with modern visual reporting.

---

## 🚀 Deployment on AWS EC2 (Ubuntu 22.04/24.04 LTS)

This guide provides a step-by-step process for setting up the WD BPI Web application on an AWS EC2 instance.

### 1. Instance Preparation
- **Instance Type**: Recommended `t3.small` or higher (depending on user load).
- **OS**: Ubuntu Server 22.04 LTS or 24.04 LTS.
- **Security Group Settings**:
  - `Inbound`: Allow HTTP (Port 80), HTTPS (Port 443), and SSH (Port 22).
  - Optional: Allow MySQL (Port 3306) only for specific IP ranges if remote access is required.

### 2. Update and Install Dependencies
Connect to your instance via SSH and run:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install apache2 php libapache2-mod-php php-mysql php-curl php-gd php-mbstring php-xml php-zip mariadb-server git -y
```

### 3. Application Deployment
Clone the repository into the `/var/www/html` directory:
```bash
cd /var/www/html
sudo git clone https://github.com/PCS-IOT/WD_BPI_Web.git .
```

Set appropriate directory permissions:
```bash
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

### 4. Database Setup
Secure the MariaDB installation and create the database:
```bash
sudo mysql_secure_installation
# Follow the prompts to set the root password.

sudo mysql -u root -p
```
Inside the MySQL shell:
```sql
CREATE DATABASE wd_security_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'wd_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON wd_security_db.* TO 'wd_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```
Import the schema:
```bash
# Assuming schema.sql is provided or exported from XAMPP
mysql -u wd_user -p wd_security_db < schema.sql
```

### 5. Configuration
Copy the example config and edit it with your database credentials:
```bash
cp config.example.php config.php
nano config.php
```
Update the `DB_SERVER`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME` values.

### 6. Apache Configuration (Optional but Recommended)
Enable `mod_rewrite` if you use `.htaccess` for clean URLs:
```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
```
Ensure `AllowOverride All` is set in your `/etc/apache2/sites-available/000-default.conf` for the `/var/www/html` directory.

---

## 📊 Latest Features
- **Visual Statistics Dashboard**: Interactive charts using Chart.js for security trends and metal detector health.
- **NVR Tracking**: 62-day retention monitoring with building-wise progress bars.
- **Responsive UI**: Optimized for both desktop and mobile views with modern aesthetic.

## 🤝 Contributing
Contributions are welcome! Please submit a Pull Request to the `main` branch.

## 📄 License
This project is licensed under the MIT License.
