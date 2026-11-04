"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SETUP_STYLES, styleLabel } from "@/lib/catalog";
import { supportedStyles, type RoomDTO } from "@/lib/model";

type Draft = {
  id?: string;
  name: string;
  floor: string;
  summary: string;
  builtInAv: string;
  capacities: Record<string, string>;
};

function emptyDraft(): Draft {
  return { name: "", floor: "", summary: "", builtInAv: "", capacities: {} };
}

function fromRoom(room: RoomDTO): Draft {
  const capacities: Record<string, string> = {};
  for (const style of supportedStyles(room)) capacities[style] = String(room.capacities[style]);
  return {
    id: room.id,
    name: room.name,
    floor: room.floor,
    summary: room.summary,
    builtInAv: room.builtInAv,
    capacities,
  };
}

export function RoomsManager({ rooms }: { rooms: RoomDTO[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    if (!draft) return;
    setPending(true);
    setError("");
    const capacities: Record<string, number | ""> = {};
    for (const style of SETUP_STYLES) {
      const raw = draft.capacities[style.id]?.trim() ?? "";
      capacities[style.id] = raw === "" ? "" : Number(raw);
    }
    const response = await fetch(draft.id ? `/api/rooms/${draft.id}` : "/api/rooms", {
      method: draft.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name,
        floor: draft.floor,
        summary: draft.summary,
        builtInAv: draft.builtInAv,
        capacities,
      }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.message || "The room was not saved.");
      setPending(false);
      return;
    }
    setDraft(null);
    setPending(false);
    router.refresh();
  }

  async function remove() {
    if (!draft?.id) return;
    setPending(true);
    const response = await fetch(`/api/rooms/${draft.id}`, { method: "DELETE" });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.message || "The room was not deleted.");
      setConfirmDelete(false);
      setPending(false);
      return;
    }
    setConfirmDelete(false);
    setDraft(null);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">Rooms</h1>
          <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
            {rooms.length} rooms. Capacity is by setup style. Leave a style blank if the room is not set that way.
          </p>
        </div>
        <Button type="button" onClick={() => { setError(""); setDraft(emptyDraft()); }}>
          Add a room
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => (
          <article key={room.id} className="flex flex-col rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">{room.name}</h2>
                <p className="text-muted-foreground">{room.floor}</p>
              </div>
              <Button type="button" variant="outline" onClick={() => { setError(""); setDraft(fromRoom(room)); }}>
                Edit
              </Button>
            </div>
            <p className="mt-3 text-base">{room.summary}</p>
            <p className="mt-3 text-sm font-semibold tracking-wide text-brass uppercase">Setups</p>
            <ul className="mt-1 space-y-1">
              {supportedStyles(room).map((style) => (
                <li key={style}>
                  {styleLabel(style)} · {room.capacities[style]}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">House: {room.builtInAv}</p>
          </article>
        ))}
      </div>

      <Dialog open={Boolean(draft) && !confirmDelete} onOpenChange={(open) => { if (!open) setDraft(null); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{draft?.id ? "Edit room" : "Add a room"}</DialogTitle>
            <DialogDescription>Name, floor, and at least one setup capacity.</DialogDescription>
          </DialogHeader>
          {draft ? (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label htmlFor="room-name">Name</Label>
                <Input id="room-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-floor">Floor or area</Label>
                <Input id="room-floor" value={draft.floor} onChange={(event) => setDraft({ ...draft, floor: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-summary">Summary</Label>
                <Textarea id="room-summary" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-av">House equipment</Label>
                <Textarea id="room-av" value={draft.builtInAv} onChange={(event) => setDraft({ ...draft, builtInAv: event.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {SETUP_STYLES.map((style) => (
                  <div key={style.id} className="space-y-1">
                    <Label htmlFor={`cap-${style.id}`}>{style.label} capacity</Label>
                    <Input
                      id={`cap-${style.id}`}
                      inputMode="numeric"
                      placeholder="Not offered"
                      value={draft.capacities[style.id] ?? ""}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          capacities: { ...draft.capacities, [style.id]: event.target.value },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              {error ? <p className="font-medium text-clay">{error}</p> : null}
            </div>
          ) : null}
          <DialogFooter>
            {draft?.id ? (
              <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            ) : null}
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {draft?.name}?</DialogTitle>
            <DialogDescription>Rooms with events on the books cannot be deleted.</DialogDescription>
          </DialogHeader>
          {error ? <p className="font-medium text-clay">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
              Delete room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
