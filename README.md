# Streamer Printer

Part of **teotools**, a collection of tools by Twitch streamer [dj_teo](https://www.twitch.tv/dj_teo).

A [Streamer.bot](https://streamer.bot/) add-on that prints receipt-style summaries of Twitch events on a physical thermal printer.

When a sub, gift sub, raid, cheer, tip, or other event fires, the add-on renders an HTML receipt using [Swig](https://node-swig.github.io/swig-templates/) templates, converts it to PDF via `wkhtmltopdf`, and sends it to a printer.

## Supported Events

| Event | Sample |
|---|---|
| Subscription | `sub.json` |
| Resub | `resub.json` |
| Gift Sub | `gift-sub.json` |
| Gift Bomb | `gift-bomb.json` |
| Raid | `raid.json` |
| Cheer | `cheer.json` |
| Follow | `follow.json` |
| Tip (StreamElements) | `streamelements-tip.json` |
| Tip (Streamlabs) | `streamlabs-tip.json` |
| Fortune | `fortune.json` |
| Print Text | `print-text.json` |

## Addons

Optional modules that add extra content to receipts:

- **Special Events** — holiday/seasonal messages
- **Fortunes** — random fortune cookie messages
- **Valentines Quotes** — Valentine's Day themed quotes
- **April Fools** — AI-generated fake receipt items

## Installation

Run `install.bat` from the repo root. It creates a junction link from `dist/teotools` into Streamer.bot's expected directory.

## Local Dev (Linux)

Render sample receipts locally using Wine + `wkhtmltopdf.exe`:

```bash
# Install prerequisites (Ubuntu)
make setup

# Render a single event
make sub
make cheer
make streamelements-tip

# Render all events
make all

# Options
make sub PAGINATED=1   # fixed page size (matches production)
make sub IMG=1          # output PNG instead of PDF
make sub SIZE=A5        # custom paper size
make sub KEEP=1         # keep intermediate HTML for debugging

# Clean output
make clean
```

Output goes to `dev/output/`.

## Project Structure

```
dist/teotools/streamerprinter/
  js/template.js          # main rendering logic & addon system
  templates/              # Swig HTML templates
  addons/                 # optional addon modules
src/StreamerPrinter.cs    # C# source (HTML assembly, PDF generation, printing)
dev/
  test-render.sh          # local rendering script (Wine + wkhtmltopdf)
  samples/                # sample JSON payloads for each event type
  output/                 # rendered output (gitignored)
```
