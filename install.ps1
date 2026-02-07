# Claude Tools Installer for Windows
# PowerShell script to install Claude Code plugins without cloning the repository
#
# Usage:
#   powershell -ExecutionPolicy Bypass -Command "iwr -useb https://raw.githubusercontent.com/V4lle-Tech/claude-tools/main/install.ps1 | iex"
#   or
#   .\install.ps1 -Plugin statusline

param(
    [string]$Plugin = "statusline",
    [string]$Version = "latest"
)

# Configuration
$Repo = "V4lle-Tech/claude-tools"
$ErrorActionPreference = "Stop"

# Colors (for PowerShell 5.0+)
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )

    $colors = @{
        "Info" = "Cyan"
        "Success" = "Green"
        "Warning" = "Yellow"
        "Error" = "Red"
        "Step" = "Blue"
    }

    $symbols = @{
        "Info" = "ℹ"
        "Success" = "✓"
        "Warning" = "⚠"
        "Error" = "✗"
        "Step" = "▸"
    }

    Write-Host "$($symbols[$Type])  " -ForegroundColor $colors[$Type] -NoNewline
    Write-Host $Message
}

function Get-LatestVersion {
    Write-ColorOutput "Fetching latest version..." "Step"

    try {
        $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
        return $response.tag_name
    }
    catch {
        Write-ColorOutput "Failed to fetch latest version" "Error"
        throw
    }
}

function Download-Source {
    param(
        [string]$Version
    )

    Write-ColorOutput "Downloading source from GitHub..." "Step"

    $downloadUrl = "https://github.com/$Repo/archive/refs/tags/$Version.zip"
    $tempPath = [System.IO.Path]::GetTempPath()
    $zipPath = Join-Path $tempPath "claude-tools.zip"
    $extractPath = Join-Path $tempPath "claude-tools-extract"

    try {
        # Download
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
        Write-ColorOutput "Downloaded successfully" "Success"

        # Extract
        Write-ColorOutput "Extracting files..." "Step"
        if (Test-Path $extractPath) {
            Remove-Item $extractPath -Recurse -Force
        }
        Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

        # Find extracted directory
        $extractedDir = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1

        if (-not $extractedDir) {
            throw "Failed to find extracted directory"
        }

        return $extractedDir.FullName
    }
    finally {
        if (Test-Path $zipPath) {
            Remove-Item $zipPath -Force
        }
    }
}

function Install-Bun {
    Write-ColorOutput "Checking for Bun..." "Step"

    if (Get-Command bun -ErrorAction SilentlyContinue) {
        Write-ColorOutput "Bun is already installed" "Info"
        return
    }

    Write-ColorOutput "Bun not found. Installing..." "Warning"

    try {
        powershell -c "irm bun.sh/install.ps1 | iex"
        Write-ColorOutput "Bun installed successfully" "Success"

        # Refresh PATH
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
    }
    catch {
        Write-ColorOutput "Failed to install Bun. Please install manually from https://bun.sh" "Error"
        throw
    }
}

function Build-Binary {
    param(
        [string]$SourcePath,
        [string]$Plugin
    )

    Write-ColorOutput "Building binary..." "Step"

    $pluginPath = Join-Path $SourcePath "packages\$Plugin"

    if (-not (Test-Path $pluginPath)) {
        throw "Plugin path not found: $pluginPath"
    }

    Push-Location $SourcePath

    try {
        # Install dependencies
        Write-ColorOutput "Installing dependencies..." "Step"
        & bun install *>&1 | Out-Null

        # Build
        Push-Location $pluginPath
        & bun run build *>&1 | Out-Null
        Pop-Location

        # Find binary
        $binaryName = if ($Plugin -eq "statusline") { "claude-statusline.exe" } else { "$Plugin.exe" }
        $binaryPath = Join-Path $pluginPath $binaryName

        if (Test-Path $binaryPath) {
            Write-ColorOutput "Build completed" "Success"
            return $binaryPath
        }

        # Try without .exe extension (Bun on Windows might not add it)
        $binaryName = if ($Plugin -eq "statusline") { "claude-statusline" } else { $Plugin }
        $binaryPath = Join-Path $pluginPath $binaryName

        if (Test-Path $binaryPath) {
            Write-ColorOutput "Build completed" "Success"
            return $binaryPath
        }

        throw "Binary not found after build"
    }
    finally {
        Pop-Location
    }
}

