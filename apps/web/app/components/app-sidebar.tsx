import { Link, useLocation, useNavigate } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { useUser } from "~/hooks/queries/use-user";
import {
  Home,
  Compass,
  Search,
  Settings,
  LogOut,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { Heatmap } from "~/components/heatmap";

export function AppSidebar() {
  const { data: user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const { t } = useTranslation();

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    closeMobileSidebar();
    navigate("/login");
  };

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return (
      location.pathname === href || location.pathname.startsWith(`${href}/`)
    );
  };

  return (
    <Sidebar className="bg-transparent">
      <SidebarHeader className="p-4 pb-2">
        <div className="surface-card interactive-lift flex items-center gap-2.5 rounded-xl px-3 py-2.5">
          <img
            src="/icon.png"
            alt="Nodal Logo"
            className="h-8 w-8 rounded-md object-cover pulse-halo"
          />
          <span className="app-heading text-lg font-semibold tracking-tight">
            Nodal
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col justify-between">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {user && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/")}>
                    <Link to="/" onClick={closeMobileSidebar}>
                      <Home className="h-4 w-4" />
                      <span>{t("sidebar.timeline")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/explore")}>
                  <Link to="/explore" onClick={closeMobileSidebar}>
                    <Compass className="h-4 w-4" />
                    <span>{t("sidebar.explore")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/search")}>
                  <Link to="/search" onClick={closeMobileSidebar}>
                    <Search className="h-4 w-4" />
                    <span>{t("sidebar.search")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings")}>
                  <Link to="/settings" onClick={closeMobileSidebar}>
                    <Settings className="h-4 w-4" />
                    <span>{t("sidebar.settings")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <div className="mt-auto pb-4">
            <Heatmap />
          </div>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="interactive-lift touch-target flex w-full items-center gap-3 rounded-lg border border-transparent p-2.5 text-left outline-none hover:bg-sidebar-accent">
                <Avatar className="h-8 w-8 ring-1 ring-border/70">
                  <AvatarImage src={user.avatarUrl ?? undefined} />
                  <AvatarFallback>
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm">
                  <span className="font-medium leading-none">
                    {user.displayName || user.username}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    @{user.username}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem asChild>
                <Link to="/profile" onClick={closeMobileSidebar}>
                  <UserRound className="mr-2 h-4 w-4" />
                  {t("sidebar.profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("sidebar.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SidebarMenuButton asChild>
            <Link to="/login" onClick={closeMobileSidebar}>
              {t("sidebar.login")}
            </Link>
          </SidebarMenuButton>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
