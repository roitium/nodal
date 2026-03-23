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
  Settings,
  Users,
  LayoutDashboard,
  LogOut,
  ArrowLeft,
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

export function AdminSidebar() {
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

  const handleBackToApp = () => {
    closeMobileSidebar();
    navigate("/");
  };

  const isActive = (href: string) => {
    if (href === "/admin") return location.pathname === "/admin";
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
            className="h-8 w-8 rounded-md object-cover"
          />
          <span className="app-heading text-lg font-semibold tracking-tight">
            Admin
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col justify-between">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin")}>
                  <Link to="/admin" onClick={closeMobileSidebar}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{t("admin.dashboard", "Dashboard")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/settings")}>
                  <Link to="/admin/settings" onClick={closeMobileSidebar}>
                    <Settings className="h-4 w-4" />
                    <span>{t("admin.settings", "Settings")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/users")}>
                  <Link to="/admin/users" onClick={closeMobileSidebar}>
                    <Users className="h-4 w-4" />
                    <span>{t("admin.users", "Users")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
              <DropdownMenuItem onClick={handleBackToApp}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("admin.backToApp", "Back to App")}
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