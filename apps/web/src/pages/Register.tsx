import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthResponse } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const data = await apiFetch<AuthResponse>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });
      login(data.token, data.user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Registration failed");
      } else {
        setError("Registration failed");
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center py-12">
      <Card className="w-87.5">
        <CardHeader>
          <CardTitle>Register</CardTitle>
          <CardDescription>Create a new account.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Input
                  id="username"
                  placeholder="Username (3-30 chars)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={30}
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Input
                  id="password"
                  type="password"
                  placeholder="Password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-4">
            <Button className="w-full" type="submit">
              Register
            </Button>
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="underline text-slate-900">
                Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
