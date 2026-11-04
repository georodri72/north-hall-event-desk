"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DESK } from "@/lib/catalog";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) {
      setError(body?.message || "Sign-in failed.");
      setPending(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-sm ring-1 ring-foreground/10">
        <p className="text-xs font-semibold tracking-[0.18em] text-brass uppercase">{DESK.property}</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">Event desk</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          The room calendar for production, catering, and facilities. Holds include setup and teardown.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? (
            <p role="alert" className="text-base font-medium text-clay">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-6 rounded-xl bg-muted px-4 py-3">
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Demo account</p>
          <p className="mt-1 text-base">
            {DESK.demoEmail}
            <br />
            {DESK.demoPassword}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => {
              setEmail(DESK.demoEmail);
              setPassword(DESK.demoPassword);
            }}
          >
            Fill demo account
          </Button>
        </div>
      </div>
    </div>
  );
}
