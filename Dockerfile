# PHP 8.1 on a maintained Debian distribution
FROM php:8.1-apache

# gnupgとその他の必要なパッケージをインストール
RUN apt-get update \
    && apt-get install -y --no-install-recommends gnupg2 ca-certificates curl\
    && rm -rf /var/lib/apt/lists/*

# Node.jsのバージョン20.xをインストール
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && NODE_MAJOR=20 \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# その他の必要なパッケージのインストール
RUN apt-get update \
    && apt-get install -y --no-install-recommends wget redis ffmpeg zlib1g-dev libpng-dev libxml2-dev libzip-dev git vim \
    && docker-php-ext-install pdo_mysql gd xml zip\
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 一般的な依存関係のインストール
RUN apt-get update \
    && apt-get install -y --no-install-recommends libcurl4-openssl-dev pkg-config libssl-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Composerのインストール
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# アプリケーションのコピーとセットアップ
COPY . /var/www/html
WORKDIR /var/www/html
RUN composer install \
    && cd frontend && npm install && npx webpack --config webpack.config.js