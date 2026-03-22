import type { MiddlewareHandler } from "hono";
import type { CloudflareBindings } from "@/types/env";

export const subdomainMiddleware: MiddlewareHandler<{
  Bindings: CloudflareBindings;
}> = async (c, next) => {
  const env = c.get("env");
  const rootDomain = env.ROOT_DOMAIN;
  const host = c.req.header("host");

  // ROOT_DOMAIN may be missing in local/dev env. In that case, disable tenant parsing.
  if (!rootDomain) {
    c.set("tenant", null);
    return next();
  }

  const hostWithoutPort = host?.split(":")[0];
  const cleanedRootDomain = rootDomain
    .replace("http://", "")
    .replace("https://", "")
    .split(":")[0];

  if (
    !hostWithoutPort ||
    hostWithoutPort === cleanedRootDomain ||
    hostWithoutPort.startsWith("www.")
  ) {
    c.set("tenant", null);
    return next();
  }

  if (!hostWithoutPort.endsWith(`.${cleanedRootDomain}`)) {
    c.set("tenant", null);
    return next();
  }

  const subdomain = hostWithoutPort.replace(`.${cleanedRootDomain}`, "");
  c.set("tenant", subdomain || null);
  await next();
};
