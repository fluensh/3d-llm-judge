import type { Request, Response } from "express";
import { providers } from "../services/providers/index.js";

export function healthHandler(_req: Request, res: Response): void {
  res.json({
    status: "ok",
    providers: providers.map((p) => ({
      id: p.id,
      label: p.label,
      model: p.model,
      configured: p.isConfigured(),
    })),
  });
}
