#!/usr/bin/env bash

set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This bootstrap script is for Linux servers (Debian/Ubuntu)."
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "apt-get not found. This script currently supports Debian/Ubuntu only."
  exit 1
fi

SUDO=""
if [[ ${EUID:-0} -ne 0 ]]; then
  SUDO="sudo"
fi

TARGET_USER="${SUDO_USER:-${USER:-}}"
if [[ -z "$TARGET_USER" ]]; then
  TARGET_USER="root"
fi

echo "[1/6] Installing base packages (git, curl, openssh-client, netcat)..."
$SUDO apt-get update
$SUDO apt-get install -y ca-certificates curl gnupg lsb-release git openssh-client netcat-openbsd

echo "[2/6] Configuring Docker apt repository..."
$SUDO install -m 0755 -d /etc/apt/keyrings
DISTRO_ID="$($SUDO bash -lc '. /etc/os-release && echo "$ID"')"
DISTRO_CODENAME="$($SUDO bash -lc '. /etc/os-release && echo "$VERSION_CODENAME"')"

if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
  curl -fsSL "https://download.docker.com/linux/${DISTRO_ID}/gpg" | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
fi
$SUDO chmod a+r /etc/apt/keyrings/docker.gpg

$SUDO bash -lc "echo 'deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DISTRO_ID} ${DISTRO_CODENAME} stable' > /etc/apt/sources.list.d/docker.list"

echo "[3/6] Installing Docker engine + compose plugin..."
$SUDO apt-get update
$SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
$SUDO systemctl enable --now docker

echo "[4/6] Granting docker group access to user: ${TARGET_USER}"
$SUDO usermod -aG docker "$TARGET_USER" || true

echo "[5/6] Installing Node.js LTS..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_lts.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
else
  echo "Node.js already installed: $(node --version)"
fi

echo "[6/6] Enabling corepack + pnpm..."
if ! command -v corepack >/dev/null 2>&1; then
  $SUDO npm install -g corepack
fi

if [[ "$TARGET_USER" == "root" ]]; then
  corepack enable || true
  corepack prepare pnpm@10.10.0 --activate || true
else
  $SUDO -u "$TARGET_USER" bash -lc "corepack enable && corepack prepare pnpm@10.10.0 --activate" || true
fi

echo "Bootstrap completed."
echo "Important: log out and log back in so docker group changes apply."
echo "Validation commands:"
echo "  git --version"
echo "  docker --version"
echo "  docker compose version"
echo "  node --version"
echo "  pnpm --version"
