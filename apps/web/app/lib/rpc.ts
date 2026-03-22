import { hc } from "hono/client";
import type { AppType } from "../../../backend-hono/src/index";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8787/api/v1";

const RPC_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

export const client = hc<AppType>(RPC_BASE_URL, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const token = localStorage.getItem("token");

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(input, { ...init, headers });
  },
});
