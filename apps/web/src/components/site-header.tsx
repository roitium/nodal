import { Link } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function SiteHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-14 items-center px-4 md:px-8">
        <div className="mr-4 flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              Nodal
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              to="/"
              className="transition-colors hover:text-slate-900/80 text-slate-900"
            >
              Timeline
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage src={user.avatarUrl} alt={user.username} />
                    <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden md:block">{user.displayName || user.username}</span>
              </div>
              <Button variant="ghost" onClick={logout}>
                Log out
              </Button>
            </div>
          ) : (
            <nav className="flex items-center space-x-2">
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/register">
                <Button>Register</Button>
              </Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
