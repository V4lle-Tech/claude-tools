#!/bin/bash
# Debug version of installer to see what's happening

set -ex  # Exit on error and print commands

REPO="V4lle-Tech/claude-tools"
VERSION="v1.0.2"
PLUGIN="statusline"

echo "=== Starting debug installation ==="
echo "Version: $VERSION"
echo "Plugin: $PLUGIN"

# Create temp directory
TMP_DIR=$(mktemp -d)
echo "Temp dir: $TMP_DIR"

cd "$TMP_DIR"

# Download
echo "=== Downloading ==="
DOWNLOAD_URL="https://github.com/$REPO/archive/refs/tags/${VERSION}.tar.gz"
echo "URL: $DOWNLOAD_URL"
curl -fsSL "$DOWNLOAD_URL" -o claude-tools.tar.gz

# Extract
echo "=== Extracting ==="
tar -xzf claude-tools.tar.gz
ls -la

# Find extracted directory
EXTRACTED_DIR=$(find . -maxdepth 1 -type d -name "claude-tools-*" | head -n 1)
echo "Extracted dir: $EXTRACTED_DIR"
ls -la "$EXTRACTED_DIR"

cd "$EXTRACTED_DIR"

# Check structure
echo "=== Checking structure ==="
ls -la packages/
ls -la packages/statusline/

# Check if bun is installed
echo "=== Checking for bun ==="
if ! command -v bun >/dev/null 2>&1; then
    echo "Bun not in PATH, checking ~/.bun/bin..."
    if [ -f "$HOME/.bun/bin/bun" ]; then
        echo "Found bun at ~/.bun/bin/bun, adding to PATH"
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
    else
        echo "Bun not found. Installing Bun..."
        curl -fsSL https://bun.sh/install | bash
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
    fi
fi

echo "Using bun: $(which bun)"
bun --version

# Install dependencies
echo "=== Installing dependencies ==="
bun install

# Build
echo "=== Building statusline ==="
cd packages/statusline
pwd
ls -la

bun run build

# Check result
echo "=== Checking build result ==="
ls -la
ls -la claude-statusline 2>/dev/null || echo "claude-statusline not found"

# Cleanup
echo "=== Cleanup ==="
cd /
rm -rf "$TMP_DIR"

echo "=== Done ==="
