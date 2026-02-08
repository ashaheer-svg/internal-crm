#!/bin/bash

# AWS Lightsail Complete Deployment Script
# Run this on your server to set up everything

set -e  # Exit on error

echo "=== Starting Deployment Setup ==="
echo ""

# 1. Install sqlite3
echo "Step 1: Installing sqlite3..."
sudo apt update
sudo apt install -y sqlite3
echo "✓ sqlite3 installed"
echo ""

# 2. Navigate to app directory
echo "Step 2: Navigating to app directory..."
cd ~/internal-crm
echo "✓ In directory: $(pwd)"
echo ""

# 3. Stash local changes and pull latest code
echo "Step 3: Pulling latest code from GitHub..."
git stash
git pull https://github.com/ashaheer-svg/internal-crm.git
echo "✓ Code updated"
echo ""

# 4. Navigate to active-hardware-ims
cd active-hardware-ims
echo "✓ In directory: $(pwd)"
echo ""

# 5. Install npm dependencies
echo "Step 4: Installing npm dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# 6. Run database migrations
echo "Step 5: Running database migrations..."
npx prisma migrate deploy
echo "✓ Migrations complete"
echo ""

# 7. Seed database
echo "Step 6: Seeding database with admin user..."
npx prisma db seed
echo "✓ Database seeded"
echo ""

# 8. Build the application
echo "Step 7: Building application..."
npm run build
echo "✓ Build complete"
echo ""

# 9. Start with PM2
echo "Step 8: Starting application with PM2..."
pm2 start npm --name "active-hardware-ims" -- start
pm2 save
pm2 startup
echo "✓ Application started"
echo ""

# 10. Show status
echo "=== Deployment Complete ==="
echo ""
echo "Application Status:"
pm2 list
echo ""
echo "Admin User:"
sqlite3 prisma/prod.db "SELECT email, role, isActive FROM User WHERE email = 'admin@activehardware.com';"
echo ""
echo "Login at: http://13.229.242.157:3000"
echo "Email: admin@activehardware.com"
echo "Password: Admin@123"
echo ""

