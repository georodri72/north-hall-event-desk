import { redirect } from "next/navigation";
import { DeskShell } from "@/components/desk-shell";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect("/login");
  return (
    <DeskShell name={session.name} title={session.title}>
      {children}
    </DeskShell>
  );
}
