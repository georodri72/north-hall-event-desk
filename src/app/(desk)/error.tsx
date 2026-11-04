"use client";

import { Button } from "@/components/ui/button";

export default function DeskError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-xl bg-card p-8 ring-1 ring-foreground/10">
      <h1 className="font-serif text-3xl">The desk hit a snag</h1>
      <p className="mt-3 text-lg text-muted-foreground">{error.message || "Try that again."}</p>
      <Button className="mt-6" type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
