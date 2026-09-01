import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { healthHandler } from "./routes/health.js";
import { evaluateRouter } from "./routes/evaluate.js";

const app = express();

app.use(cors());

app.get("/api/health", healthHandler);
app.use("/api", evaluateRouter);

app.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);
  console.log(`Gemini model: ${config.geminiModel}`);
});
