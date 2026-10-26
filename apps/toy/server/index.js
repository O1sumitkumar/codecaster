import cors from "cors";
import express from "express";

const port = Number(process.env.TOY_API_PORT) || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "toy-api" });
});

app.get("/api/smoke", (_req, res) => {
  res.json({ ok: true, message: "toy smoke check passed" });
});

app.listen(port, () => {
  console.log(`[toy-api] listening on http://localhost:${port}`);
});
