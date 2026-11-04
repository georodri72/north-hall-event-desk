import { CalendarBoard } from "@/components/calendar-board";
import { listBookings, listRooms } from "@/lib/store";
import { isDateString, venueToday, weekDates } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; room?: string }>;
}) {
  const params = await searchParams;
  const today = venueToday();
  const date = params.date && isDateString(params.date) ? params.date : today;
  const view = params.view === "week" ? "week" : "day";
  const rooms = await listRooms();
  const room = params.room && rooms.some((item) => item.id === params.room) ? params.room : "all";
  const days = view === "week" ? weekDates(date) : [date];
  const bookings = await listBookings(days[0], days[days.length - 1]);

  return <CalendarBoard date={date} today={today} view={view} room={room} rooms={rooms} bookings={bookings} />;
}
