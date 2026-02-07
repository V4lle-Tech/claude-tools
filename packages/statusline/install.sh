#!/bin/bash
set -e

# Claude Code Statusline - Portable Installation Script
# This script can be run from anywhere and will install the statusline

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🚀 Installing Claude Code Statusline from: $SCRIPT_DIR"
echo ""

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

# Install dependencies if needed
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd "$SCRIPT_DIR"
    bun install
fi

# Build the binary
echo "🔨 Building statusline binary..."
cd "$SCRIPT_DIR"
bun build src/index.ts --compile --outfile=claude-statusline

# Get the absolute path to the binary
BINARY_PATH="$SCRIPT_DIR/claude-statusline"
echo "📍 Binary location: $BINARY_PATH"
echo ""

# Create config directory
CONFIG_DIR="$HOME/.config/claude-statusline"
mkdir -p "$CONFIG_DIR"
echo "✅ Created config directory: $CONFIG_DIR"
echo ""

# Update Claude Code settings
SETTINGS_FILE="$HOME/.claude/settings.json"
SETTINGS_DIR="$(dirname "$SETTINGS_FILE")"

# Create .claude directory if it doesn't exist
mkdir -p "$SETTINGS_DIR"

# Read existing settings or create new
if [ -f "$SETTINGS_FILE" ]; then
    echo "📖 Updating existing Claude Code settings..."
    SETTINGS=$(cat "$SETTINGS_FILE")
else
    echo "📝 Creating new Claude Code settings..."
    SETTINGS='{}'
fi

# Update settings with jq or node
if command -v jq &> /dev/null; then
    echo "$SETTINGS" | jq --arg path "$BINARY_PATH" '.statusLine = {type: "command", command: $path, padding: 2}' > "$SETTINGS_FILE"
else
    # Fallback to simple JSON manipulation
    node -e "
    const fs = require('fs');
    let settings = $SETTINGS;
    settings.statusLine = {
      type: 'command',
      command: '$BINARY_PATH',
      padding: 2
    };
    fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(settings, null, 2));
    "
fi

echo "✅ Updated: $SETTINGS_FILE"
echo ""

echo "🎉 Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Restart Claude Code or start a new session"
echo "  2. Your statusline will appear at the bottom"
echo "  3. Customize widgets in $CONFIG_DIR/config.json"
echo ""
echo "Test the statusline:"
echo "  cd $SCRIPT_DIR"
echo "  bun run scripts/test-manual.ts full"
echo ""
