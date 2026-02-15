#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<'EOF'
Usage: ./dev/test-render.sh [OPTIONS] <json-file>

Render a streamer-printer receipt locally using Wine + wkhtmltopdf.exe

Options:
  -s, --size SIZE       Paper size (default: A6)
  -o, --output FILE     Output file path (default: dev/output/<timestamp>.<ext>)
  -i, --image           Output PNG via wkhtmltoimage.exe instead of PDF
  -k, --keep-html       Keep the assembled HTML temp file for debugging
  -d, --delay MS        JavaScript delay in ms (default: 800)
  -p, --paginated       Use fixed page size (production mode) instead of continuous
  -h, --help            Show this help
EOF
}

# Defaults
PAPER_SIZE="A6"
OUTPUT_FILE=""
IMAGE_MODE=false
KEEP_HTML=false
PAGINATED=false
JS_DELAY=800
JSON_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -s|--size)    PAPER_SIZE="$2"; shift 2 ;;
        -o|--output)  OUTPUT_FILE="$2"; shift 2 ;;
        -i|--image)   IMAGE_MODE=true; shift ;;
        -k|--keep-html) KEEP_HTML=true; shift ;;
        -p|--paginated) PAGINATED=true; shift ;;
        -d|--delay)   JS_DELAY="$2"; shift 2 ;;
        -h|--help)    usage; exit 0 ;;
        -*)           echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
        *)            JSON_FILE="$1"; shift ;;
    esac
done

if [[ -z "$JSON_FILE" ]]; then
    echo "Error: No JSON file specified." >&2
    usage >&2
    exit 1
fi

