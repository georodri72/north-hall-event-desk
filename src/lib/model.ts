import {
  AV_CATALOG,
  type AvId,
  type BookingStatus,
  type SetupStyle,
  avLabel,
  isSetupStyle,
  styleLabel,
} from "@/lib/catalog";
import { formatMin, isDateString, longDate, parseHHMM } from "@/lib/time";

export type AvItem = { id: AvId; qty: number };

export type CateringItem = {
  id: string;
  meal: string;
  time: string;
  count: number;
  notes: string;
};

export type TimelineItem = {
  id: string;
  timeMin: number;
  label: string;
};

export type RoomDTO = {
  id: string;
  name: string;
  floor: string;
  summary: string;
  builtInAv: string;
  capacities: Partial<Record<SetupStyle, number>>;
  sortOrder: number;
};

export type BookingDTO = {
  id: string;
  eventName: string;
  organization: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  onsiteName: string;
  onsitePhone: string;
  onsiteEmail: string;
  date: string;
  startMin: number;
  endMin: number;
  setupMin: number;
  teardownMin: number;
  roomId: string;
  headcount: number;
  setupStyle: SetupStyle;
  status: BookingStatus;
  avItems: AvItem[];
  avNotes: string;
  cateringItems: CateringItem[];
  notes: string;
  timeline: TimelineItem[];
  narrative: string;
  draftSource: "" | "template" | "openai";
};

export type BookingInput = Omit<BookingDTO, "id" | "status" | "draftSource" | "timeline" | "narrative"> & {
  status: "confirmed" | "tentative";
  acknowledgeCapacity: boolean;
  acknowledgeStyle: boolean;
  timeline: TimelineItem[];
  narrative: string;
  draftSource: "" | "template" | "openai";
};

export type ConflictHit = {
  id: string;
  eventName: string;
  startMin: number;
  endMin: number;
  setupMin: number;
  teardownMin: number;
  kind: "event" | "buffer";
};

export type HoldWindow = {
  id: string;
  eventName: string;
  date: string;
  roomId: string;
  startMin: number;
  endMin: number;
  setupMin: number;
  teardownMin: number;
  status: string;
};

export type FieldErrors = Partial<Record<string, string>>;

export type Warnings = {
  capacity: { headcount: number; capacity: number; style: SetupStyle } | null;
  style: { style: SetupStyle; supported: SetupStyle[] } | null;
};

type RoomRow = {
  id: string;
  name: string;
  floor: string;
  summary: string;
  builtInAv: string;
  capacities: string;
  sortOrder: number;
};

type BookingRow = {
  id: string;
  eventName: string;
  organization: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  onsiteName: string;
  onsitePhone: string;
  onsiteEmail: string;
  date: string;
  startMin: number;
  endMin: number;
  setupMin: number;
  teardownMin: number;
  roomId: string;
  headcount: number;
  setupStyle: string;
  status: string;
  avItems: string;
  avNotes: string;
  cateringItems: string;
  notes: string;
  timeline: string;
  narrative: string;
  draftSource: string;
};

export function parseCapacities(raw: string): Partial<Record<SetupStyle, number>> {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!value || typeof value !== "object") return {};
  const capacities: Partial<Record<SetupStyle, number>> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!isSetupStyle(key) || typeof entry !== "number" || !Number.isFinite(entry) || entry < 1) continue;
    capacities[key] = Math.round(entry);
  }
  return capacities;
}

export function toRoomDTO(row: RoomRow): RoomDTO {
  return {
    id: row.id,
    name: row.name,
    floor: row.floor,
    summary: row.summary,
    builtInAv: row.builtInAv,
    capacities: parseCapacities(row.capacities),
    sortOrder: row.sortOrder,
  };
}

function parseAv(raw: string): AvItem[] {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  const items: AvItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const id = "id" in entry ? String(entry.id) : "";
    const known = AV_CATALOG.find((item) => item.id === id);
    if (!known) continue;
    const qtyRaw = "qty" in entry ? Number(entry.qty) : 1;
    const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.min(20, Math.round(qtyRaw))) : 1;
    if (items.some((item) => item.id === known.id)) continue;
    items.push({ id: known.id, qty });
  }
  return items;
}

