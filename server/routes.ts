import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Config endpoint to provide Supabase credentials at runtime
  // This is needed because Vite embeds env vars at build time,
  // which doesn't work reliably in Replit's production deployment
  app.get("/api/config", (_req, res) => {
    res.json({
      supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    });
  });

  return httpServer;
}
