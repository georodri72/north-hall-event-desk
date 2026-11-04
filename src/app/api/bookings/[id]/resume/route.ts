import { prisma } from "@/lib/db";
import { jsonResult, requireUser, unauthorized } from "@/lib/http";
import { buildResume, toBookingDTO, toRoomDTO } from "@/lib/model";
import { parseHHMM } from "@/lib/time";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!(await requireUser())) return unauthorized();
  const { id } = await context.params;
  const current = await prisma.booking.findUnique({ where: { id }, include: { room: true } });
  if (!current) return jsonResult(404, { ok: false, message: "That event is no longer on the books." });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return jsonResult(422, { ok: false, message: "The résumé could not be read." });
  }
  const record = body as Record<string, unknown>;
  const timelineRaw = Array.isArray(record.timeline) ? record.timeline : [];
  const timeline = timelineRaw.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const label = "label" in entry ? String(entry.label).trim().slice(0, 180) : "";
    const timeValue = "time" in entry ? String(entry.time) : "";
    const timeMin = "timeMin" in entry && typeof entry.timeMin === "number" ? entry.timeMin : parseHHMM(timeValue);
    if (!label || timeMin == null) return [];
    const itemId = "id" in entry && entry.id ? String(entry.id) : `edit-${index}`;
    return [{ id: itemId, timeMin, label }];
  });
  if (!timeline.length) {
    return jsonResult(422, { ok: false, message: "Keep at least one timeline row." });
  }
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
  const updated = await prisma.booking.update({
    where: { id },
    data: {
      timeline: JSON.stringify(timeline.slice(0, 24)),
      narrative: text(record.narrative, 2000),
      notes: text(record.notes, 4000),
      onsiteName: text(record.onsiteName, 120),
      onsitePhone: text(record.onsitePhone, 40),
      onsiteEmail: text(record.onsiteEmail, 160),
      draftSource: current.draftSource || "template",
    },
    include: { room: true },
  });
  return jsonResult(200, {
    ok: true,
    message: "Résumé saved.",
    resume: buildResume(toBookingDTO(updated), toRoomDTO(updated.room)),
  });
}
