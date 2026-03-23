import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    babel({
      filter: /\.[jt]sx?$/,
      babelConfig: {
        presets: ["@babel/preset-typescript"],
        plugins: [
          [
            "babel-plugin-react-compiler",
            {
              logLevel: "verbose",
            },
          ],
        ],
      },
    }),
    tsconfigPaths(),
    VitePWA({
      registerType: "prompt",
      devOptions: {
        enabled: true,
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,ico,png,svg,webmanifest}"],
        navigateFallback: "/",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Cache avatar-like image requests between page reloads.
            urlPattern: ({ request, url }) =>
              request.destination === "image" &&
              /(avatar|avatars|profile|profiles|user-avatar|headshot)/i.test(
                url.pathname,
              ),
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
        id: "/",
        name: "Nodal",
        short_name: "Nodal",
        description: "Capture your thoughts, anywhere, anytime.",
        lang: "zh-CN",
        start_url: "/",
        scope: "/",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        display_override: ["standalone", "browser"],
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
