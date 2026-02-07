#!/bin/bash
set -e

# Claude Tools Installer
# Installs Claude Code plugins without cloning the repository
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/V4lle-Tech/claude-tools/main/install.sh | bash
#   or
#   curl -fsSL https://raw.githubusercontent.com/V4lle-Tech/claude-tools/main/install.sh | bash -s -- statusline

# Configuration
REPO="V4lle-Tech/claude-tools"
DEFAULT_PLUGIN="statusline"
VERSION="${VERSION:-latest}" # Can be overridden with VERSION=v1.0.0 ./install.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions (write to stderr to not interfere with return values)
log_info() {
    echo -e "${BLUE}ℹ${NC}  $1" >&2
}

log_success() {
    echo -e "${GREEN}✓${NC}  $1" >&2
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $1" >&2
}

log_error() {
    echo -e "${RED}✗${NC}  $1" >&2
}

log_step() {
    echo -e "${CYAN}▸${NC}  $1" >&2
}

# Detect OS
detect_os() {
    local os
    case "$(uname -s)" in
        Linux*)     os="linux" ;;
        Darwin*)    os="darwin" ;;
        CYGWIN*)    os="windows" ;;
        MINGW*)     os="windows" ;;
        *)          os="unknown" ;;
    esac
    echo "$os"
}

# Detect architecture
detect_arch() {
    local arch
    case "$(uname -m)" in
        x86_64)     arch="x64" ;;
        amd64)      arch="x64" ;;
        arm64)      arch="arm64" ;;
        aarch64)    arch="arm64" ;;
        *)          arch="unknown" ;;
    esac
    echo "$arch"
}

# Check dependencies
check_dependencies() {
    local missing_deps=()

    if ! command -v curl >/dev/null 2>&1; then
        missing_deps+=("curl")
    fi

    if ! command -v jq >/dev/null 2>&1; then
        log_warning "jq not found. Will use basic JSON parsing."
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install them and try again."
        exit 1
    fi
}

# Get latest release version
get_latest_version() {
    local url="https://api.github.com/repos/$REPO/releases/latest"

    if command -v jq >/dev/null 2>&1; then
        curl -fsSL "$url" | jq -r '.tag_name'
    else
        # Fallback without jq
        curl -fsSL "$url" | grep '"tag_name":' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/'
    fi
}

# Download binary
download_binary() {
    local plugin="$1"
    local os="$2"
    local arch="$3"
    local version="$4"
    local binary_name="$5"

    # For now, we'll download the source and build
    # In the future, this will download pre-compiled binaries
    local download_url="https://github.com/$REPO/archive/refs/tags/${version}.tar.gz"

    log_step "Downloading $plugin from GitHub..."

    local tmp_dir
    tmp_dir=$(mktemp -d)
    local tar_file="$tmp_dir/claude-tools.tar.gz"

    if ! curl -fsSL "$download_url" -o "$tar_file"; then
        log_error "Failed to download from $download_url"
        rm -rf "$tmp_dir"
        exit 1
    fi

    log_success "Downloaded successfully"

    echo "$tmp_dir"
}

# Build binary (temporary until we have pre-compiled binaries)
build_binary() {
    local tmp_dir="$1"
    local plugin="$2"
    local version="$3"

    log_step "Extracting and building $plugin..."

    cd "$tmp_dir"
    tar -xzf claude-tools.tar.gz

    # Find the extracted directory (removes v from version tag)
    local extracted_dir
    extracted_dir=$(find . -maxdepth 1 -type d -name "claude-tools-*" | head -n 1)

    if [ -z "$extracted_dir" ]; then
        log_error "Failed to find extracted directory"
        return 1
    fi

    cd "$extracted_dir"

    # Check if bun is installed
    if ! command -v bun >/dev/null 2>&1; then
        log_warning "Bun not found. Installing Bun..."
        curl -fsSL https://bun.sh/install | bash
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
    fi

    # Install dependencies and build
    log_step "Installing dependencies..."
    if ! bun install >/dev/null 2>&1; then
        log_warning "Dependency installation had warnings (continuing anyway)"
    fi

    log_step "Building binary..."
    cd "packages/$plugin"

    # Build and capture output in case of error
    local build_output
    if ! build_output=$(bun run build 2>&1); then
        log_error "Build failed:"
        echo "$build_output" >&2
        return 1
    fi

    # Find the binary
    local binary_path
    if [ "$plugin" = "statusline" ]; then
        binary_path="claude-statusline"
    else
        binary_path="$plugin"
    fi

    if [ ! -f "$binary_path" ]; then
        log_error "Binary not found after build: $binary_path"
        log_info "Build output was:"
        echo "$build_output" >&2
        return 1
    fi

    log_success "Build completed"

    echo "$extracted_dir/packages/$plugin/$binary_path"
}

# Install binary
install_binary() {
    local binary_path="$1"
    local binary_name="$2"

    log_step "Installing binary..."

    # Try to install to /usr/local/bin first, fallback to ~/.local/bin
    local install_dir
    if [ -w "/usr/local/bin" ]; then
        install_dir="/usr/local/bin"
    else
        install_dir="$HOME/.local/bin"
        mkdir -p "$install_dir"

        # Add to PATH if not already there
        if [[ ":$PATH:" != *":$install_dir:"* ]]; then
            log_warning "~/.local/bin is not in PATH"
            log_info "Add this to your ~/.bashrc or ~/.zshrc:"
            echo "    export PATH=\"\$HOME/.local/bin:\$PATH\"" >&2
        fi
    fi

    # Copy and make executable
    if cp "$binary_path" "$install_dir/$binary_name"; then
        chmod +x "$install_dir/$binary_name"
        log_success "Installed to $install_dir/$binary_name"
        echo "$install_dir/$binary_name"
    else
        log_error "Failed to install binary"
        log_info "Try running with sudo or install manually"
        exit 1
    fi
}

