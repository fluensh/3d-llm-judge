import type { Request, Response } from "express";
import { config } from "../config.js";

export function healthHandler(_req: Request, res: Response): void {
  res.json({
    status: "ok",
    model: config.geminiModel,
  });
}
