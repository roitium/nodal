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
import { Home, Compass, Settings, LogOut, Download, UserRound } from "lucide-react";
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
import { usePWAInstall } from "~/hooks/use-pwa-install";
import { toast } from "sonner";

export function AppSidebar() {
  const { data: user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const { t } = useTranslation();
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const canShowInstallAction = !isInstalled;

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleInstallClick = () => {
    if (isInstallable) {
      void promptInstall();
      return;
    }

    toast.message(t("pwa.installHintTitle"), {
      description: isIOS
        ? t("pwa.installHintDesc")
        : t("pwa.installUnavailableDesc"),
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    closeMobileSidebar();
    navigate("/login");
  };

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src="/icon.png" alt="Nodal Logo" className="w-8 h-8 rounded-md object-cover" />
          <span className="font-semibold text-lg tracking-tight">Nodal</span>
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
                      <Home className="w-4 h-4" />
                      <span>{t("sidebar.timeline")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/explore")}>
                  <Link to="/explore" onClick={closeMobileSidebar}>
                    <Compass className="w-4 h-4" />
                    <span>{t("sidebar.explore")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {canShowInstallAction && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleInstallClick}>
                    <Download className="w-4 h-4" />
                    <span>{t("sidebar.installApp")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings")}>
                  <Link to="/settings" onClick={closeMobileSidebar}>
                    <Settings className="w-4 h-4" />
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
              <button className="flex items-center gap-3 w-full hover:bg-sidebar-accent p-2 rounded-md transition-colors outline-none">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm">
                  <span className="font-medium leading-none">{user.displayName || user.username}</span>
                  <span className="text-xs text-muted-foreground mt-1">@{user.username}</span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem asChild>
                <Link to="/profile" onClick={closeMobileSidebar}>
                  <UserRound className="w-4 h-4 mr-2" />
                  {t("sidebar.profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                {t("sidebar.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SidebarMenuButton asChild>
            <Link to="/login" onClick={closeMobileSidebar}>{t("sidebar.login")}</Link>
          </SidebarMenuButton>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