function parseCatering(raw: string): CateringItem[] {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const meal = "meal" in entry ? String(entry.meal) : "";
    const time = "time" in entry ? String(entry.time) : "";
    const count = "count" in entry ? Number(entry.count) : 0;
    const notes = "notes" in entry ? String(entry.notes) : "";
    const id = "id" in entry && entry.id ? String(entry.id) : `meal-${index}`;
    if (!meal || parseHHMM(time) == null || !Number.isFinite(count)) return [];
    return [{ id, meal, time, count: Math.max(0, Math.round(count)), notes }];
  });
}

function parseTimeline(raw: string): TimelineItem[] {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const timeMin = "timeMin" in entry ? Number(entry.timeMin) : NaN;
    const label = "label" in entry ? String(entry.label).trim() : "";
    const id = "id" in entry && entry.id ? String(entry.id) : `tl-${index}`;
    if (!Number.isFinite(timeMin) || !label) return [];
    return [{ id, timeMin: Math.round(timeMin), label }];
  });
}

export function toBookingDTO(row: BookingRow): BookingDTO {
  const setupStyle = isSetupStyle(row.setupStyle) ? row.setupStyle : "theater";
  const status: BookingStatus =
    row.status === "tentative" || row.status === "cancelled" ? row.status : "confirmed";
  const draftSource = row.draftSource === "template" || row.draftSource === "openai" ? row.draftSource : "";
  return {
    id: row.id,
    eventName: row.eventName,
    organization: row.organization,
    requesterName: row.requesterName,
    requesterEmail: row.requesterEmail,
    requesterPhone: row.requesterPhone,
    onsiteName: row.onsiteName,
    onsitePhone: row.onsitePhone,
    onsiteEmail: row.onsiteEmail,
    date: row.date,
    startMin: row.startMin,
    endMin: row.endMin,
    setupMin: row.setupMin,
    teardownMin: row.teardownMin,
    roomId: row.roomId,
    headcount: row.headcount,
    setupStyle,
    status,
    avItems: parseAv(row.avItems),
    avNotes: row.avNotes,
    cateringItems: parseCatering(row.cateringItems),
    notes: row.notes,
    timeline: parseTimeline(row.timeline),
    narrative: row.narrative,
    draftSource,
  };
}

function buffered(hold: HoldWindow) {
  return { start: hold.startMin - hold.setupMin, end: hold.endMin + hold.teardownMin };
}

function rangesOverlap(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end;
}

export function findConflicts(candidate: HoldWindow, others: HoldWindow[]): ConflictHit[] {
  const window = buffered(candidate);
  const hits: ConflictHit[] = [];
  for (const other of others) {
    if (other.id === candidate.id) continue;
    if (other.status === "cancelled") continue;
    if (other.date !== candidate.date || other.roomId !== candidate.roomId) continue;
    if (!rangesOverlap(window, buffered(other))) continue;
    const program = rangesOverlap(
      { start: candidate.startMin, end: candidate.endMin },
      { start: other.startMin, end: other.endMin },
    );
    hits.push({
      id: other.id,
      eventName: other.eventName,
      startMin: other.startMin,
      endMin: other.endMin,
      setupMin: other.setupMin,
      teardownMin: other.teardownMin,
      kind: program ? "event" : "buffer",
    });
  }
  return hits;
}

export function conflictMessage(hit: ConflictHit): string {
  const holdStart = hit.startMin - hit.setupMin;
  const holdEnd = hit.endMin + hit.teardownMin;
  if (hit.kind === "event") {
    return `${hit.eventName} is already in this room from ${formatMin(hit.startMin)} to ${formatMin(hit.endMin)}.`;
  }
  return `${hit.eventName} holds this room from ${formatMin(holdStart)} to ${formatMin(holdEnd)}, including ${hit.setupMin} min of setup and ${hit.teardownMin} min of teardown. The program itself is ${formatMin(hit.startMin)}–${formatMin(hit.endMin)}.`;
}

