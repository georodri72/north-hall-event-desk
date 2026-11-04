import type { Metadata } from "next";
import { BookingForm } from "@/components/booking-form";
import { conflictsFor, getBooking, listRooms } from "@/lib/store";
import { isDateString, longDate, parseHHMM, toHHMM, venueToday } from "@/lib/time";

export const metadata: Metadata = { title: "New event" };
export const dynamic = "force-dynamic";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; room?: string; start?: string; from?: string }>;
}) {
  const params = await searchParams;
  const rooms = await listRooms();
  const source = params.from ? await getBooking(params.from) : null;
  const startMin = Number(params.start);
  const hasStart = Number.isFinite(startMin) && startMin >= 0 && startMin < 24 * 60;
  const preset = {
    date: params.date && isDateString(params.date) ? params.date : source ? "" : venueToday(),
    roomId: params.room && rooms.some((room) => room.id === params.room) ? params.room : source?.roomId || rooms[0]?.id || "",
    ...(hasStart
      ? {
          start: toHHMM(startMin),
          end: toHHMM(Math.min(startMin + 120, 22 * 60)),
        }
      : {}),
    ...(source ? { status: "tentative" as const } : {}),
  };

  const startLabel = preset.start ?? (source ? toHHMM(source.startMin) : "09:00");
  const endLabel = preset.end ?? (source ? toHHMM(source.endMin) : "11:00");
  const holdStart = parseHHMM(startLabel) ?? 9 * 60;
  const holdEnd = parseHHMM(endLabel) ?? 11 * 60;
  const initialConflicts = await conflictsFor({
    id: "new",
    eventName: source?.eventName ?? "New event",
    date: preset.date,
    roomId: preset.roomId,
    startMin: holdStart,
    endMin: holdEnd,
    setupMin: source?.setupMin ?? 30,
    teardownMin: source?.teardownMin ?? 30,
    status: "confirmed",
  });

  return (
    <BookingForm
      rooms={rooms}
      initial={source ?? undefined}
      preset={preset}
      duplicateFrom={source ? { eventName: source.eventName, dateLabel: longDate(source.date) } : undefined}
      initialConflicts={initialConflicts}
    />
  );
}
