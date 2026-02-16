# April Fools AI Mode — Claude API Setup

The April Fools addon can optionally use the Claude API to generate contextual, funny receipt items based on the tipper's username and message instead of picking from a static list.

## Getting an API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Navigate to **API Keys** and create a new key
4. Copy the key (starts with `sk-ant-`)

## Saving the Key

Save your API key to this file:

```
dist/teotools/streamerprinter/.claude-api-key
```

The file should contain just the key on a single line, nothing else. This file is gitignored and will not be committed.

A `.claude-api-key.example` placeholder file is included for reference.

## Customizing the Prompt

Edit `addons/april-fools-prompt.txt` to change how Claude generates item names. The following placeholders are replaced at runtime:

- `{username}` — the tipper's display name
- `{amount}` — the tip amount (e.g. `15.00`)
- `{message}` — the tipper's message
- `{numItems}` — number of items to generate

The prompt must instruct Claude to return a JSON array of strings.

## Enabling AI Mode

### In Streamer.bot

Add `"aprilFoolsAI": true` to the arguments passed to the streamer printer action.

### For Local Dev Testing

Use the `aprilfools-ai` sample which has the flag set:

```bash
make aprilfools-ai
```

## Cost

Uses `claude-haiku-4-5-20251001` (the cheapest/fastest model). Estimated cost is ~$0.001 per receipt.

## Fallback Behavior

AI mode falls back to random items from the static list when:

- No `.claude-api-key` file exists
- The key is the placeholder value (`YOUR_CLAUDE_API_KEY_HERE`)
- The API call fails for any reason (network error, invalid key, timeout, etc.)
- The `aprilFoolsAI` flag is not set to `true`

No errors are shown to the viewer — the receipt simply uses random items instead.