export function supportedStyles(room: RoomDTO): SetupStyle[] {
  return (Object.keys(room.capacities) as SetupStyle[]).filter(
    (style) => typeof room.capacities[style] === "number",
  );
}

export function styleCapacity(room: RoomDTO, style: string): number | null {
  if (!isSetupStyle(style)) return null;
  const value = room.capacities[style];
  return typeof value === "number" ? value : null;
}

export function assessWarnings(room: RoomDTO, input: { headcount: number; setupStyle: SetupStyle }): Warnings {
  const capacity = styleCapacity(room, input.setupStyle);
  return {
    capacity:
      capacity != null && input.headcount > capacity
        ? { headcount: input.headcount, capacity, style: input.setupStyle }
        : null,
    style: capacity == null ? { style: input.setupStyle, supported: supportedStyles(room) } : null,
  };
}

export function isOverCapacity(room: RoomDTO | undefined, booking: BookingDTO): boolean {
  if (!room) return false;
  const capacity = styleCapacity(room, booking.setupStyle);
  return capacity != null && booking.headcount > capacity;
}

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function bool(value: unknown): boolean {
  return value === true;
}

export function validateBooking(input: unknown): { data: BookingInput } | { errors: FieldErrors } {
  if (!input || typeof input !== "object") {
    return { errors: { form: "The event could not be read." } };
  }
  const body = input as Record<string, unknown>;
  const errors: FieldErrors = {};
  const eventName = text(body.eventName, 140);
  const requesterName = text(body.requesterName, 120);
  const date = text(body.date, 10);
  const roomId = text(body.roomId, 80);
  const setupStyleRaw = text(body.setupStyle, 40);
  const statusRaw = text(body.status, 20) || "confirmed";
  const startMin = typeof body.startMin === "number" ? body.startMin : parseHHMM(String(body.start ?? ""));
  const endMin = typeof body.endMin === "number" ? body.endMin : parseHHMM(String(body.end ?? ""));
  const setupMin = Number(body.setupMin);
  const teardownMin = Number(body.teardownMin);
  const headcount = Number(body.headcount);

  if (!eventName) errors.eventName = "Name the event.";
  if (!requesterName) errors.requesterName = "Add the requester.";
  if (!isDateString(date)) errors.date = "Choose a date.";
  if (!roomId) errors.roomId = "Choose a room.";
  if (!isSetupStyle(setupStyleRaw)) errors.setupStyle = "Choose a setup style.";
  if (startMin == null || !Number.isInteger(startMin)) errors.start = "Choose a start time.";
  if (endMin == null || !Number.isInteger(endMin)) errors.end = "Choose an end time.";
  if (startMin != null && endMin != null && endMin <= startMin) {
    errors.end = "The end time has to be after the start.";
  }
  if (!Number.isFinite(setupMin) || setupMin < 0 || setupMin > 240) {
    errors.setupMin = "Setup buffer is 0–240 minutes.";
  }
  if (!Number.isFinite(teardownMin) || teardownMin < 0 || teardownMin > 240) {
    errors.teardownMin = "Teardown buffer is 0–240 minutes.";
  }
  if (!Number.isFinite(headcount) || headcount < 1 || headcount > 5000) {
    errors.headcount = "Enter a guest count.";
  }
  const status = statusRaw === "tentative" ? "tentative" : "confirmed";
  if (statusRaw !== "confirmed" && statusRaw !== "tentative") {
    errors.status = "Choose confirmed or tentative.";
  }

  const avItems = parseAv(JSON.stringify(body.avItems ?? []));
  const cateringItems = parseCatering(JSON.stringify(body.cateringItems ?? [])).slice(0, 12);
  const timeline = parseTimeline(JSON.stringify(body.timeline ?? [])).slice(0, 24);
  const draftRaw = text(body.draftSource, 20);
  const draftSource = draftRaw === "template" || draftRaw === "openai" ? draftRaw : "";

  if (Object.keys(errors).length) return { errors };

  return {
    data: {
      eventName,
      organization: text(body.organization, 140),
      requesterName,
      requesterEmail: text(body.requesterEmail, 160),
      requesterPhone: text(body.requesterPhone, 40),
      onsiteName: text(body.onsiteName, 120),
      onsitePhone: text(body.onsitePhone, 40),
      onsiteEmail: text(body.onsiteEmail, 160),
      date,
      startMin: startMin as number,
      endMin: endMin as number,
      setupMin: Math.round(setupMin),
      teardownMin: Math.round(teardownMin),
      roomId,
      headcount: Math.round(headcount),
      setupStyle: setupStyleRaw as SetupStyle,
      status,
      avItems,
      avNotes: text(body.avNotes, 500),
      cateringItems,
      notes: text(body.notes, 4000),
      acknowledgeCapacity: bool(body.acknowledgeCapacity),
      acknowledgeStyle: bool(body.acknowledgeStyle),
      timeline,
      narrative: text(body.narrative, 2000),
      draftSource,
    },
  };
}

