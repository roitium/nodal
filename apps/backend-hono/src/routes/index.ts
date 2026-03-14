import { Hono } from "hono";
import { authRoutes } from "@/routes/auth";
import { memosRoutes } from "@/routes/memos";
import { proxyRoutes } from "@/routes/proxy";
import { resourcesRoutes } from "@/routes/resources";
import type { CloudflareBindings } from "@/types/env";

export const apiRoutes = new Hono<{ Bindings: CloudflareBindings }>()
  .route("/auth", authRoutes)
  .route("/memos", memosRoutes)
  .route("/resources", resourcesRoutes)
  .route("/proxy", proxyRoutes);
