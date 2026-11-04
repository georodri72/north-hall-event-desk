import { prisma } from "@/lib/db";
import { jsonResult, requireUser, unauthorized } from "@/lib/http";
import { assessWarnings, findConflicts, toBookingDTO, toRoomDTO, validateBooking } from "@/lib/model";

export async function POST(request: Request) {
  if (!(await requireUser())) return unauthorized();
  const body = await request.json().catch(() => null);
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const hasHeadcount = source.headcount !== "" && source.headcount != null && Number.isFinite(Number(source.headcount));
  const parsed = validateBooking({
    ...source,
    eventName: typeof source.eventName === "string" && source.eventName.trim() ? source.eventName : "Untitled hold",
    requesterName: typeof source.requesterName === "string" && source.requesterName.trim() ? source.requesterName : "Requester",
    headcount: hasHeadcount ? Number(source.headcount) : 1,
  });
  if ("errors" in parsed) {
    return jsonResult(200, { ok: true, conflicts: [], warnings: { capacity: null, style: null }, fieldErrors: parsed.errors });
  }
  const excludeId = body && typeof body === "object" && "excludeId" in body && typeof body.excludeId === "string" ? body.excludeId : undefined;
  const room = await prisma.room.findUnique({ where: { id: parsed.data.roomId } });
  if (!room) {
    return jsonResult(200, { ok: true, conflicts: [], warnings: { capacity: null, style: null } });
  }
  const others = await prisma.booking.findMany({
    where: {
      date: parsed.data.date,
      roomId: parsed.data.roomId,
      status: { not: "cancelled" },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  const conflicts = findConflicts(
    { ...parsed.data, id: excludeId ?? "new", status: parsed.data.status },
    others.map(toBookingDTO),
  );
  const warnings = assessWarnings(toRoomDTO(room), parsed.data);
  if (!hasHeadcount) warnings.capacity = null;
  return jsonResult(200, { ok: true, conflicts, warnings });
}
