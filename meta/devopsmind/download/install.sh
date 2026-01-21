#!/usr/bin/env sh
set -e

APP_NAME="DevOpsMind"
PKG_NAME="devopsmind"

echo "======================================"
echo "🚀 Installing $APP_NAME"
echo "======================================"
echo

# ---------------- OS Check ----------------
OS="$(uname -s)"
case "$OS" in
  Linux|Darwin) ;;
  *)
    echo "❌ Unsupported OS: $OS"
    exit 1
    ;;
esac

# ---------------- Python Check ----------------
if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ Python 3.9+ is required."
  echo "👉 Please install Python 3 and retry."
  exit 1
fi

PY_OK="$(python3 - <<EOF
import sys
print(sys.version_info >= (3,9))
EOF
)"

if [ "$PY_OK" != "True" ]; then
  echo "❌ Python 3.9+ is required."
  exit 1
fi

# ---------------- pipx Check ----------------
if ! command -v pipx >/dev/null 2>&1; then
  echo "📦 pipx not found. Installing pipx..."

  if command -v apt >/dev/null 2>&1; then
    sudo apt update
    sudo apt install -y pipx
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y python3-pipx
  elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -S --noconfirm python-pipx
  elif command -v brew >/dev/null 2>&1; then
    brew install pipx
  else
    echo "❌ Could not detect a supported package manager."
    echo "👉 Please install pipx manually."
    exit 1
  fi

  pipx ensurepath
  echo "ℹ️  You may need to restart your shell for PATH changes."
fi

# ---------------- Install DevOpsMind ----------------
echo
echo "📦 Installing $APP_NAME via pipx..."
pipx install "$PKG_NAME" --force

echo
echo "======================================"
echo "✅ $APP_NAME installed successfully!"
echo "➡️  Run: devopsmind --help"
echo "======================================"
