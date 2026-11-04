"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { AV_CATALOG, MEAL_TYPES, SETUP_STYLES, styleLabel } from "@/lib/catalog";
import {
  conflictMessage,
  styleCapacity,
  supportedStyles,
  type BookingDTO,
  type CateringItem,
  type ConflictHit,
  type RoomDTO,
  type Warnings,
} from "@/lib/model";
import { parseHHMM, toHHMM } from "@/lib/time";

type FormState = {
  eventName: string;
  organization: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  onsiteName: string;
  onsitePhone: string;
  onsiteEmail: string;
  date: string;
  start: string;
  end: string;
  setupMin: string;
  teardownMin: string;
  roomId: string;
  headcount: string;
  setupStyle: string;
  status: "confirmed" | "tentative";
  avItems: { id: string; qty: number }[];
  avNotes: string;
  cateringItems: CateringItem[];
  notes: string;
  timeline: BookingDTO["timeline"];
  narrative: string;
  draftSource: BookingDTO["draftSource"];
};

function fromBooking(booking: BookingDTO, overrides?: Partial<FormState>): FormState {
  return {
    eventName: booking.eventName,
    organization: booking.organization,
    requesterName: booking.requesterName,
    requesterEmail: booking.requesterEmail,
    requesterPhone: booking.requesterPhone,
    onsiteName: booking.onsiteName,
    onsitePhone: booking.onsitePhone,
    onsiteEmail: booking.onsiteEmail,
    date: booking.date,
    start: toHHMM(booking.startMin),
    end: toHHMM(booking.endMin),
    setupMin: String(booking.setupMin),
    teardownMin: String(booking.teardownMin),
    roomId: booking.roomId,
    headcount: String(booking.headcount),
    setupStyle: booking.setupStyle,
    status: booking.status === "tentative" ? "tentative" : "confirmed",
    avItems: booking.avItems,
    avNotes: booking.avNotes,
    cateringItems: booking.cateringItems,
    notes: booking.notes,
    timeline: booking.timeline,
    narrative: booking.narrative,
    draftSource: booking.draftSource,
    ...overrides,
  };
}

function blank(partial: Partial<FormState>): FormState {
  return {
    eventName: "",
    organization: "",
    requesterName: "",
    requesterEmail: "",
    requesterPhone: "",
    onsiteName: "",
    onsitePhone: "",
    onsiteEmail: "",
    date: "",
    start: "09:00",
    end: "11:00",
    setupMin: "30",
    teardownMin: "30",
    roomId: "",
    headcount: "",
    setupStyle: "theater",
    status: "confirmed",
    avItems: [],
    avNotes: "",
    cateringItems: [],
    notes: "",
    timeline: [],
    narrative: "",
    draftSource: "",
    ...partial,
  };
}

const selectClass = "h-11 w-full rounded-lg border border-input bg-card px-3 text-base";

