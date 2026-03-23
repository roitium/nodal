import { Outlet, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminSidebar } from "~/components/admin-sidebar";
import { SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { client } from "~/lib/rpc";

export default function AdminLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const hasToken =
    typeof window !== "undefined" && !!localStorage.getItem("token");

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const response = await client.api.v1.auth.me.$get();
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to fetch user");
      }
      return data.data;
    },
    enabled: hasToken,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (isLoading) {
      return;
    }

    if (error) {
      localStorage.removeItem("token");
      navigate("/login", { replace: true });
      return;
    }

    if (user !== undefined && user !== null) {
      if (!user.isAdmin) {
        navigate("/", { replace: true });
        return;
      }
      setIsCheckingAuth(false);
    }
  }, [navigate, user, isLoading, error]);

  if (isCheckingAuth || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">{t("admin.loading")}</span>
        </div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null;
  }

  return (
    <SidebarProvider className="bg-transparent">
      <AdminSidebar />
      <main className="relative flex-1 min-h-svh">
        <header
          className="fixed top-0 z-20 flex h-14 w-full items-center border-b border-border/70 bg-background/88 px-3 backdrop-blur-xl supports-backdrop-filter:bg-background/65 md:px-4 lg:w-[calc(100%-var(--sidebar-width))]"
        >
          <SidebarTrigger className="touch-target rounded-lg transition-colors hover:bg-accent/80" />
        </header>
        <div className="mx-auto mt-14 w-full max-w-5xl px-3 pb-24 pt-4 sm:px-4 md:px-6 md:pt-6">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}