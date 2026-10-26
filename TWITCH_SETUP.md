# Twitch setup for CodeCaster

CodeCaster uses a standard Twitch chat bot account (IRC). There is **no Twitch Extension** and no paid Extension hosting.

## 1. Create a bot account

Use a dedicated Twitch account (e.g. `YourChannelCodeCaster`). Enable 2FA on your main account; the bot can be a separate login.

## 2. Get an OAuth token (chat scope)

For local development, the quickest path is [Twitch Token Generator](https://twitchtokengenerator.com/) (third-party) or your own OAuth app:

1. Register an application in the [Twitch Developer Console](https://dev.twitch.tv/console/apps).
2. Request scopes: `chat:read` and `chat:edit`.
3. Complete the OAuth flow and copy the **access token** (often prefixed with `oauth:` for IRC libraries).

For `tmi.js`, the token is usually passed as `oauth:xxxxxxxx` in `TWITCH_TOKEN`.

## 3. Configure `.env`

```env
TWITCH_USERNAME=your_bot_username
TWITCH_TOKEN=oauth:your_token_here
TWITCH_CHANNEL=your_channel_name
```

`TWITCH_CHANNEL` is the channel to join **without** `#`.

## 4. Mod the bot (recommended)

In your channel chat:

```
/mod your_bot_username
```

So the bot can send optional status messages if you extend it later.

## 5. Run the stack

```bash
npm run dev
```

Confirm logs show `[twitch] connected to #yourchannel`. Test in chat:

```
!ship add a fun subtitle under the title
```

## Mock mode (no Twitch)

Leave `TWITCH_*` empty and use:

```bash
npm run simulate
```

Or POST to the bot:

```bash
curl -X POST http://localhost:4000/mock/chat \
  -H 'content-type: application/json' \
  -d '{"message":"!ship hello from curl"}'
```

## Production notes

- Run bot/agent behind HTTPS if the overlay is loaded from OBS on another machine; set overlay query `?bot=https://your-bot.example`.
- Rotate tokens if leaked; never commit `.env`.
- Stay within Twitch TOS and OpenAI usage policies; patches are capped to one file and ~50 lines for safety.
