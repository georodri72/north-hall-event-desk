import { avLabel, styleLabel } from "@/lib/catalog";
import type { BookingDTO, RoomDTO, TimelineItem } from "@/lib/model";
import { formatMin } from "@/lib/time";

function within(timeMin: number, booking: BookingDTO) {
  const start = booking.startMin - booking.setupMin - 30;
  const end = booking.endMin + booking.teardownMin + 30;
  return timeMin >= start && timeMin <= end;
}

function parseModelTime(value: string, booking: BookingDTO): number | null {
  const match = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i.exec(value.trim());
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase();
  if (meridiem) {
    hour = hour % 12;
    if (meridiem.startsWith("p")) hour += 12;
  } else if (hour < 8 && booking.startMin >= 12 * 60) {
    hour += 12;
  }
  if (hour > 23 || minute > 59) return null;
  const timeMin = hour * 60 + minute;
  return within(timeMin, booking) ? timeMin : null;
}

export async function draftWithModel(
  booking: BookingDTO,
  room: RoomDTO,
): Promise<{ timeline: TimelineItem[]; narrative: string } | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const catering = booking.cateringItems
    .map((meal) => `${meal.meal} at ${meal.time} for ${meal.count}${meal.notes ? ` (${meal.notes})` : ""}`)
    .join("\n");
  const av = booking.avItems.map((item) => `${avLabel(item.id)}${item.qty > 1 ? ` x${item.qty}` : ""}`).join(", ");
  const prompt = [
    `Event: ${booking.eventName}`,
    `Group: ${booking.organization || "not listed"}`,
    `Requester: ${booking.requesterName}`,
    `Date: ${booking.date}`,
    `Program: ${formatMin(booking.startMin)} to ${formatMin(booking.endMin)}`,
    `Setup starts: ${formatMin(booking.startMin - booking.setupMin)} (${booking.setupMin} min)`,
    `Teardown ends: ${formatMin(booking.endMin + booking.teardownMin)} (${booking.teardownMin} min)`,
    `Room: ${room.name}, ${room.floor}`,
    `Setup style: ${styleLabel(booking.setupStyle)}`,
    `Headcount: ${booking.headcount}`,
    `House AV: ${room.builtInAv || "none listed"}`,
    `Requested AV: ${av || "none"}`,
    booking.avNotes ? `AV notes: ${booking.avNotes}` : "",
    `Catering:\n${catering || "none"}`,
    `Coordinator notes:\n${booking.notes || "none"}`,
  ]
    .filter(Boolean)
    .join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You draft banquet event orders for a conference-center production coordinator. Return JSON only with keys narrative (one plain paragraph, no markdown) and timeline (array of {time, label}). Times use h:mm AM/PM. Include setup, the program start, catering, cues that are actually in the notes, the program end, and teardown. Use 6 to 14 rows. Do not invent guest names, menus, or equipment that are not in the booking.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as { narrative?: unknown; timeline?: unknown };
    if (!Array.isArray(parsed.timeline)) return null;
    const timeline: TimelineItem[] = [];
    for (const entry of parsed.timeline) {
      if (!entry || typeof entry !== "object") continue;
      const time = "time" in entry ? String(entry.time) : "";
      const label = "label" in entry ? String(entry.label).replace(/\s+/g, " ").trim() : "";
      const timeMin = parseModelTime(time, booking);
      if (timeMin == null || !label) continue;
      timeline.push({ id: `llm-${timeMin}-${timeline.length}`, timeMin, label: label.slice(0, 180) });
    }
    timeline.sort((a, b) => a.timeMin - b.timeMin);
    const narrative = typeof parsed.narrative === "string" ? parsed.narrative.replace(/\s+/g, " ").trim().slice(0, 900) : "";
    if (timeline.length < 4 || !narrative) return null;
    return { timeline, narrative };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function modelConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}
