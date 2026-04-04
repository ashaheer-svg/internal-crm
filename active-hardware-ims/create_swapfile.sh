#!/bin/bash

# Configuration
SWAP_SIZE="2G"
SWAP_PATH="/swapfile"

# Exit on error
set -e

echo "=== AWS Lightsail Node.js Memory Swap Setup ==="
echo "Timestamp: $(date)"
echo ""

# 1. Check if swap exists
echo "Step 1: Checking for existing swap space..."
if sudo swapon --show | grep -q 'file'; then
    echo "⚠ Swap space already exists!"
    sudo swapon --show
    echo "Script aborting neatly. No changes made."
    exit 0
fi
echo "✓ No existing swap found. Proceeding."
echo ""

# 2. Allocate the file
echo "Step 2: Allocating ${SWAP_SIZE} for ${SWAP_PATH}..."
# Using dd as a safe fallback if fallocate is restricted by the file system
sudo fallocate -l ${SWAP_SIZE} ${SWAP_PATH} || sudo dd if=/dev/zero of=${SWAP_PATH} bs=1M count=2048
echo "✓ Disk space allocated."
echo ""

# 3. Secure file permissions
echo "Step 3: Setting secure permissions (600)..."
sudo chmod 600 ${SWAP_PATH}
echo "✓ Permissions secured."
echo ""

# 4. Format and enable Swap
echo "Step 4: Formatting and enabling swap space..."
sudo mkswap ${SWAP_PATH}
sudo swapon ${SWAP_PATH}
echo "✓ Swap space is now active!"
echo ""

# 5. Make it permanent so it survives reboots
echo "Step 5: Writing to /etc/fstab to make it permanent..."
if grep -q "${SWAP_PATH}" /etc/fstab; then
    echo "⚠ Swap is already in /etc/fstab."
else
    echo "${SWAP_PATH} none swap sw 0 0" | sudo tee -a /etc/fstab
    echo "✓ Added to /etc/fstab securely."
fi
echo ""

# 6. Verification
echo "=== Setup Complete ==="
echo "Current Memory & Swap Status:"
free -h
echo ""
echo "You can now safely run Next.js builds on this server without crushing the RAM!"
echo ""
