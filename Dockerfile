# 安定版のDebianをベースにしたPHPとApacheの最新イメージを使用
FROM php:8.1-apache-buster

# リポジトリのキーを更新
RUN apt-get update --allow-releaseinfo-change \
    && apt-get install -y --no-install-recommends software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# gnupgとその他の必要なパッケージをインストール
RUN apt-get update \
    && apt-get install -y gnupg2 \
    && rm -rf /var/lib/apt/lists/*

# Node.jsのバージョン20.xをインストール
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add - \
    && curl -sL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get update \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# その他の必要なパッケージのインストール
RUN apt-get update \
    && apt-get install -y wget redis ffmpeg zlib1g-dev libpng-dev libxml2-dev libzip-dev git gnupg2 \
    && docker-php-ext-install pdo_mysql gd xml zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 一般的な依存関係のインストール
RUN apt-get update \
    && apt-get install -y libcurl4-openssl-dev pkg-config libssl-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Composerのインストール
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# アプリケーションのコピーとセットアップ
COPY . /var/www/html
WORKDIR /var/www/html
RUN composer install \
    && cd frontend && npm install && npx webpack --config webpack.config.js