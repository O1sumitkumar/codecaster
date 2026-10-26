# CodeCaster

**Twitch chat → sandboxed patch → OBS overlay → streamer Accept/Reject.**

Viewers type `!ship <instruction>` or `!fix <instruction>` in chat. The bot queues one job at a time, the agent copies the toy app into a temp sandbox, generates a **single-file (~50 line max)** unified diff (OpenAI or mock fixtures), runs a smoke test, and broadcasts results to the OBS Browser Source overlay. **Nothing lands in the real toy app until the streamer clicks Accept**; Reject (or timeout) deletes the sandbox.

Built for [Codex × TwitchCon](https://twitchcon-codex.devpost.com/) — entrant **Sumit Jha / O1sumitkumar**.

## Monorepo layout

| Workspace | Role |
|-----------|------|
| `apps/toy` | React + Vite UI + Express API (the on-stream toy app) |
| `apps/bot` | Twitch IRC (`tmi.js`), HTTP API, WebSocket fan-out, job queue, rate limits |
| `apps/agent` | Sandbox copy → LLM diff → validate → `git apply` → smoke test |
| `apps/overlay` | Static OBS Browser Source UI |

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

- Toy UI: http://localhost:5173  
- Bot + overlay: http://localhost:4000/overlay/  
- Agent: http://localhost:4001  

### Simulate without Twitch

With `npm run dev` running (or bot + agent only for a minimal path):

```bash
npm run simulate
```

This posts a mock `!ship` command, expects a **green** smoke result, and Accepts the patch.

### Tests

```bash
npm test
```

## Environment

See `.env.example`. Highlights:

- **Twitch**: `TWITCH_USERNAME`, `TWITCH_TOKEN`, `TWITCH_CHANNEL` — if unset, the bot stays in mock mode (`/mock/chat` + `npm run simulate`).
- **OpenAI**: `OPENAI_API_KEY` — if unset, the agent uses checked-in mock diffs.
- **Codex**: `CODEX_SESSION_ID` placeholder for your Codex session (do not commit real values).

Twitch connection details: [TWITCH_SETUP.md](./TWITCH_SETUP.md).

## OBS overlay

1. Add a **Browser Source** pointing at `http://localhost:4000/overlay/` (or your public bot URL with `?bot=https://...`).
2. Size ~450×400; transparent background is supported.
3. Use **Accept** / **Reject** when a job shows green status.

## Commands

| Chat command | Meaning |
|--------------|---------|
| `!ship <text>` | Feature / improvement request |
| `!fix <text>` | Bugfix request |

Per-user rate limit defaults: **3 commands / 60s**.

## License

MIT — hackathon MVP.
