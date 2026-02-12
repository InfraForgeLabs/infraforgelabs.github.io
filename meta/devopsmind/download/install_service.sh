#!/usr/bin/env sh
set -e

APP_NAME="DevOpsMind"
BIN_NAME="devopsmind"

META_BASE_URL="https://infraforgelabs.in/meta/devopsmind"
BIN_REPO="InfraForgeLabs/infraforgelabs.github.io"

INSTALL_DIR="$HOME/.local/bin"
BUNDLE_DIR="$INSTALL_DIR/.devopsmind"

echo "======================================"
echo "🚀 Installing ${APP_NAME}"
echo "======================================"
echo

# ---------------- Detect OS ----------------
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux)   PLATFORM="linux" ;;
  Darwin)  PLATFORM="macos" ;;
  *)
    echo "❌ Unsupported OS: $OS"
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64|amd64) ARCH="x86_64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *)
    echo "❌ Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

# ---------------- Dependency Check ----------------
require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "❌ Missing required dependency: $1"
    exit 1
  }
}

require_command curl
require_command tar

# ---------------- Fetch Version ----------------
echo "🔍 Fetching latest version..."

VERSION="$(curl -fsSL "${META_BASE_URL}/version.json" \
  | sed -n 's/.*"latest_version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"

[ -z "$VERSION" ] && {
  echo "❌ Could not determine latest version."
  exit 1
}

echo "📦 Latest version: $VERSION"
TAG="v${VERSION}-devopsmind"

# ---------------- Resolve Asset ----------------
case "$PLATFORM" in
  linux)
    [ "$ARCH" != "x86_64" ] && {
      echo "❌ Linux ARM64 not supported yet."
      exit 1
    }
    ARCHIVE="devopsmind-linux-x86_64.tar.gz"
    ;;
  macos)
    [ "$ARCH" != "arm64" ] && {
      echo "❌ Only Apple Silicon supported."
      exit 1
    }
    ARCHIVE="devopsmind-macos-arm64.tar.gz"
    ;;
esac

DOWNLOAD_URL="https://github.com/${BIN_REPO}/releases/download/${TAG}/${ARCHIVE}"

echo "⬇ Downloading ${ARCHIVE}..."
TMP_DIR="$(mktemp -d)"

curl -fL --retry 3 "$DOWNLOAD_URL" -o "$TMP_DIR/$ARCHIVE"

echo "📦 Extracting..."
tar -xzf "$TMP_DIR/$ARCHIVE" -C "$TMP_DIR"

mkdir -p "$INSTALL_DIR"

OLD_BUNDLE="${BUNDLE_DIR}.old"
[ -d "$BUNDLE_DIR" ] && mv "$BUNDLE_DIR" "$OLD_BUNDLE"

mv "$TMP_DIR/devopsmind" "$BUNDLE_DIR"
chmod +x "$BUNDLE_DIR/devopsmind"
rm -rf "$OLD_BUNDLE"

ln -sf "$BUNDLE_DIR/devopsmind" "$INSTALL_DIR/devopsmind"

# ---------------- Ensure PATH ----------------
if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
  PROFILE="$HOME/.profile"
  echo "" >> "$PROFILE"
  echo "# Added by DevOpsMind installer" >> "$PROFILE"
  echo "export PATH=\"\$PATH:$INSTALL_DIR\"" >> "$PROFILE"
  echo "➡️ Run: source $PROFILE"
fi

# ==================================================
# Background Service Installation
# ==================================================

install_linux_service() {

  # Detect WSL
  if grep -qi microsoft /proc/version 2>/dev/null; then
    echo "🪟 WSL detected — systemd may not be available."
    echo "🔄 Starting DevOpsMind in background (WSL mode)..."
    nohup "$BUNDLE_DIR/devopsmind" agent start >/dev/null 2>&1 &
    echo "✅ DevOpsMind started in background."
    return
  fi

  if ! command -v systemctl >/dev/null 2>&1; then
    echo "⚠ systemd not available. Starting in background..."
    nohup "$BUNDLE_DIR/devopsmind" agent start >/dev/null 2>&1 &
    return
  fi

  SERVICE_DIR="$HOME/.config/systemd/user"
  SERVICE_FILE="$SERVICE_DIR/devopsmind.service"

  mkdir -p "$SERVICE_DIR"

  cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=DevOpsMind Local Engine
After=network.target

[Service]
ExecStart=$BUNDLE_DIR/devopsmind agent start
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF

  systemctl --user daemon-reload
  systemctl --user enable devopsmind.service
  systemctl --user start devopsmind.service

  echo "✅ systemd user service installed and started."
}

install_macos_service() {

  PLIST="$HOME/Library/LaunchAgents/com.devopsmind.agent.plist"

  mkdir -p "$HOME/Library/LaunchAgents"

  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
"http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.devopsmind.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>$BUNDLE_DIR/devopsmind</string>
    <string>agent</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
EOF

  launchctl load "$PLIST"
  echo "✅ macOS LaunchAgent installed and started."
}

echo
echo "🔧 Installing background service..."

case "$PLATFORM" in
  linux) install_linux_service ;;
  macos) install_macos_service ;;
esac

echo
echo "======================================"
echo "✅ ${APP_NAME} installed successfully!"
echo "🌐 Open: https://devopsmind.infraforgelabs.in/console"
echo "======================================"
