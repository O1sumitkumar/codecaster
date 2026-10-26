import { WebSocketServer } from "ws";

export function createBroadcaster(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = new Set();

  wss.on("connection", (socket) => {
    clients.add(socket);
    socket.on("close", () => clients.delete(socket));
  });

  function broadcast(payload) {
    const data = JSON.stringify(payload);
    for (const client of clients) {
      if (client.readyState === 1) {
        client.send(data);
      }
    }
  }

  return { broadcast };
}
