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
    route("explore", "routes/explore.tsx"),
    route("resources", "routes/resources.tsx"),
    route("u/:username", "routes/user.$username.tsx"),
    route("profile", "routes/profile.tsx"),
    route("search", "routes/search.tsx"),
    route("settings", "routes/settings.tsx"),
    route("memo/:id", "routes/memo.$id.tsx"),
  ]),
  layout("routes/admin.layout.tsx", [
    route("admin", "routes/admin.index.tsx"),
    route("admin/users", "routes/admin.users.tsx"),
  ]),
] satisfies RouteConfig;