export function validateRoom(input: unknown): { data: Omit<RoomDTO, "id" | "sortOrder"> } | { errors: FieldErrors } {
  if (!input || typeof input !== "object") return { errors: { form: "The room could not be read." } };
  const body = input as Record<string, unknown>;
  const errors: FieldErrors = {};
  const name = text(body.name, 80);
  const floor = text(body.floor, 40);
  const summary = text(body.summary, 400);
  const builtInAv = text(body.builtInAv, 300);
  if (!name) errors.name = "Name the room.";
  if (!floor) errors.floor = "Add a floor or area.";

  const rawCaps = body.capacities;
  const capacities: Partial<Record<SetupStyle, number>> = {};
  if (rawCaps && typeof rawCaps === "object") {
    for (const [key, entry] of Object.entries(rawCaps)) {
      if (!isSetupStyle(key)) continue;
      if (entry === "" || entry == null) continue;
      const value = Number(entry);
      if (!Number.isFinite(value) || value < 1 || value > 5000) {
        errors.capacities = "Capacities are whole numbers, or blank if that setup is not offered.";
        continue;
      }
      capacities[key] = Math.round(value);
    }
  }
  if (!Object.keys(capacities).length && !errors.capacities) {
    errors.capacities = "Add a capacity for at least one setup style.";
  }
  if (Object.keys(errors).length) return { errors };
  return { data: { name, floor, summary, builtInAv, capacities } };
}

export function bookingPrismaData(input: BookingInput, mode: "create" | "update") {
  const data: Record<string, unknown> = {
    eventName: input.eventName,
    organization: input.organization,
    requesterName: input.requesterName,
    requesterEmail: input.requesterEmail,
    requesterPhone: input.requesterPhone,
    onsiteName: input.onsiteName,
    onsitePhone: input.onsitePhone,
    onsiteEmail: input.onsiteEmail,
    date: input.date,
    startMin: input.startMin,
    endMin: input.endMin,
    setupMin: input.setupMin,
    teardownMin: input.teardownMin,
    roomId: input.roomId,
    headcount: input.headcount,
    setupStyle: input.setupStyle,
    status: input.status,
    avItems: JSON.stringify(input.avItems),
    avNotes: input.avNotes,
    cateringItems: JSON.stringify(input.cateringItems),
    notes: input.notes,
  };
  if (mode === "create") {
    data.timeline = JSON.stringify(input.timeline);
    data.narrative = input.narrative;
    data.draftSource = input.draftSource;
  }
  return data;
}

function rowId(prefix: string, timeMin: number, index: number) {
  return `${prefix}-${timeMin}-${index}`;
}

