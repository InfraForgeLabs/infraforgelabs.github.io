#!/usr/bin/env sh
set -e

APP_NAME="DevOpsMind"
BIN_NAME="devopsmind"
BIN_LAUNCHER="devopsmind-cli"

META_BASE_URL="https://infraforgelabs.in/meta/devopsmind"

# 🔒 Releases are created on infraforgelabs.github.io
BIN_REPO="InfraForgeLabs/infraforgelabs.github.io"

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

TAG="v${VERSION}-devopsmind"

# ---------------- Resolve asset ----------------
case "$PLATFORM" in
  linux)
    if [ "$ARCH" != "x86_64" ]; then
      echo "❌ Linux ARM64 is not supported yet."
      exit 1
    fi
    ARCHIVE="devopsmind-linux-x86_64.tar.gz"
    ;;
  macos)
    if [ "$ARCH" != "arm64" ]; then
      echo "❌ Intel macOS is not supported yet."
      exit 1
    fi
    ARCHIVE="devopsmind-macos-arm64.tar.gz"
    ;;
esac

DOWNLOAD_URL="https://github.com/${BIN_REPO}/releases/download/${TAG}/${ARCHIVE}"

# ---------------- Download + Extract ----------------
echo "⬇ Downloading ${ARCHIVE}..."
mkdir -p "$INSTALL_DIR"

TMP_DIR="$(mktemp -d)"

curl -fsSL "$DOWNLOAD_URL" -o "$TMP_DIR/devopsmind.tar.gz"

echo "📦 Extracting..."
tar -xzf "$TMP_DIR/devopsmind.tar.gz" -C "$TMP_DIR"

# ---------------- Install ONEDIR bundle ----------------
rm -rf "${INSTALL_DIR}/devopsmind"
mv "$TMP_DIR/devopsmind" "${INSTALL_DIR}/devopsmind"
chmod +x "${INSTALL_DIR}/devopsmind/devopsmind"

# ---------------- Launcher & symlinks ----------------
rm -f "${INSTALL_DIR}/${BIN_LAUNCHER}"
ln -s "${INSTALL_DIR}/devopsmind/devopsmind" "${INSTALL_DIR}/${BIN_LAUNCHER}"

ln -sf "${INSTALL_DIR}/${BIN_LAUNCHER}" "${INSTALL_DIR}/${BIN_NAME}"
ln -sf "${INSTALL_DIR}/${BIN_LAUNCHER}" "${INSTALL_DIR}/devopsmind-complete"
ln -sf "${INSTALL_DIR}/${BIN_LAUNCHER}" "${INSTALL_DIR}/devopsmind-outbox"

rm -rf "$TMP_DIR"

# ---------------- Ensure INSTALL_DIR is in PATH ----------------
ensure_path() {
  SHELL_NAME="$(basename "$SHELL")"

  case "$SHELL_NAME" in
    bash) PROFILE="$HOME/.bashrc" ;;
    zsh)  PROFILE="$HOME/.zshrc" ;;
    *)    PROFILE="$HOME/.profile" ;;
  esac

  if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
    echo
    echo "🔧 Adding $INSTALL_DIR to PATH ($PROFILE)"
    touch "$PROFILE"

    if ! grep -q "$INSTALL_DIR" "$PROFILE"; then
      {
        echo ""
        echo "# Added by DevOpsMind installer"
        echo "export PATH=\"\$PATH:$INSTALL_DIR\""
      } >> "$PROFILE"
    fi

    echo "➡️  Open a new terminal or run:"
    echo "   source $PROFILE"
  fi
}

ensure_path

# ---------------- Docker Check (UNCHANGED) ----------------
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
