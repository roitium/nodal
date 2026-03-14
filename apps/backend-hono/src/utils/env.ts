import type { CloudflareBindings } from "@/types/env";

export function getEnv(
  bindings: Partial<CloudflareBindings> | undefined,
  key: keyof CloudflareBindings,
): string | undefined {
  const fromBindings = bindings?.[key];
  if (typeof fromBindings === "string" && fromBindings.length > 0) {
    return fromBindings;
  }

  const maybeProcess = (
    globalThis as { process?: { env?: Record<string, string> } }
  ).process;
  const fromProcess = maybeProcess?.env?.[key];

  if (typeof fromProcess === "string" && fromProcess.length > 0) {
    return fromProcess;
  }

  return undefined;
}