# Configure Claude Code
configure_claude() {
    local binary_path="$1"
    local plugin="$2"

    log_step "Configuring Claude Code..."

    local settings_dir="$HOME/.claude"
    local settings_file="$settings_dir/settings.json"

    # Create .claude directory if it doesn't exist
    mkdir -p "$settings_dir"

    # Read existing settings or create new
    local settings="{}"
    if [ -f "$settings_file" ]; then
        settings=$(cat "$settings_file")
    fi

    # Update settings based on plugin type
    case "$plugin" in
        statusline)
            # Use jq if available, otherwise use basic sed
            if command -v jq >/dev/null 2>&1; then
                settings=$(echo "$settings" | jq --arg cmd "$binary_path" '. + {statusLine: {type: "command", command: $cmd, padding: 2}}')
            else
                # Basic fallback (less robust)
                settings="{\"statusLine\": {\"type\": \"command\", \"command\": \"$binary_path\", \"padding\": 2}}"
            fi
            ;;
        *)
            log_warning "Unknown plugin type: $plugin"
            log_info "You may need to configure ~/.claude/settings.json manually"
            return
            ;;
    esac

    # Write settings
    echo "$settings" > "$settings_file"
    log_success "Claude Code configured"
}

# Verify installation
verify_installation() {
    local binary_path="$1"
    local plugin="$2"

    log_step "Verifying installation..."

    if [ ! -x "$binary_path" ]; then
        log_error "Binary is not executable: $binary_path"
        return 1
    fi

    # Test the binary with mock data
    local test_output
    test_output=$(echo '{"model":{"display_name":"Test"},"context_window":{"used_percentage":50},"workspace":{"current_dir":"/test"},"cwd":"/test","cost":{"total_cost_usd":0.1,"total_duration_ms":60000},"session_id":"test","exceeds_200k_tokens":false}' | "$binary_path" 2>&1 || true)

    if [ -n "$test_output" ]; then
        log_success "Installation verified successfully"
    else
        log_warning "Binary installed but test produced no output"
        log_info "This might be normal depending on the plugin"
    fi
}

# Cleanup
cleanup() {
    local tmp_dir="$1"
    if [ -n "$tmp_dir" ] && [ -d "$tmp_dir" ]; then
        rm -rf "$tmp_dir"
    fi
}

# Main installation flow
main() {
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo "   Claude Tools Installer"
    echo "═══════════════════════════════════════════════════"
    echo ""

    # Get plugin name from argument or use default
    local plugin="${1:-$DEFAULT_PLUGIN}"

    log_info "Installing plugin: $plugin"
    echo ""

    # Detect system
    local os arch
    os=$(detect_os)
    arch=$(detect_arch)

    log_info "Detected system: $os $arch"

    if [ "$os" = "unknown" ] || [ "$arch" = "unknown" ]; then
        log_error "Unsupported system: $os $arch"
        exit 1
    fi

    # Check dependencies
    check_dependencies

    # Get version
    if [ "$VERSION" = "latest" ]; then
        log_step "Fetching latest version..."
        VERSION=$(get_latest_version)
        if [ -z "$VERSION" ]; then
            log_error "Failed to fetch latest version"
            exit 1
        fi
    fi

    log_info "Using version: $VERSION"
    echo ""

    # Determine binary name
    local binary_name
    case "$plugin" in
        statusline)     binary_name="claude-statusline" ;;
        *)              binary_name="$plugin" ;;
    esac

    # Download and extract
    local tmp_dir
    tmp_dir=$(download_binary "$plugin" "$os" "$arch" "$VERSION" "$binary_name")

    # Build binary
    local binary_src_path
    binary_src_path=$(build_binary "$tmp_dir" "$plugin" "$VERSION")

    if [ -z "$binary_src_path" ] || [ ! -f "$binary_src_path" ]; then
        log_error "Failed to build binary"
        cleanup "$tmp_dir"
        exit 1
    fi

    # Install binary
    local binary_install_path
    binary_install_path=$(install_binary "$binary_src_path" "$binary_name")

    # Configure Claude Code
    configure_claude "$binary_install_path" "$plugin"

    # Verify installation
    verify_installation "$binary_install_path" "$plugin"

    # Cleanup
    cleanup "$tmp_dir"

    # Success message
    echo ""
    echo "═══════════════════════════════════════════════════"
    log_success "Installation complete!"
    echo "═══════════════════════════════════════════════════"
    echo ""
    log_info "Next steps:"
    echo "  1. Restart Claude Code to see the changes"
    echo "  2. Start a new session"
    echo "  3. Your $plugin will appear automatically"
    echo ""
    log_info "Documentation: https://github.com/$REPO"
    log_info "Issues: https://github.com/$REPO/issues"
    echo ""
}

# Handle errors
trap 'log_error "Installation failed"; exit 1' ERR

# Run main function
main "$@"