export function outlineTimeline(booking: Pick<
  BookingDTO,
  "startMin" | "endMin" | "setupMin" | "teardownMin" | "setupStyle" | "headcount" | "cateringItems" | "eventName"
>): TimelineItem[] {
  const rows: TimelineItem[] = [];
  const push = (timeMin: number, label: string) => {
    rows.push({ id: rowId("outline", timeMin, rows.length), timeMin, label });
  };
  push(booking.startMin - booking.setupMin, `Room setup — ${styleLabel(booking.setupStyle)} for ${booking.headcount}`);
  if (booking.headcount >= 40) push(booking.startMin - 20, "Doors open");
  push(booking.startMin, `${booking.eventName} begins`);
  for (const meal of [...booking.cateringItems].sort((a, b) => (parseHHMM(a.time) ?? 0) - (parseHHMM(b.time) ?? 0))) {
    const timeMin = parseHHMM(meal.time);
    if (timeMin == null) continue;
    const detail = meal.notes ? ` (${meal.notes})` : "";
    push(timeMin, `${meal.meal} — ${meal.count} covers${detail}`);
  }
  push(booking.endMin, "Program ends");
  push(booking.endMin + booking.teardownMin, "Teardown and room restore");
  return rows.sort((a, b) => a.timeMin - b.timeMin);
}

function resolveClock(hour: number, minute: number, meridiem: string | undefined, windowStart: number, windowEnd: number) {
  if (hour > 23 || minute > 59) return null;
  const candidates: number[] = [];
  if (meridiem) {
    let h = hour % 12;
    if (/p/i.test(meridiem)) h += 12;
    if (/a/i.test(meridiem) && hour === 12) h = 0;
    if (!/p/i.test(meridiem) && !/a/i.test(meridiem)) return null;
    candidates.push(h * 60 + minute);
  } else {
    if (hour <= 23) candidates.push(hour * 60 + minute);
    if (hour < 12) candidates.push((hour + 12) * 60 + minute);
  }
  return candidates.find((time) => time >= windowStart - 30 && time <= windowEnd + 30) ?? null;
}

function firstTime(line: string, windowStart: number, windowEnd: number): number | null {
  const pattern = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line))) {
    const hour = Number(match[1]);
    const minute = match[2] ? Number(match[2]) : 0;
    if (hour > 23) continue;
    const resolved = resolveClock(hour, minute, match[3], windowStart, windowEnd);
    if (resolved != null) return resolved;
  }
  return null;
}

function sharesCue(a: string, b: string) {
  const words = ["lunch", "dinner", "breakfast", "break", "reception", "coffee", "doors", "setup", "teardown", "beverage"];
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  return words.some((word) => left.includes(word) && right.includes(word));
}

export function templateDraft(booking: BookingDTO, room: RoomDTO): { timeline: TimelineItem[]; narrative: string } {
  const rows = outlineTimeline(booking);
  const windowStart = booking.startMin - booking.setupMin;
  const windowEnd = booking.endMin + booking.teardownMin;
  const lines = booking.notes
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.])\s+/))
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const timeMin = firstTime(line, windowStart, windowEnd);
    if (timeMin == null) continue;
    const near = rows.some((row) => Math.abs(row.timeMin - timeMin) <= 15 && sharesCue(row.label, line));
    if (near) continue;
    rows.push({ id: rowId("note", timeMin, rows.length), timeMin, label: line.replace(/\s+/g, " ") });
  }
  rows.sort((a, b) => a.timeMin - b.timeMin);

  const av = booking.avItems.map((item) => {
    const qty = item.qty > 1 ? ` ×${item.qty}` : "";
    return `${avLabel(item.id)}${qty}`;
  });
  const meals = [...booking.cateringItems]
    .sort((a, b) => (parseHHMM(a.time) ?? 0) - (parseHHMM(b.time) ?? 0))
    .map((meal) => `${meal.meal.toLowerCase()} at ${formatMin(parseHHMM(meal.time) ?? 0)} for ${meal.count}`);
  const who = booking.organization || booking.requesterName;
  const narrative = [
    `${booking.eventName} for ${who}.`,
    `${booking.headcount} guests in ${styleLabel(booking.setupStyle).toLowerCase()} in ${room.name} (${room.floor}).`,
    av.length ? `AV: ${av.join(", ")}.` : "No additional AV beyond the house equipment.",
    meals.length ? `Catering: ${meals.join("; ")}.` : "No catering on the event.",
    booking.avNotes ? booking.avNotes : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { timeline: rows, narrative };
}

