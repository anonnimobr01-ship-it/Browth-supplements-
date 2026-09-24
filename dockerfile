FROM php:8.2-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libcurl4-openssl-dev \
        libonig-dev \
        libsodium-dev \
        libzip-dev \
    && docker-php-ext-install curl mbstring sodium zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /app

COPY . .

RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --optimize-autoloader

CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-10000} -t public router.php"]