# Resolve JSON file to absolute path
if [[ "$JSON_FILE" != /* ]]; then
    JSON_FILE="$(cd "$(dirname "$JSON_FILE")" && pwd)/$(basename "$JSON_FILE")"
fi

if [[ ! -f "$JSON_FILE" ]]; then
    echo "Error: File not found: $JSON_FILE" >&2
    exit 1
fi

# Find project root (parent of dev/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SP_DIR="$PROJECT_ROOT/dist/teotools/streamerprinter"

# Verify dist directory exists
if [[ ! -d "$SP_DIR" ]]; then
    echo "Error: Cannot find dist/teotools/streamerprinter/" >&2
    echo "  Expected at: $SP_DIR" >&2
    exit 1
fi

# Check wine is installed
if ! command -v wine &>/dev/null; then
    echo "Error: Wine is not installed." >&2
    echo "" >&2
    echo "Install it:" >&2
    echo "  Ubuntu/Debian:  sudo apt install wine" >&2
    echo "  macOS:          brew install --cask wine-stable" >&2
    echo "  Arch:           sudo pacman -S wine" >&2
    exit 1
fi

# wkhtmltopdf needs a display (Qt/WebKit). Use xvfb-run if no DISPLAY is set.
USE_XVFB=false
if [[ -z "${DISPLAY:-}" ]]; then
    if command -v xvfb-run &>/dev/null; then
        USE_XVFB=true
    else
        echo "Error: No display available and xvfb-run is not installed." >&2
        echo "  Install it: sudo apt install xvfb" >&2
        exit 1
    fi
fi

# Convert Unix path to Wine Z: drive path (avoids winepath starting wineserver)
to_winpath() {
    echo "Z:$(echo "$1" | tr '/' '\\')"
}

# Map paper size name to width in mm (for continuous/receipt mode)
paper_width_mm() {
    case "$1" in
        A5)  echo 148 ;; A6)  echo 105 ;; A7)  echo 74 ;;
        A8)  echo 52 ;;  A9)  echo 37 ;;  A10) echo 26 ;;
        B5)  echo 176 ;; B6)  echo 125 ;; B7)  echo 88 ;;
        B8)  echo 62 ;;  B9)  echo 44 ;;  B10) echo 31 ;;
        *)   echo 105 ;; # default to A6 width
    esac
}

# --- Read JSON and extract source for filename ---

JSON_DATA=$(<"$JSON_FILE")
SOURCE=$(python3 -c "import json,sys; print(json.load(sys.stdin).get('source','unknown'))" <<< "$JSON_DATA" 2>/dev/null || echo "unknown")

# --- Wrap JSON exactly as C# does (StreamerPrinter.cs lines 85-86) ---

WRAPPED_JSON="window.data = ${JSON_DATA}
window.sourceProgram = 'streamerbot';"

# --- Assemble HTML matching C# line 96 ---
# head + "</div><script>" + json + "</script>" + addons + "\n" + templates + "<div>" + footer

TIMESTAMP=$(date +%Y%m%d%H%M%S%3N)
HTML_FILE="$SP_DIR/temp/${SOURCE}__${TIMESTAMP}.html"
mkdir -p "$SP_DIR/temp"

{
    cat "$SP_DIR/templates/head.html"
    # In continuous mode, override footer spacing and page breaks
    if [[ "$PAGINATED" != true ]]; then
        printf '%s' '<style>.footer_spacing{height:0!important}footer{page-break-after:avoid!important;margin:0!important}</style>'
    fi
    printf '%s' "</div><script>${WRAPPED_JSON}</script>"
    cat "$SP_DIR/addons/addons.html"
    printf '\n'
    cat "$SP_DIR/templates/templates.html"
    printf '%s' "<div>"
    cat "$SP_DIR/templates/foot.html"
} > "$HTML_FILE"

# --- Set up output path ---

EXT="pdf"
if [[ "$IMAGE_MODE" = true ]]; then
    EXT="png"
fi

if [[ -z "$OUTPUT_FILE" ]]; then
    mkdir -p "$PROJECT_ROOT/dev/output"
    OUTPUT_FILE="$PROJECT_ROOT/dev/output/${SOURCE}__${TIMESTAMP}.${EXT}"
else
    # Make absolute if relative
    if [[ "$OUTPUT_FILE" != /* ]]; then
        OUTPUT_FILE="$(pwd)/$OUTPUT_FILE"
    fi
    mkdir -p "$(dirname "$OUTPUT_FILE")"
fi

# --- Convert paths to Windows-style for Wine ---

HTML_WIN=$(to_winpath "$HTML_FILE")
OUTPUT_WIN=$(to_winpath "$OUTPUT_FILE")

# --- Select binary ---

if [[ "$IMAGE_MODE" = true ]]; then
    BINARY="$SP_DIR/bin/wkhtmltoimage.exe"
else
    BINARY="$SP_DIR/bin/wkhtmltopdf.exe"
fi

if [[ ! -f "$BINARY" ]]; then
    echo "Error: Binary not found: $BINARY" >&2
    exit 1
fi

MODE="continuous"
if [[ "$PAGINATED" = true ]]; then
    MODE="paginated"
fi
echo "Rendering ${SOURCE} (${PAPER_SIZE}, ${MODE}, ${EXT})..."

# --- Build Wine command (base flags from StreamerPrinter.cs lines 136-138) ---

WINE_ARGS=("$BINARY")
if [[ "$IMAGE_MODE" = true ]]; then
    # wkhtmltoimage doesn't support PDF-specific flags (-s, --header-spacing, etc.)
    WINE_ARGS+=(
        --load-error-handling ignore
        --debug-javascript
        --enable-javascript
        --enable-local-file-access
        --javascript-delay "$JS_DELAY"
        "$HTML_WIN" "$OUTPUT_WIN"
    )
elif [[ "$PAGINATED" = true ]]; then
    # Exact production flags — fixed page size, multi-page output
    WINE_ARGS+=(
        -s "$PAPER_SIZE"
        --load-error-handling ignore
        --no-background
        --debug-javascript
        --enable-javascript
        --enable-local-file-access
        --javascript-delay "$JS_DELAY"
        --header-spacing -200
        --margin-top 0
        --footer-spacing 50
        "$HTML_WIN" "$OUTPUT_WIN"
    )
else
    # Continuous receipt mode — same width, single tall page (no page breaks)
    PAGE_WIDTH=$(paper_width_mm "$PAPER_SIZE")
    WINE_ARGS+=(
        --page-width "$PAGE_WIDTH"
        --page-height 3276
        --load-error-handling ignore
        --no-background
        --debug-javascript
        --enable-javascript
        --enable-local-file-access
        --javascript-delay "$JS_DELAY"
        --margin-top 0
        --margin-bottom 0
        --margin-left 0
        --margin-right 0
        "$HTML_WIN" "$OUTPUT_WIN"
    )
fi

# Run via Wine, wrapped in xvfb-run if no display
if [[ "$USE_XVFB" = true ]]; then
    # Kill wineserver so it restarts fresh inside xvfb with a virtual display
    wineserver -k 2>/dev/null || true
    xvfb-run --auto-servernum --server-args="-screen 0 1024x768x24" \
        wine "${WINE_ARGS[@]}"
else
    wine "${WINE_ARGS[@]}"
fi

# --- Clean up ---

if [[ "$KEEP_HTML" = true ]]; then
    echo "HTML kept: $HTML_FILE"
else
    rm -f "$HTML_FILE"
fi

# --- Report result ---

if [[ -f "$OUTPUT_FILE" ]]; then
    SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo "Output: $OUTPUT_FILE ($SIZE)"
else
    echo "Warning: Output file was not created. Check Wine output above for errors." >&2
    exit 1
fi
