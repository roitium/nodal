import { Outlet, useNavigate, useLocation } from "react-router";
import { SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/app-sidebar";
import { useEffect } from "react";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 min-h-screen relative">
        <header className="h-14 border-b flex items-center px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 fixed top-0 w-full lg:w-[calc(100%-var(--sidebar-width))]">
          <SidebarTrigger />
        </header>
        <div className="max-w-3xl mx-auto w-full p-4 md:p-6 pb-24 mt-14">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
