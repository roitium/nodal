import { Link, useNavigate } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { useUser } from "~/hooks/queries/use-user";
import { Home, Search, Settings, LogOut, Download, UserRound } from "lucide-react";
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

export function AppSidebar() {
  const { data: user } = useUser();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
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
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/">
                    <Home className="w-4 h-4" />
                    <span>{t("sidebar.home")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/search">
                    <Search className="w-4 h-4" />
                    <span>{t("sidebar.search")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/settings">
                    <Settings className="w-4 h-4" />
                    <span>{t("sidebar.settings")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <div className="mt-auto pb-4">
          <Heatmap />
        </div>
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
                <Link to="/profile">
                  <UserRound className="w-4 h-4 mr-2" />
                  {t("sidebar.profile")}
                </Link>
              </DropdownMenuItem>
              {!isInstalled && isInstallable && (
                <DropdownMenuItem onClick={promptInstall}>
                  <Download className="w-4 h-4 mr-2" />
                  {t("sidebar.installApp")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                {t("sidebar.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SidebarMenuButton asChild>
            <Link to="/login">{t("sidebar.login")}</Link>
          </SidebarMenuButton>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
