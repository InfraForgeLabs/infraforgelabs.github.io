#!/usr/bin/env sh
set -e

APP_NAME="DevOpsMind"
BIN_NAME="devopsmind"
BASE_REPO="InfraForgeLabs/infraforgelabs.github.io"
BASE_URL="https://raw.githubusercontent.com/${BASE_REPO}/main/meta/devopsmind"

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

VERSION="$(curl -fsSL "${BASE_URL}/version.json" | sed -n 's/.*"latest_version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"

if [ -z "$VERSION" ]; then
  echo "❌ Could not determine latest version."
  exit 1
fi

echo "📦 Latest version: $VERSION"

BINARY="${BIN_NAME}-${PLATFORM}-${ARCH}"
DOWNLOAD_URL="https://raw.githubusercontent.com/${BASE_REPO}/main/meta/devopsmind/download/${VERSION}/${BINARY}"

# ---------------- Download ----------------
echo "⬇ Downloading ${BINARY}..."
mkdir -p "$INSTALL_DIR"

curl -fL "$DOWNLOAD_URL" -o "${INSTALL_DIR}/${BIN_NAME}"

chmod +x "${INSTALL_DIR}/${BIN_NAME}"

# ---------------- PATH hint ----------------
if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
  echo
  echo "⚠️  $INSTALL_DIR is not in your PATH"
  echo "👉 Add this to your shell config:"
  echo "   export PATH=\"\$PATH:$INSTALL_DIR\""
fi

# ---------------- Docker note ----------------
echo
echo "🐳 Docker is recommended for DevOpsMind Safe Shell."
echo "   https://docs.docker.com/get-docker/"

echo
echo "======================================"
echo "✅ ${APP_NAME} installed successfully!"
echo "➡️  Run: devopsmind --version"
echo "➡️  Then: devopsmind login"
echo "======================================"
