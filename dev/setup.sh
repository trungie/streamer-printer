#!/usr/bin/env bash
set -euo pipefail

# Dev environment setup for streamer-printer local rendering.
# Installs system dependencies needed by dev/test-render.sh.
#
# Usage: sudo ./dev/setup.sh

if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root (sudo ./dev/setup.sh)" >&2
    exit 1
fi

echo "=== Streamer Printer: Dev Environment Setup ==="
echo ""

# --- make (runs Makefile targets for convenient rendering commands) ---
# The Makefile provides shorthand targets like `make sub`, `make raid`, etc.
echo "[1/4] Installing make..."
apt-get install -y make

# --- Wine (runs the bundled Windows wkhtmltopdf.exe / wkhtmltoimage.exe) ---
# The production pipeline uses wkhtmltopdf.exe on Windows to convert HTML to PDF.
# Wine lets us run the exact same .exe on Linux for rendering parity.
echo "[2/4] Installing Wine..."
apt-get install -y wine

# --- Wine 32-bit support (wkhtmltopdf.exe is a 32-bit Windows binary) ---
# Without this, Wine runs in 64-bit-only mode which has limited compatibility
# and prints "wine32 is missing" warnings on every invocation.
echo "[3/4] Installing Wine 32-bit support..."
dpkg --add-architecture i386
apt-get update
apt-get install -y wine32:i386

# --- Xvfb (virtual framebuffer for headless rendering) ---
# wkhtmltopdf uses Qt/WebKit internally which requires a display server.
# On headless systems (SSH, CI, no desktop), Xvfb provides a virtual X display
# so wkhtmltopdf can render without a physical monitor.
echo "[4/4] Installing Xvfb..."
apt-get install -y xvfb

echo ""
echo "=== Setup complete ==="
echo ""
echo "You may need to recreate your Wine prefix:"
echo "  rm -rf ~/.wine && WINEARCH=win64 wineboot"
echo ""
echo "Test it:"
echo "  make sub"
echo "  make streamelements-tip"
echo "  make all"
