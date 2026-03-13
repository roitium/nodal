import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  layout("routes/layout.tsx", [
    index("routes/home.tsx"),
    route("profile", "routes/profile.tsx"),
    route("search", "routes/search.tsx"),
    route("settings", "routes/settings.tsx"),
    route("memo/:id", "routes/memo.$id.tsx"),
  ]),
] satisfies RouteConfig;
