import { Hono } from "hono";
import { cors } from "hono/cors";
import type {} from "@/types/hono";
import { authMiddleware } from "@/middleware/auth";
import { dbMiddleware } from "@/middleware/db";
import { envMiddleware } from "@/middleware/env";
import { subdomainMiddleware } from "@/middleware/subdomain";
import { traceIdMiddleware } from "@/middleware/trace";
import { authRoutes } from "@/routes/auth";
import { memosRoutes } from "@/routes/memos";
import { proxyRoutes } from "@/routes/proxy";
import { resourcesRoutes } from "@/routes/resources";
import type { Env } from "@/types/env";
import { GeneralCode } from "@/utils/code";
import { fail } from "@/utils/response";

const app = new Hono<{ Bindings: Env }>();

// CORS 配置
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  }),
);

app.use("*", traceIdMiddleware);
app.use("/api/v1/*", envMiddleware);
app.use("/api/v1/*", dbMiddleware);
app.use("/api/v1/*", authMiddleware);
app.use("/api/v1/*", subdomainMiddleware);

const route = app
  .route("/api/v1/auth", authRoutes)
  .route("/api/v1/memos", memosRoutes)
  .route("/api/v1/resources", resourcesRoutes)
  .route("/api/v1/proxy", proxyRoutes);

app.onError((error, c) => {
  const traceId = c.get("traceId");
  console.error(`traceId: ${traceId}`, error);

  return c.json(
    fail({
      message: "服务器内部错误",
      traceId,
      code: GeneralCode.InternalError,
    }),
    500,
  );
});

app.get("/", (c) => c.text("Nodal Hono API is running"));

export type AppType = typeof route;
export default app;
