const DEFAULT_API_BASE_URL = "http://127.0.0.1:8787/api/v1";

function readPublicEnv(key: "VITE_API_BASE_URL" | "VITE_API_URL") {
  const value = import.meta.env[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const webEnv = Object.freeze({
  API_BASE_URL:
    readPublicEnv("VITE_API_BASE_URL") ??
    readPublicEnv("VITE_API_URL") ??
    DEFAULT_API_BASE_URL,
});
