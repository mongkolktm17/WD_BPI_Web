FROM php:8.3-apache AS base
WORKDIR /var/www/html

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libzip-dev \
    libicu-dev \
    libonig-dev \
    libxml2-dev \
    unzip \
    curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_mysql \
        mysqli \
        gd \
        zip \
        intl \
        mbstring \
        opcache \
        bcmath \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN a2enmod rewrite headers expires deflate \
    && sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

RUN echo "upload_max_filesize = 10M\npost_max_size = 12M\nmemory_limit = 256M\nmax_execution_time = 60\nmax_input_time = 60" \
    > /usr/local/etc/php/conf.d/custom.ini

FROM base AS development
ENV APACHE_DOCUMENT_ROOT=/var/www/html
RUN sed -i 's|/var/www/html|${APACHE_DOCUMENT_ROOT}|g' /etc/apache2/sites-available/*.conf
EXPOSE 80

FROM base AS production
COPY legacy/ /var/www/html/
COPY docker/php/config.docker.php /var/www/html/config.php
COPY docker/php/apache-legacy.conf /etc/apache2/sites-available/000-default.conf
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && mkdir -p /var/www/html/logs \
    && chown -R www-data:www-data /var/www/html/logs
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1
