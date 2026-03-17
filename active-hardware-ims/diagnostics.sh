#!/bin/bash
# Standalone System Diagnostics Collector (AWS Lightsail / Linux)

TIMESTAMP=$(date +%s)
OUT_DIR="/tmp/diag_$TIMESTAMP"
BUNDLE="/tmp/diagnostics_$TIMESTAMP.tar.gz"

echo "===================================================="
echo "    System Performance Diagnostics Collector        "
echo "===================================================="

# Create staging directory inside /tmp
mkdir -p "$OUT_DIR"

# --- 0. Dependency Check & Installation Hints ---
echo "Checking Toolkit..."
check_dep() {
    local cmd=$1
    local pkg=$2
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "⚠️  Missing: '$cmd' utility."
        echo "   -> Install with: sudo apt install $pkg -y"
        echo ""
    fi
}

# Warn about missing diagnostics tools for Debian/Ubuntu
check_dep "netstat" "net-tools"
check_dep "mdadm" "mdadm"
check_dep "python3" "python3"

echo "[1/3] Collecting system metrics..."

run_cmd() {
    local cmd=$1
    local file=$2
    eval "$cmd" > "$OUT_DIR/$file" 2>&1 || echo "Error running $cmd" > "$OUT_DIR/$file"
}

run_cmd "ip a" "network_ip.txt"
run_cmd "netstat -tulnp" "network_ports.txt"
run_cmd "df -h" "disk_space.txt"
run_cmd "lsblk" "disk_layout.txt"
run_cmd "free -m" "memory.txt"
run_cmd "top -b -n 1" "cpu_usage.txt"
run_cmd "ps aux --sort=-%cpu | head -n 20" "top_processes.txt"
run_cmd "mdadm --detail --scan" "raid_status.txt"
run_cmd "dmesg | tail -n 500" "dmesg.txt"
run_cmd "ls -lah /var/log" "log_file_sizes.txt"

# PM2 status if exists
if command -v pm2 >/dev/null 2>&1; then
    run_cmd "pm2 list" "pm2_status.txt"
fi

echo "[2/3] Tailing system logs (last 500 lines)..."

tail_log() {
    local path=$1
    local name=$2
    if [ -f "$path" ]; then
        tail -n 500 "$path" > "$OUT_DIR/$name" 2>/dev/null
    else
        echo "File not found: $path" > "$OUT_DIR/$name"
    fi
}

tail_log "/var/log/syslog" "syslog.txt"
tail_log "/var/log/messages" "messages.txt"
tail_log "/var/log/auth.log" "auth.txt"
tail_log "/var/log/fail2ban.log" "fail2ban.txt"
tail_log "/var/log/dpkg.log" "dpkg_installed_packages.txt"
tail_log "/var/log/nginx/error.log" "nginx_error.txt"
tail_log "/var/log/nginx/access.log" "nginx_access.txt"

# PM2 Application Logs
if [ -d "$HOME/.pm2/logs" ]; then
    echo "[*] Collecting PM2 application logs..."
    mkdir -p "$OUT_DIR/pm2_logs"
    for f in "$HOME/.pm2/logs"/*.log; do
        [ -f "$f" ] && tail -n 500 "$f" > "$OUT_DIR/pm2_logs/$(basename "$f")" 2>/dev/null
    done
fi

# Journalctl
if command -v journalctl >/dev/null 2>&1; then
    journalctl -n 500 > "$OUT_DIR/systemd_journal.txt" 2>&1
fi

# 3. Copy Application config if inside application folder
if [ -f "package.json" ]; then
    echo "[*] Found package.json, bundling config files..."
    cp package.json "$OUT_DIR/" 2>/dev/null
    [ -f "next.config.js" ] && cp next.config.js "$OUT_DIR/" 2>/dev/null
    [ -f "next.config.ts" ] && cp next.config.ts "$OUT_DIR/" 2>/dev/null
    [ -f "prisma/schema.prisma" ] && cp prisma/schema.prisma "$OUT_DIR/" 2>/dev/null
fi

echo "[3/3] Compressing diagnostic bundle..."

# 4. Create Tarball
tar -czf "$BUNDLE" -C /tmp "diag_$TIMESTAMP" >/dev/null 2>&1

# Cleanup
rm -rf "$OUT_DIR"

echo ""
echo "===================================================="
echo "✅ Diagnostic bundle created successfully!"
echo "File Location (TMP Folder): $BUNDLE"
echo "===================================================="
