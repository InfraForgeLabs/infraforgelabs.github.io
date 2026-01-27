#!/usr/bin/env sh
set -e

APP_NAME="DevOpsMind"
BIN_NAME="devopsmind"

META_REPO="InfraForgeLabs/infraforgelabs.github.io"
BIN_REPO="InfraForgeLabs/infraforgelabs.github.io"

META_BASE_URL="https://raw.githubusercontent.com/${META_REPO}/main/meta/devopsmind"
INSTALL_DIR="$HOME/.local/bin"

echo "======================================"
echo "🚀 Installing ${APP_NAME}"
echo "======================================"
echo

# ---------------- OS + ARCH ----------------
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

# ---------------- Fetch latest version ----------------
echo "🔍 Fetching latest version..."

VERSION="$(curl -fsSL "${META_BASE_URL}/version.json" \
  | sed -n 's/.*"latest_version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"

if [ -z "$VERSION" ]; then
  echo "❌ Could not determine latest version."
  exit 1
fi

echo "📦 Latest version: $VERSION"

BINARY="${BIN_NAME}-${PLATFORM}-${ARCH}"
DOWNLOAD_URL="https://github.com/${BIN_REPO}/releases/download/v${VERSION}/${BINARY}"

# ---------------- Download ----------------
echo "⬇ Downloading ${BINARY}..."
mkdir -p "$INSTALL_DIR"

curl -fsSL "$DOWNLOAD_URL" -o "${INSTALL_DIR}/${BIN_NAME}" >/dev/null
chmod +x "${INSTALL_DIR}/${BIN_NAME}"

# ---------------- PATH hint ----------------
if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
  echo
  echo "⚠️  $INSTALL_DIR is not in your PATH"
  echo "👉 Add this to your shell config:"
  echo "   export PATH=\"\$PATH:$INSTALL_DIR\""
fi

# ---------------- Docker Check ----------------
echo

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "🐳 Docker is installed and running."
else
  echo "🐳 Docker is required for DevOpsMind Safe Shell."
  echo

  case "$OS" in
    Linux)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        echo "Detected environment: Windows (WSL2)"
        echo
        echo "👉 Install Docker Desktop:"
        echo "   https://www.docker.com/products/docker-desktop/"
        echo "   Enable WSL integration after install."
      else
        echo "Detected environment: Linux"
        echo
        echo "👉 Install Docker Engine:"
        echo "   curl -fsSL https://get.docker.com | sh"
        echo "   sudo usermod -aG docker \$USER"
        echo "   newgrp docker"
      fi
      ;;
    Darwin)
      echo "Detected environment: macOS"
      echo
      echo "👉 Install Docker Desktop:"
      echo "   https://www.docker.com/products/docker-desktop/"
      ;;
  esac

  echo
  echo "After Docker is running, continue with:"
  echo "   devopsmind login"
fi

echo
echo "======================================"
echo "✅ ${APP_NAME} installed successfully!"
echo "➡️  Run: devopsmind login"
echo "======================================"