export type ResumeModel = {
  id: string;
  eventName: string;
  status: BookingStatus;
  statusLabel: string;
  dateLabel: string;
  timeLabel: string;
  bufferLabel: string;
  roomName: string;
  floor: string;
  setupStyleLabel: string;
  headcount: number;
  capacity: number | null;
  overCapacity: boolean;
  builtInAv: string;
  roomSummary: string;
  roomSetupText: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  organization: string;
  onsiteName: string;
  onsitePhone: string;
  onsiteEmail: string;
  timeline: { id: string; timeMin: number; timeLabel: string; label: string }[];
  avLines: { label: string; detail: string }[];
  avNotes: string;
  catering: { id: string; timeLabel: string; meal: string; count: number; notes: string }[];
  notes: string;
  narrative: string;
  draftSource: string;
  drafted: boolean;
};

export function buildResume(booking: BookingDTO, room: RoomDTO): ResumeModel {
  const drafted = booking.timeline.length > 0;
  const timelineSource = drafted ? booking.timeline : outlineTimeline(booking);
  const capacity = styleCapacity(room, booking.setupStyle);
  const avLines = booking.avItems.length
    ? booking.avItems.map((item) => ({
        label: avLabel(item.id),
        detail: item.qty > 1 ? `Quantity ${item.qty}` : "Yes",
      }))
    : [{ label: "No additional AV requested", detail: "House equipment only" }];

  return {
    id: booking.id,
    eventName: booking.eventName,
    status: booking.status,
    statusLabel: booking.status === "tentative" ? "Tentative" : booking.status === "cancelled" ? "Cancelled" : "Confirmed",
    dateLabel: longDate(booking.date),
    timeLabel: `${formatMin(booking.startMin)} – ${formatMin(booking.endMin)}`,
    bufferLabel: `Setup ${formatMin(booking.startMin - booking.setupMin)} (${booking.setupMin} min) · Clear by ${formatMin(booking.endMin + booking.teardownMin)} (${booking.teardownMin} min teardown)`,
    roomName: room.name,
    floor: room.floor,
    setupStyleLabel: styleLabel(booking.setupStyle),
    headcount: booking.headcount,
    capacity,
    overCapacity: capacity != null && booking.headcount > capacity,
    builtInAv: room.builtInAv,
    roomSummary: room.summary,
    roomSetupText: `${room.name}, ${room.floor}. Set ${styleLabel(booking.setupStyle).toLowerCase()} for ${booking.headcount}${capacity != null ? ` (posted capacity ${capacity})` : ""}. ${room.summary}`,
    requesterName: booking.requesterName,
    requesterEmail: booking.requesterEmail,
    requesterPhone: booking.requesterPhone,
    organization: booking.organization,
    onsiteName: booking.onsiteName,
    onsitePhone: booking.onsitePhone,
    onsiteEmail: booking.onsiteEmail,
    timeline: [...timelineSource]
      .sort((a, b) => a.timeMin - b.timeMin)
      .map((item) => ({ ...item, timeLabel: formatMin(item.timeMin) })),
    avLines,
    avNotes: booking.avNotes,
    catering: [...booking.cateringItems]
      .sort((a, b) => (parseHHMM(a.time) ?? 0) - (parseHHMM(b.time) ?? 0))
      .map((meal) => ({
        id: meal.id,
        timeLabel: formatMin(parseHHMM(meal.time) ?? 0),
        meal: meal.meal,
        count: meal.count,
        notes: meal.notes,
      })),
    notes: booking.notes,
    narrative: booking.narrative,
    draftSource: booking.draftSource,
    drafted,
  };
}