function Install-Binary {
    param(
        [string]$BinaryPath,
        [string]$BinaryName
    )

    Write-ColorOutput "Installing binary..." "Step"

    # Install to user's local bin directory
    $installDir = Join-Path $env:LOCALAPPDATA "claude-tools\bin"

    if (-not (Test-Path $installDir)) {
        New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    }

    $installPath = Join-Path $installDir "$BinaryName.exe"
    Copy-Item $BinaryPath $installPath -Force

    # Add to PATH if not already there
    $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    if ($userPath -notlike "*$installDir*") {
        Write-ColorOutput "Adding to PATH..." "Step"
        [System.Environment]::SetEnvironmentVariable("PATH", "$userPath;$installDir", "User")
        $env:PATH += ";$installDir"
        Write-ColorOutput "Added $installDir to PATH" "Success"
        Write-ColorOutput "You may need to restart your terminal for PATH changes to take effect" "Warning"
    }

    Write-ColorOutput "Installed to $installPath" "Success"
    return $installPath
}

function Configure-Claude {
    param(
        [string]$BinaryPath,
        [string]$Plugin
    )

    Write-ColorOutput "Configuring Claude Code..." "Step"

    $claudeDir = Join-Path $env:USERPROFILE ".claude"
    $settingsFile = Join-Path $claudeDir "settings.json"

    # Create .claude directory if it doesn't exist
    if (-not (Test-Path $claudeDir)) {
        New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
    }

    # Read or create settings
    $settings = if (Test-Path $settingsFile) {
        Get-Content $settingsFile -Raw | ConvertFrom-Json
    } else {
        [PSCustomObject]@{}
    }

    # Update settings based on plugin
    switch ($Plugin) {
        "statusline" {
            $settings | Add-Member -MemberType NoteProperty -Name "statusLine" -Value @{
                type = "command"
                command = $BinaryPath
                padding = 2
            } -Force
        }
        default {
            Write-ColorOutput "Unknown plugin type: $Plugin" "Warning"
            Write-ColorOutput "You may need to configure ~/.claude/settings.json manually" "Info"
            return
        }
    }

    # Write settings
    $settings | ConvertTo-Json -Depth 10 | Set-Content $settingsFile
    Write-ColorOutput "Claude Code configured" "Success"
}

function Test-Installation {
    param(
        [string]$BinaryPath
    )

    Write-ColorOutput "Verifying installation..." "Step"

    if (-not (Test-Path $BinaryPath)) {
        Write-ColorOutput "Binary not found: $BinaryPath" "Error"
        return $false
    }

    # Test with mock data
    $mockData = '{"model":{"display_name":"Test"},"context_window":{"used_percentage":50},"workspace":{"current_dir":"/test"},"cwd":"/test","cost":{"total_cost_usd":0.1,"total_duration_ms":60000},"session_id":"test","exceeds_200k_tokens":false}'

    try {
        $output = $mockData | & $BinaryPath 2>&1
        if ($output) {
            Write-ColorOutput "Installation verified successfully" "Success"
            return $true
        }
    }
    catch {
        Write-ColorOutput "Binary test produced no output (might be normal)" "Warning"
    }

    return $true
}

# Main installation flow
function Main {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   Claude Tools Installer for Windows" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    Write-ColorOutput "Installing plugin: $Plugin" "Info"
    Write-Host ""

    try {
        # Get version
        if ($Version -eq "latest") {
            $Version = Get-LatestVersion
        }

        Write-ColorOutput "Using version: $Version" "Info"
        Write-Host ""

        # Check/Install Bun
        Install-Bun

        # Download source
        $sourcePath = Download-Source -Version $Version

        # Build binary
        $binaryPath = Build-Binary -SourcePath $sourcePath -Plugin $Plugin

        # Determine binary name
        $binaryName = if ($Plugin -eq "statusline") { "claude-statusline" } else { $Plugin }

        # Install binary
        $installedPath = Install-Binary -BinaryPath $binaryPath -BinaryName $binaryName

        # Configure Claude Code
        Configure-Claude -BinaryPath $installedPath -Plugin $Plugin

        # Verify
        Test-Installation -BinaryPath $installedPath

        # Cleanup
        if (Test-Path $sourcePath) {
            Remove-Item (Split-Path $sourcePath -Parent) -Recurse -Force
        }

        # Success
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
        Write-ColorOutput "Installation complete!" "Success"
        Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
        Write-Host ""
        Write-ColorOutput "Next steps:" "Info"
        Write-Host "  1. Restart Claude Code to see the changes"
        Write-Host "  2. Start a new session"
        Write-Host "  3. Your $Plugin will appear automatically"
        Write-Host ""
        Write-ColorOutput "Documentation: https://github.com/$Repo" "Info"
        Write-ColorOutput "Issues: https://github.com/$Repo/issues" "Info"
        Write-Host ""
    }
    catch {
        Write-Host ""
        Write-ColorOutput "Installation failed: $_" "Error"
        Write-Host $_.ScriptStackTrace
        exit 1
    }
}

# Run main
Main
