#!/bin/bash
set -e

APP_DIR="/var/www/podify"

echo "==> Pulling latest code..."
cd "$APP_DIR"
git pull origin main

echo "==> Installing dependencies..."
bun install --frozen-lockfile

echo "==> Running database migrations..."
bunx prisma migrate deploy

echo "==> Building application..."
bun run build

echo "==> Reloading PM2..."
pm2 reload podify

echo "==> Deploy complete!"
