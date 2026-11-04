"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { DESK } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Calendar" },
  { href: "/rooms", label: "Rooms" },
  { href: "/history", label: "History" },
];

export function DeskShell({
  name,
  title,
  children,
}: {
  name: string;
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-6">
          <Link href="/" className="leading-none">
            <span className="font-serif text-3xl tracking-tight text-foreground">{DESK.short}</span>
            <span className="mt-1 block text-xs font-semibold tracking-[0.18em] text-brass uppercase">
              {DESK.product}
            </span>
          </Link>
          <nav className="flex flex-wrap gap-1">
            {links.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-lg font-semibold",
                    active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right leading-tight">
              <div className="font-semibold">{name}</div>
              <div className="text-sm text-muted-foreground">{title}</div>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
