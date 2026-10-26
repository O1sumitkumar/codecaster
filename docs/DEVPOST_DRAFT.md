# CodeCaster — Devpost draft

**Project name:** CodeCaster  

**Tagline:** Let Twitch chat ship code — safely, live, with one-click Accept/Reject.

**Repo:** https://github.com/O1sumitkumar/codecaster  

**YouTube demo:** TODO  

**Codex session:** TODO (set `CODEX_SESSION_ID` locally; do not publish session IDs)

## Inspiration

Live coding is entertaining, but unconstrained AI edits are risky on stream. We wanted chat participation without handing viewers the keys to the repo.

## What it does

Viewers type `!ship <instruction>` or `!fix <instruction>` in Twitch chat. A Node bot listens on IRC, queues one job at a time, and rate-limits per user. The agent copies a small React + Express toy app into a sandbox, asks Codex/OpenAI for a **single-file unified diff** (hard cap ~50 lines), validates it, applies it in the sandbox, and runs a smoke test. An OBS Browser Source overlay shows the command, diff summary, and green/red status. The streamer **Accepts** to apply the patch to the real toy app or **Rejects** to discard the sandbox.

## How we built it

- npm workspaces monorepo: `apps/toy`, `apps/bot`, `apps/agent`, `apps/overlay`
- `tmi.js` for Twitch IRC, `ws` for overlay updates, Express APIs between bot and agent
- Mock paths when `TWITCH_*` or `OPENAI_API_KEY` are unset so judges can run `npm run simulate`
- No Twitch Extension — free-tier friendly

## Challenges

Keeping patches small and safe, serializing jobs so the overlay never fights concurrent sandboxes, and making mock mode fully green in CI without real API keys.

## Accomplishments

End-to-end MVP: chat command → sandbox patch → smoke test → streamer gate → optional apply to toy app.

## What we learned

Human-in-the-loop deploy gates matter for audience-driven code. Hard limits (one file, line budget) make live LLM edits tractable.

## What's next

Richer diff previews, configurable caps, cloud sandbox runners, and tighter Codex session integration for the TwitchCon track.
