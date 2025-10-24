#!/bin/bash

# LetsPrint Deployment Script
set -e

echo "🚀 Starting deployment of LetsPrint..."

# Configuration
DEPLOY_DIR="/var/www/letsprint"
APP_NAME="letsprint"
BACKUP_DIR="/var/www/letsprint-backup-$(date +%Y%m%d-%H%M%S)"

# Create backup of existing installation
if [ -d "$DEPLOY_DIR" ]; then
    echo "📦 Creating backup..."
    cp -r "$DEPLOY_DIR" "$BACKUP_DIR"
    echo "✅ Backup created at $BACKUP_DIR"
fi

# Create deploy directory if it doesn't exist
echo "📁 Preparing deployment directory..."
mkdir -p "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/logs"

# Copy files
echo "📋 Copying application files..."
rsync -av --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dev.sqlite' \
    --exclude 'logs' \
    ./ "$DEPLOY_DIR/"

# Navigate to deploy directory
cd "$DEPLOY_DIR"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Run database migrations
echo "🗄️  Running database migrations..."
npm run setup

# Build the application (if not already built)
if [ ! -d "build" ]; then
    echo "🔨 Building application..."
    npm run build
fi

# Restart PM2 process
echo "🔄 Restarting PM2 process..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    pm2 restart "$APP_NAME"
else
    pm2 start ecosystem.config.cjs
fi

# Save PM2 configuration
pm2 save

echo "✅ Deployment complete!"
echo "🌐 App URL: https://letsprint.indigenservices.com"
echo "📊 Check logs with: pm2 logs $APP_NAME"
echo "📈 Check status with: pm2 status"
