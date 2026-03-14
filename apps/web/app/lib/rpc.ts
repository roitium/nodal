import { hc } from "hono/client";
import type { AppType } from "../../../backend-hono/src/index";
import { webEnv } from "./env";

export const API_BASE_URL = webEnv.API_BASE_URL;

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