export function BookingForm({
  rooms,
  booking,
  initial,
  duplicateFrom,
  preset,
  justSaved,
  cancelled,
  initialConflicts = [],
}: {
  rooms: RoomDTO[];
  booking?: BookingDTO;
  initial?: BookingDTO;
  duplicateFrom?: { eventName: string; dateLabel: string };
  preset?: Partial<FormState>;
  justSaved?: boolean;
  cancelled?: boolean;
  initialConflicts?: ConflictHit[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => {
    const source = booking ?? initial;
    return source ? fromBooking(source, preset) : blank(preset ?? {});
  });
  const [conflicts, setConflicts] = useState<ConflictHit[]>(initialConflicts);
  const [warnings, setWarnings] = useState<Warnings>({ capacity: null, style: null });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [ackCapacity, setAckCapacity] = useState(false);
  const [ackStyle, setAckStyle] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const room = rooms.find((item) => item.id === form.roomId);

  const payload = useMemo(
    () => ({
      ...form,
      startMin: parseHHMM(form.start),
      endMin: parseHHMM(form.end),
      setupMin: Number(form.setupMin),
      teardownMin: Number(form.teardownMin),
      headcount: form.headcount === "" ? "" : Number(form.headcount),
      excludeId: booking?.id,
      acknowledgeCapacity: ackCapacity,
      acknowledgeStyle: ackStyle,
      status: cancelled ? "tentative" : form.status,
    }),
    [form, booking?.id, ackCapacity, ackStyle, cancelled],
  );

  const scheduleReady = Boolean(form.date && form.roomId && payload.startMin != null && payload.endMin != null);

  useEffect(() => {
    if (!scheduleReady) return;
    const timer = setTimeout(async () => {
      const response = await fetch("/api/bookings/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      const body = await response.json();
      const nextWarnings = body.warnings ?? { capacity: null, style: null };
      setConflicts(body.conflicts ?? []);
      setWarnings(nextWarnings);
      if (!nextWarnings.capacity) setAckCapacity(false);
      if (!nextWarnings.style) setAckStyle(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [scheduleReady, payload, router]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleAv(id: string, qtyAllowed: boolean) {
    setForm((current) => {
      const exists = current.avItems.some((item) => item.id === id);
      return {
        ...current,
        avItems: exists
          ? current.avItems.filter((item) => item.id !== id)
          : [...current.avItems, { id, qty: 1 }],
      };
    });
    void qtyAllowed;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setFieldErrors({});
    const response = await fetch(booking ? `/api/bookings/${booking.id}` : "/api/bookings", {
      method: booking ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    if (response.status === 401) {
      router.push("/login");
      return;
    }
    if (!response.ok) {
      setMessage(body?.message || "The event was not saved.");
      setFieldErrors(body?.fieldErrors ?? {});
      setConflicts(body?.conflicts ?? conflicts);
      setWarnings(body?.warnings ?? warnings);
      setPending(false);
      return;
    }
    router.push(`/bookings/${body.booking.id}?saved=1`);
    router.refresh();
  }

  async function cancelEvent() {
    if (!booking) return;
    setPending(true);
    const response = await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancel: true }),
    });
    if (response.ok) {
      router.refresh();
      setMessage("Cancelled. The room is free for that time.");
    }
    setPending(false);
  }

  async function removeEvent() {
    if (!booking) return;
    const response = await fetch(`/api/bookings/${booking.id}`, { method: "DELETE" });
    if (response.ok) {
      router.push(`/?date=${form.date || ""}`);
      router.refresh();
    }
  }

  const visibleConflicts = scheduleReady ? conflicts : [];
  const visibleWarnings: Warnings = scheduleReady ? warnings : { capacity: null, style: null };
  const blocked =
    visibleConflicts.length > 0 ||
    (Boolean(visibleWarnings.capacity) && !ackCapacity) ||
    (Boolean(visibleWarnings.style) && !ackStyle);
  const capacity = room && form.setupStyle ? styleCapacity(room, form.setupStyle) : null;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={form.date ? `/?date=${form.date}&view=day` : "/"} className="text-base font-semibold text-primary">
            Back to the calendar
          </Link>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">{form.eventName || (booking ? "Edit event" : "New event")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {booking ? (
            <Button type="button" variant="outline" onClick={() => router.push(`/bookings/${booking.id}/resume`)}>
              Event résumé
            </Button>
          ) : null}
          <Button type="submit" disabled={pending || blocked}>
            {pending ? "Saving…" : visibleConflicts.length ? "Room is blocked" : cancelled ? "Restore to the calendar" : "Save event"}
          </Button>
        </div>
      </div>

      {duplicateFrom ? (
        <p className="rounded-lg bg-accent px-4 py-3 text-base">
          Copied from {duplicateFrom.eventName} on {duplicateFrom.dateLabel}. Choose a new date before saving.
        </p>
      ) : null}
      {justSaved ? (
        <p className="rounded-lg bg-accent px-4 py-3 text-base">Saved. The hold is on the shared calendar.</p>
      ) : null}
      {cancelled ? (
        <p className="rounded-lg border border-clay/40 bg-[#f8ebe6] px-4 py-3 text-base">
          This event is cancelled and off the calendar. Save to put it back as tentative, after the conflict check.
        </p>
      ) : null}
      {message ? (
        <p role="alert" className="rounded-lg border border-clay/40 bg-[#f8ebe6] px-4 py-3 font-medium text-clay">
          {message}
        </p>
      ) : null}
      {visibleConflicts.length > 0 ? (
        <div role="alert" className="rounded-lg border border-clay/50 bg-[#f8ebe6] p-4">
          <h2 className="font-semibold text-clay">Blocked — this overlaps another hold</h2>
          <ul className="mt-2 space-y-2">
            {visibleConflicts.map((hit) => (
              <li key={hit.id}>{conflictMessage(hit)}</li>
            ))}
          </ul>
          <p className="mt-2 text-muted-foreground">Change the time or the room. Setup and teardown count as part of the hold.</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <h2 className="font-serif text-2xl">Event</h2>
          <Field label="Event name" error={fieldErrors.eventName}>
            <Input value={form.eventName} onChange={(event) => set("eventName", event.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Group or organization">
              <Input value={form.organization} onChange={(event) => set("organization", event.target.value)} />
            </Field>
            <Field label="Status">
              <select
                className={selectClass}
                value={form.status}
                onChange={(event) => set("status", event.target.value as FormState["status"])}
                disabled={cancelled}
              >
                <option value="confirmed">Confirmed</option>
                <option value="tentative">Tentative</option>
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Requester" error={fieldErrors.requesterName}>
              <Input value={form.requesterName} onChange={(event) => set("requesterName", event.target.value)} required />
            </Field>
            <Field label="Requester phone">
              <Input value={form.requesterPhone} onChange={(event) => set("requesterPhone", event.target.value)} />
            </Field>
          </div>
          <Field label="Requester email">
            <Input type="email" value={form.requesterEmail} onChange={(event) => set("requesterEmail", event.target.value)} />
          </Field>
          <h2 className="pt-2 font-serif text-2xl">When and where</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" error={fieldErrors.date}>
              <Input type="date" value={form.date} onChange={(event) => set("date", event.target.value)} required />
            </Field>
            <Field label="Start" error={fieldErrors.start}>
              <Input type="time" value={form.start} onChange={(event) => set("start", event.target.value)} required />
            </Field>
            <Field label="End" error={fieldErrors.end}>
              <Input type="time" value={form.end} onChange={(event) => set("end", event.target.value)} required />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Setup buffer (minutes)" error={fieldErrors.setupMin}>
              <Input type="number" min={0} max={240} step={5} value={form.setupMin} onChange={(event) => set("setupMin", event.target.value)} />
            </Field>
            <Field label="Teardown buffer (minutes)" error={fieldErrors.teardownMin}>
              <Input type="number" min={0} max={240} step={5} value={form.teardownMin} onChange={(event) => set("teardownMin", event.target.value)} />
            </Field>
          </div>
          <Field label="Room" error={fieldErrors.roomId}>
            <select className={selectClass} value={form.roomId} onChange={(event) => set("roomId", event.target.value)} required>
              <option value="">Choose a room</option>
              {rooms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.floor}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Setup style" error={fieldErrors.setupStyle}>
              <select className={selectClass} value={form.setupStyle} onChange={(event) => set("setupStyle", event.target.value)}>
                {SETUP_STYLES.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Headcount" error={fieldErrors.headcount}>
              <Input type="number" min={1} value={form.headcount} onChange={(event) => set("headcount", event.target.value)} required />
            </Field>
          </div>
          {room ? (
            <p className="text-base text-muted-foreground">
              {styleLabel(form.setupStyle)} capacity {capacity ?? "not offered"}
              {supportedStyles(room).length
                ? `. Offered here: ${supportedStyles(room).map((style) => `${styleLabel(style)} ${room.capacities[style]}`).join(", ")}.`
                : "."}
            </p>
          ) : null}
          {visibleWarnings.capacity ? (
            <div className="rounded-lg border border-amber-ink/40 bg-[#f8f0dc] p-4">
              <h3 className="font-semibold text-amber-ink">Headcount is over capacity</h3>
              <p className="mt-1">
                {visibleWarnings.capacity.headcount} guests in {styleLabel(visibleWarnings.capacity.style).toLowerCase()} exceeds the posted capacity of {visibleWarnings.capacity.capacity}
                {room ? ` for ${room.name}` : ""}.
              </p>
              <label className="mt-3 flex items-center gap-3 font-medium">
                <Checkbox checked={ackCapacity} onCheckedChange={(checked) => setAckCapacity(checked)} />
                Save anyway. The résumé will show the overage.
              </label>
            </div>
          ) : null}
          {visibleWarnings.style ? (
            <div className="rounded-lg border border-amber-ink/40 bg-[#f8f0dc] p-4">
              <h3 className="font-semibold text-amber-ink">This room is not usually set this way</h3>
              <p className="mt-1">
                {styleLabel(visibleWarnings.style.style)} is not offered
                {room ? ` in ${room.name}` : ""}. Supported: {visibleWarnings.style.supported.map(styleLabel).join(", ") || "none listed"}.
              </p>
              <label className="mt-3 flex items-center gap-3 font-medium">
                <Checkbox checked={ackStyle} onCheckedChange={(checked) => setAckStyle(checked)} />
                Save anyway.
              </label>
            </div>
          ) : null}
        </section>

        <div className="space-y-6">
          <section className="space-y-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <h2 className="font-serif text-2xl">AV</h2>
            <div className="grid gap-2 sm:grid-cols-1">
              {AV_CATALOG.map((item) => {
                const selected = form.avItems.find((entry) => entry.id === item.id);
                return (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                    <Checkbox checked={Boolean(selected)} onCheckedChange={() => toggleAv(item.id, item.qty)} />
                    <span className="flex-1">{item.label}</span>
                    {selected && item.qty ? (
                      <Input
                        aria-label={`${item.label} quantity`}
                        type="number"
                        min={1}
                        max={20}
                        className="h-10 w-20"
                        value={selected.qty}
                        onChange={(event) =>
                          set(
                            "avItems",
                            form.avItems.map((entry) =>
                              entry.id === item.id ? { ...entry, qty: Number(event.target.value) || 1 } : entry,
                            ),
                          )
                        }
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
            <Field label="AV notes">
              <Textarea value={form.avNotes} onChange={(event) => set("avNotes", event.target.value)} />
            </Field>
          </section>

          <section className="space-y-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-2xl">Catering</h2>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  set("cateringItems", [
                    ...form.cateringItems,
                    { id: crypto.randomUUID(), meal: "Lunch", time: form.start || "12:00", count: Number(form.headcount) || 1, notes: "" },
                  ])
                }
              >
                Add a meal
              </Button>
            </div>
            {form.cateringItems.length === 0 ? <p className="text-muted-foreground">No food or beverage service yet.</p> : null}
            {form.cateringItems.map((meal, index) => (
              <div key={meal.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-semibold">Meal</span>
                  <select
                    className={selectClass}
                    value={meal.meal}
                    onChange={(event) => updateMeal(set, form.cateringItems, index, { meal: event.target.value })}
                  >
                    {MEAL_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold">Time</span>
                  <Input
                    type="time"
                    value={meal.time}
                    onChange={(event) => updateMeal(set, form.cateringItems, index, { time: event.target.value })}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold">Covers</span>
                  <Input
                    type="number"
                    min={1}
                    value={meal.count}
                    onChange={(event) => updateMeal(set, form.cateringItems, index, { count: Number(event.target.value) })}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold">Notes</span>
                  <Input
                    value={meal.notes}
                    onChange={(event) => updateMeal(set, form.cateringItems, index, { notes: event.target.value })}
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  className="justify-self-start text-clay"
                  onClick={() => set("cateringItems", form.cateringItems.filter((item) => item.id !== meal.id))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </section>

          <section className="space-y-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <h2 className="font-serif text-2xl">On-site contact and notes</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="On-site name">
                <Input value={form.onsiteName} onChange={(event) => set("onsiteName", event.target.value)} />
              </Field>
              <Field label="On-site phone">
                <Input value={form.onsitePhone} onChange={(event) => set("onsitePhone", event.target.value)} />
              </Field>
            </div>
            <Field label="On-site email">
              <Input value={form.onsiteEmail} onChange={(event) => set("onsiteEmail", event.target.value)} />
            </Field>
            <Field label="Notes for the résumé">
              <Textarea
                value={form.notes}
                onChange={(event) => set("notes", event.target.value)}
                placeholder="Timeline cues, facilities notes, menu details."
              />
            </Field>
          </section>
        </div>
      </div>

      {booking ? (
        <div className="flex flex-wrap gap-2">
          {!cancelled ? (
            <Button type="button" variant="outline" onClick={cancelEvent} disabled={pending}>
              Cancel event
            </Button>
          ) : null}
          <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
            Delete event
          </Button>
        </div>
      ) : null}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this event?</DialogTitle>
            <DialogDescription>The hold comes off the calendar. This does not keep a cancelled record.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" onClick={removeEvent}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="block space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <span className="block text-sm font-medium text-clay">{error}</span> : null}
    </div>
  );
}

function updateMeal(
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void,
  items: CateringItem[],
  index: number,
  patch: Partial<CateringItem>,
) {
  set(
    "cateringItems",
    items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
  );
}
