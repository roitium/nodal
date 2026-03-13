import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import devtoolsJson from "vite-plugin-devtools-json";
import { VitePWA } from "vite-plugin-pwa";

const AVATAR_PATH_PATTERN =
  /(avatar|avatars|profile|profiles|user-avatar|headshot)/i;

export default defineConfig({
  plugins: [
    devtoolsJson(),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            // Cache avatar-like image requests between page reloads.
            urlPattern: ({ request, url }) =>
              request.destination === "image" &&
              AVATAR_PATH_PATTERN.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "nodal-image-cache-v1",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: "Nodal",
        short_name: "Nodal",
        description: "Capture your thoughts, anywhere, anytime.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
