import { Outlet, useNavigate, useLocation, useNavigation } from "react-router";
import { SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/app-sidebar";
import { useEffect, useRef, useLayoutEffect } from "react";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && location.pathname === "/") {
      navigate("/explore", { replace: true });
      return;
    }

    if (!token && location.pathname === "/profile") {
      navigate("/login", { replace: true });
    }
  }, [navigate, location.pathname]);

  useLayoutEffect(() => {
    if (!document.startViewTransition) return;
    if (previousPath.current === location.pathname) return;

    const transition = document.startViewTransition(() => {
      previousPath.current = location.pathname;
    });

    return () => {
      transition?.finished.catch(() => {});
    };
  }, [location.pathname]);

  return (
    <SidebarProvider className="bg-transparent">
      <AppSidebar />
      <main className="relative flex-1 min-h-svh">
        <header
          className="fixed top-0 z-20 flex h-14 w-full items-center border-b border-border/70 bg-background/88 px-3 backdrop-blur-xl supports-backdrop-filter:bg-background/65 md:px-4 lg:w-[calc(100%-var(--sidebar-width))]"
          style={{ viewTransitionName: "main-header" }}
        >
          <SidebarTrigger className="touch-target rounded-lg transition-colors hover:bg-accent/80" />
        </header>
        <div className="mx-auto mt-14 w-full max-w-[52rem] px-3 pb-24 pt-4 sm:px-4 md:px-6 md:pt-6">
          <div className="page-reveal" style={{ viewTransitionName: "page-content" }}>
            <Outlet />
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}
