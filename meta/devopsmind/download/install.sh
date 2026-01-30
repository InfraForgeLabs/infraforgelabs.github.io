#!/usr/bin/env sh
set -e

# ---------------- Dependency Installer ----------------

install_package_linux() {

  PKG="$1"

  SUDO=""

  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  fi

  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update -y
    $SUDO apt-get install -y "$PKG"

  elif command -v dnf >/dev/null 2>&1; then
    $SUDO dnf install -y "$PKG"

  elif command -v yum >/dev/null 2>&1; then
    $SUDO yum install -y "$PKG"

  elif command -v pacman >/dev/null 2>&1; then
    $SUDO pacman -Sy --noconfirm "$PKG"

  elif command -v zypper >/dev/null 2>&1; then
    $SUDO zypper install -y "$PKG"

  else
    echo "❌ Could not detect package manager."
    echo "👉 Please install '$PKG' manually."
    exit 1
  fi
}



require_command() {

  CMD="$1"
  PKG="$2"

  if command -v "$CMD" >/dev/null 2>&1; then
    return
  fi

  echo
  echo "⚠️  Missing required dependency: $CMD"

  case "$OS" in
    Linux)
      echo "👉 Attempting to install $PKG..."

      if ! command -v sudo >/dev/null 2>&1; then
        echo "❌ sudo is required to install dependencies."
        exit 1
      fi

      install_package_linux "$PKG"
      ;;

    Darwin)
      echo "👉 Please install via Homebrew:"
      echo "   brew install $PKG"
      exit 1
      ;;
  esac
}

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

# ---------------- Core Dependencies ----------------

require_command curl curl
require_command tar tar

# ---------------- Fetch latest version ----------------
echo "🔍 Fetching latest version..."

VERSION="$(curl -fsSL "${META_BASE_URL}/version.json" \
  | sed -n 's/.*"latest_version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"

[ -z "$VERSION" ] && {
  echo "❌ Could not determine latest version."
  exit 1
}

echo "📦 Latest version: $VERSION"
TAG="v${VERSION}-devopsmind"

# ---------------- Resolve asset ----------------
case "$PLATFORM" in
  linux)
    [ "$ARCH" != "x86_64" ] && {
      echo "❌ Linux ARM64 is not supported yet."
      exit 1
    }
    ARCHIVE="devopsmind-linux-x86_64.tar.gz"
    ;;
  macos)
    [ "$ARCH" != "arm64" ] && {
      echo "❌ Intel macOS is not supported."
      exit 1
    }
    ARCHIVE="devopsmind-macos-arm64.tar.gz"
    ;;
esac


echo "🌐 Checking network..."
if ! curl -fsSL --connect-timeout 5 https://github.com >/dev/null 2>&1; then
  echo "❌ Network appears unavailable."
  exit 1
fi


DOWNLOAD_URL="https://github.com/${BIN_REPO}/releases/download/${TAG}/${ARCHIVE}"

# ---------------- Prepare dirs (CRITICAL FIX) ----------------
mkdir -p "$INSTALL_DIR"

# ---------------- Download + Extract ----------------
echo "⬇ Downloading ${ARCHIVE}..."
TMP_DIR="$(mktemp -d)"

curl -fL --progress-bar --retry 3 --retry-delay 2 "$DOWNLOAD_URL" -o "$TMP_DIR/devopsmind.tar.gz"

echo "📦 Extracting..."
tar -xzf "$TMP_DIR/devopsmind.tar.gz" -C "$TMP_DIR"

# ---------------- Install onedir bundle ----------------
OLD_BUNDLE="${BUNDLE_DIR}.old"

if [ -d "$BUNDLE_DIR" ]; then
  mv "$BUNDLE_DIR" "$OLD_BUNDLE"
fi

mv "$TMP_DIR/devopsmind" "$BUNDLE_DIR"
chmod +x "$BUNDLE_DIR/devopsmind"

rm -rf "$OLD_BUNDLE"


# ---------------- User-facing commands ----------------
ln -sf "$BUNDLE_DIR/devopsmind" "$INSTALL_DIR/devopsmind"
ln -sf "$BUNDLE_DIR/devopsmind" "$INSTALL_DIR/devopsmind-complete"
ln -sf "$BUNDLE_DIR/devopsmind" "$INSTALL_DIR/devopsmind-outbox"

# ---------------- Ensure INSTALL_DIR is in PATH ----------------
ensure_path() {
  case "$(basename "$SHELL")" in
    bash) PROFILE="$HOME/.bashrc" ;;
    zsh)  PROFILE="$HOME/.zshrc" ;;
    *)    PROFILE="$HOME/.profile" ;;
  esac

  if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
    touch "$PROFILE"
    grep -q "$INSTALL_DIR" "$PROFILE" || {
      echo "" >> "$PROFILE"
      echo "# Added by DevOpsMind installer" >> "$PROFILE"
      echo "export PATH=\"\$PATH:$INSTALL_DIR\"" >> "$PROFILE"
    }
    echo "➡️  Open a new terminal or run:"
    echo "   source $PROFILE"
  fi
}

ensure_path

# ---------------- Docker Preflight ----------------
echo
echo "🐳 Checking Docker runtime..."

DOCKER_REQUIRED_VERSION="20.10"

version_ge() {
  # returns 0 if $1 >= $2
  [ "$(printf '%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

if ! command -v docker >/dev/null 2>&1; then

  echo
  echo "⚠️  Docker is required to run DevOpsMind labs."
  echo

  case "$OS" in
    Linux)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        echo "👉 Install Docker Desktop for WSL2:"
        echo "   https://docs.docker.com/desktop/windows/wsl/"
      else
        echo "👉 Install Docker Engine:"
        echo "   curl -fsSL https://get.docker.com | sh"
        echo "   sudo usermod -aG docker \$USER"
        echo "   newgrp docker"
      fi
      ;;
    Darwin)
      echo "👉 Install Docker Desktop for macOS:"
      echo "   https://docs.docker.com/desktop/mac/install/"
      ;;
  esac

  echo
  echo "After installation, run:"
  echo "   devopsmind doctor"
  echo
  exit 0
fi


# ---------------- Check daemon ----------------

if ! docker info >/dev/null 2>&1; then
  echo
  echo "⚠️  Docker is installed but not running."
  echo
  echo "👉 Start Docker Desktop or the Docker daemon,"
  echo "then run:"
  echo "   devopsmind doctor"
  echo
  exit 0
fi


# ---------------- Check version ----------------

DOCKER_VERSION="$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "")"

if [ -n "$DOCKER_VERSION" ] && ! version_ge "$DOCKER_VERSION" "$DOCKER_REQUIRED_VERSION"; then
  echo
  echo "⚠️  Docker version $DOCKER_VERSION detected."
  echo "DevOpsMind requires Docker >= $DOCKER_REQUIRED_VERSION"
  echo
  echo "👉 Please upgrade Docker:"
  echo "   https://docs.docker.com/get-docker/"
  echo
  exit 0
fi


# ---------------- Permission check ----------------

if ! docker ps >/dev/null 2>&1; then
  echo
  echo "⚠️  Docker permission issue detected."
  echo
  echo "👉 Run:"
  echo "   sudo usermod -aG docker \$USER"
  echo "   newgrp docker"
  echo
  echo "Then run:"
  echo "   devopsmind doctor"
  echo
  exit 0
fi


echo "✅ Docker is installed, running, and compatible."

echo
echo "======================================"
echo "✅ ${APP_NAME} installed successfully!"
echo "➡️  Run: devopsmind login"
echo "======================================"
