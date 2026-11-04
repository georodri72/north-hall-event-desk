import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  assessWarnings,
  bookingPrismaData,
  findConflicts,
  toBookingDTO,
  toRoomDTO,
  validateBooking,
  validateRoom,
  type BookingDTO,
  type ConflictHit,
  type HoldWindow,
  type RoomDTO,
} from "@/lib/model";

export async function listRooms(): Promise<RoomDTO[]> {
  const rows = await prisma.room.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map(toRoomDTO);
}

export async function getRoom(id: string) {
  const row = await prisma.room.findUnique({ where: { id } });
  return row ? toRoomDTO(row) : null;
}

export async function listBookings(from: string, to: string): Promise<BookingDTO[]> {
  const rows = await prisma.booking.findMany({
    where: { date: { gte: from, lte: to }, status: { not: "cancelled" } },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
  });
  return rows.map(toBookingDTO);
}

export async function conflictsFor(hold: HoldWindow): Promise<ConflictHit[]> {
  if (!hold.date || !hold.roomId) return [];
  const others = await prisma.booking.findMany({
    where: { date: hold.date, roomId: hold.roomId, status: { not: "cancelled" } },
  });
  return findConflicts(hold, others.map(toBookingDTO));
}

export async function getBooking(id: string) {
  const row = await prisma.booking.findUnique({ where: { id } });
  return row ? toBookingDTO(row) : null;
}

export async function listPastBookings() {
  const rows = await prisma.booking.findMany({
    where: { status: { not: "cancelled" } },
    include: { room: true },
    orderBy: [{ date: "desc" }, { startMin: "desc" }],
  });
  return rows.map((row) => ({ ...toBookingDTO(row), roomName: row.room.name, floor: row.room.floor }));
}

type Result = { status: number; body: Record<string, unknown> };

export async function saveBooking(input: unknown, id?: string): Promise<Result> {
  const parsed = validateBooking(input);
  if ("errors" in parsed) {
    return { status: 422, body: { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.errors } };
  }

  if (id) {
    const current = await prisma.booking.findUnique({ where: { id } });
    if (!current) return { status: 404, body: { ok: false, message: "That event is no longer on the books." } };
  }

  const room = await prisma.room.findUnique({ where: { id: parsed.data.roomId } });
  if (!room) {
    return { status: 422, body: { ok: false, message: "Choose a room that exists.", fieldErrors: { roomId: "Choose a room." } } };
  }
  const roomDTO = toRoomDTO(room);
  const others = await prisma.booking.findMany({
    where: {
      date: parsed.data.date,
      roomId: parsed.data.roomId,
      status: { not: "cancelled" },
      ...(id ? { NOT: { id } } : {}),
    },
  });
  const conflicts = findConflicts(
    { ...parsed.data, id: id ?? "new", status: parsed.data.status },
    others.map(toBookingDTO),
  );
  if (conflicts.length) {
    return {
      status: 409,
      body: {
        ok: false,
        message: "That time overlaps another hold, including setup or teardown.",
        conflicts,
      },
    };
  }

  const warnings = assessWarnings(roomDTO, parsed.data);
  if ((warnings.capacity && !parsed.data.acknowledgeCapacity) || (warnings.style && !parsed.data.acknowledgeStyle)) {
    return {
      status: 422,
      body: { ok: false, message: "Acknowledge the room warnings before saving.", warnings },
    };
  }

  const data = bookingPrismaData(parsed.data, id ? "update" : "create");
  const row = id
    ? await prisma.booking.update({ where: { id }, data: data as Prisma.BookingUncheckedUpdateInput })
    : await prisma.booking.create({
        data: { ...(data as Prisma.BookingUncheckedCreateInput), id: crypto.randomUUID() },
      });

  return { status: 200, body: { ok: true, booking: toBookingDTO(row) } };
}

export async function cancelBooking(id: string): Promise<Result> {
  const current = await prisma.booking.findUnique({ where: { id } });
  if (!current) return { status: 404, body: { ok: false, message: "That event is no longer on the books." } };
  const row = await prisma.booking.update({ where: { id }, data: { status: "cancelled" } });
  return { status: 200, body: { ok: true, booking: toBookingDTO(row) } };
}

export async function deleteBooking(id: string): Promise<Result> {
  const current = await prisma.booking.findUnique({ where: { id } });
  if (!current) return { status: 404, body: { ok: false, message: "That event is no longer on the books." } };
  await prisma.booking.delete({ where: { id } });
  return { status: 200, body: { ok: true } };
}

export async function saveRoom(input: unknown, id?: string): Promise<Result> {
  const parsed = validateRoom(input);
  if ("errors" in parsed) {
    return { status: 422, body: { ok: false, message: "Check the room fields.", fieldErrors: parsed.errors } };
  }
  const data = {
    name: parsed.data.name,
    floor: parsed.data.floor,
    summary: parsed.data.summary,
    builtInAv: parsed.data.builtInAv,
    capacities: JSON.stringify(parsed.data.capacities),
  };
  if (id) {
    const current = await prisma.room.findUnique({ where: { id } });
    if (!current) return { status: 404, body: { ok: false, message: "That room is not on the list." } };
    const row = await prisma.room.update({ where: { id }, data });
    return { status: 200, body: { ok: true, room: toRoomDTO(row) } };
  }
  const last = await prisma.room.findFirst({ orderBy: { sortOrder: "desc" } });
  const row = await prisma.room.create({
    data: { id: crypto.randomUUID(), sortOrder: (last?.sortOrder ?? 0) + 1, ...data },
  });
  return { status: 200, body: { ok: true, room: toRoomDTO(row) } };
}

export async function deleteRoom(id: string): Promise<Result> {
  const current = await prisma.room.findUnique({ where: { id } });
  if (!current) return { status: 404, body: { ok: false, message: "That room is not on the list." } };
  const holds = await prisma.booking.count({ where: { roomId: id } });
  if (holds > 0) {
    return {
      status: 409,
      body: { ok: false, message: "This room still has events. Move or delete those holds before removing the room." },
    };
  }
  await prisma.room.delete({ where: { id } });
  return { status: 200, body: { ok: true } };
}
