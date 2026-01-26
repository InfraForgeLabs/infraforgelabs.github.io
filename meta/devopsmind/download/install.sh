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

# ---------------- Python Auto-Install (ADDED) ----------------
if ! command -v python3 >/dev/null 2>&1; then
  echo "🐍 Python not found. Installing Python 3..."

  case "$OS" in
    Linux)
      if command -v apt >/dev/null 2>&1; then
        sudo apt update
        sudo apt install -y python3 python3-venv python3-pip
      elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y python3 python3-pip
      elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -S --noconfirm python python-pip
      else
        echo "❌ Unsupported Linux package manager."
        echo "👉 Please install Python 3.9+ manually."
        exit 1
      fi
      ;;
    Darwin)
      if command -v brew >/dev/null 2>&1; then
        brew install python
      else
        echo "❌ Homebrew not found."
        echo "👉 Install Homebrew first: https://brew.sh"
        exit 1
      fi
      ;;
  esac
fi

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

# ---------------- Docker Check ----------------
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo
  echo "🐳 Docker is ready."
  echo
else
  echo
  echo "🐳 Docker is required for DevOpsMind Safe Shell."
  echo

  case "$OS" in
    Linux)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        echo "Detected: Windows (WSL2)"
        echo
        echo "Install Docker Desktop on Windows:"
        echo "  curl -L https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe -o DockerInstaller.exe"
        echo "  start DockerInstaller.exe"
        echo
        echo "Then enable WSL integration inside Docker Desktop."
      else
        echo "Detected: Linux"
        echo
        echo "Install Docker Engine (official):"
        echo "  curl -fsSL https://get.docker.com | sh"
        echo "  sudo usermod -aG docker \$USER"
        echo "  newgrp docker"
      fi
      ;;
    Darwin)
      echo "Detected: macOS"
      echo
      echo "Install Docker Desktop:"
      echo "  curl -L https://desktop.docker.com/mac/main/amd64/Docker.dmg -o Docker.dmg"
      echo "  open Docker.dmg"
      ;;
  esac

  echo
  echo "After Docker is running, start DevOpsMind:"
  echo "  devopsmind login"
  echo
  exit 1
fi

echo
echo "======================================"
echo "✅ $APP_NAME installed successfully!"
echo "➡️  Run: devopsmind login"
echo "======================================"
