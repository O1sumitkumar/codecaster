import tmi from "tmi.js";

const COMMAND_RE = /^!(ship|fix)\s+(.+)/i;

export function createTwitchClient({ onCommand, logger = console }) {
  const username = process.env.TWITCH_USERNAME;
  const token = process.env.TWITCH_TOKEN;
  const channel = process.env.TWITCH_CHANNEL;

  if (!username || !token || !channel) {
    logger.info("[twitch] TWITCH_* unset — mock mode (use npm run simulate)");
    return {
      connect() {},
      disconnect() {},
      isMock: true,
    };
  }

  const client = new tmi.Client({
    options: { debug: false },
    connection: { secure: true, reconnect: true },
    identity: { username, password: token },
    channels: [channel.replace(/^#/, "")],
  });

  client.on("message", (chan, tags, message, self) => {
    if (self) return;
    const match = message.trim().match(COMMAND_RE);
    if (!match) return;
    const kind = match[1].toLowerCase();
    const instruction = match[2].trim();
    onCommand({
      kind,
      instruction,
      user: tags["display-name"] || tags.username || "viewer",
      userId: tags["user-id"] || tags.username || "unknown",
      channel: chan,
    });
  });

  return {
    isMock: false,
    async connect() {
      await client.connect();
      logger.info(`[twitch] connected to #${channel.replace(/^#/, "")}`);
    },
    disconnect() {
      client.disconnect();
    },
  };
}

export function parseChatCommand(text) {
  const match = String(text).trim().match(COMMAND_RE);
  if (!match) return null;
  return {
    kind: match[1].toLowerCase(),
    instruction: match[2].trim(),
  };
}
