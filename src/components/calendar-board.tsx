import Link from "next/link";
import { CalendarControls } from "@/components/calendar-controls";
import { styleLabel } from "@/lib/catalog";
import { findConflicts, isOverCapacity, type BookingDTO, type RoomDTO } from "@/lib/model";
import {
  GRID_END,
  GRID_START,
  dayNumber,
  formatHour,
  formatMin,
  formatRange,
  longDate,
  mediumDate,
  venueNowMinutes,
  weekDates,
  weekdayShort,
} from "@/lib/time";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: (GRID_END - GRID_START) / 60 }, (_, index) => GRID_START + index * 60);
const SPAN = GRID_END - GRID_START;

function leftOf(min: number) {
  const clamped = Math.min(Math.max(min, GRID_START), GRID_END);
  return ((clamped - GRID_START) / SPAN) * 100;
}

export function CalendarBoard({
  date,
  today,
  view,
  room,
  rooms,
  bookings,
}: {
  date: string;
  today: string;
  view: "day" | "week";
  room: string;
  rooms: RoomDTO[];
  bookings: BookingDTO[];
}) {
  const visibleRooms = room === "all" ? rooms : rooms.filter((item) => item.id === room);
  const roomById = new Map(rooms.map((item) => [item.id, item]));
  const range = view === "week" ? weekDates(date) : [date];
  const inView = bookings.filter(
    (booking) => range.includes(booking.date) && (room === "all" || booking.roomId === room),
  );
  const guests = inView.reduce((sum, booking) => sum + booking.headcount, 0);
  const conflictIds = new Set<string>();
  for (const booking of inView) {
    if (findConflicts(booking, inView).length) conflictIds.add(booking.id);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-brass uppercase">
            {date === today ? "Today" : view === "week" ? "Week" : "Day"} · Central Time
          </p>
          <h1 className="font-serif text-4xl tracking-tight md:text-5xl">
            {view === "week" ? `${mediumDate(range[0])} – ${mediumDate(range[6])}` : longDate(date)}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {inView.length} {inView.length === 1 ? "event" : "events"} · {guests.toLocaleString()} guests
          </p>
        </div>
      </div>
      <CalendarControls date={date} today={today} view={view} room={room} rooms={rooms} />
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-8 rounded-sm bg-primary" /> Confirmed
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-8 rounded-sm border-2 border-primary bg-card" /> Tentative
        </span>
          <span className="inline-flex items-center gap-2">
          <span className="buffer-chip inline-block h-4 w-8 rounded-sm bg-primary" /> Setup / teardown
        </span>
      </div>
      {conflictIds.size > 0 ? (
        <p role="alert" className="rounded-lg border border-clay/40 bg-[#f8ebe6] px-4 py-3 font-semibold text-clay">
          {conflictIds.size} {conflictIds.size === 1 ? "hold overlaps" : "holds overlap"} another event, including setup or teardown.
        </p>
      ) : null}
      {view === "day" ? (
        <DayView
          date={date}
          today={today}
          rooms={visibleRooms}
          bookings={inView.filter((booking) => booking.date === date)}
          roomById={roomById}
          conflictIds={conflictIds}
          nowMin={venueNowMinutes()}
        />
      ) : (
        <WeekView days={range} today={today} bookings={inView} roomById={roomById} conflictIds={conflictIds} />
      )}
    </div>
  );
}

function DayView({
  date,
  today,
  rooms,
  bookings,
  roomById,
  conflictIds,
  nowMin,
}: {
  date: string;
  today: string;
  rooms: RoomDTO[];
  bookings: BookingDTO[];
  roomById: Map<string, RoomDTO>;
  conflictIds: Set<string>;
  nowMin: number;
}) {
  const showNow = date === today && nowMin >= GRID_START && nowMin <= GRID_END;
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10 md:block">
        <div className="min-w-[1180px]">
          <div className="grid grid-cols-[220px_1fr] border-b border-border">
            <div className="px-4 py-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Room</div>
            <div className="relative h-12 border-l border-border">
              {HOURS.map((hour) => (
                <span
                  key={hour}
                  className="absolute top-3 text-sm font-semibold text-muted-foreground"
                  style={{ left: `${leftOf(hour)}%` }}
                >
                  {formatHour(hour)}
                </span>
              ))}
            </div>
          </div>
          {rooms.map((room) => {
            const roomBookings = bookings.filter((booking) => booking.roomId === room.id);
            return (
              <div key={room.id} className="grid grid-cols-[220px_1fr] border-b border-border last:border-b-0">
                <div className="bg-card px-4 py-3">
                  <div className="font-semibold leading-tight">{room.name}</div>
                  <div className="text-sm text-muted-foreground">{room.floor}</div>
                </div>
                <div className="relative h-[84px] border-l border-border">
                  {HOURS.map((hour) => (
                    <Link
                      key={hour}
                      href={`/bookings/new?date=${date}&room=${room.id}&start=${hour}`}
                      aria-label={`Hold ${room.name} at ${formatHour(hour)}`}
                      className="absolute top-0 h-full hover:bg-primary/5"
                      style={{ left: `${leftOf(hour)}%`, width: `${100 / HOURS.length}%` }}
                    />
                  ))}
                  {HOURS.map((hour) => (
                    <span
                      key={`line-${hour}`}
                      className="pointer-events-none absolute top-0 h-full border-l border-border/80"
                      style={{ left: `${leftOf(hour)}%` }}
                    />
                  ))}
                  {showNow ? (
                    <span
                      className="pointer-events-none absolute top-0 z-20 h-full w-0.5 bg-clay"
                      style={{ left: `${leftOf(nowMin)}%` }}
                    />
                  ) : null}
                  {roomBookings.map((booking) => (
                    <BookingBlock
                      key={booking.id}
                      booking={booking}
                      conflict={conflictIds.has(booking.id)}
                      over={isOverCapacity(roomById.get(booking.roomId), booking)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="space-y-4 md:hidden">
        {rooms.map((room) => {
          const roomBookings = bookings.filter((booking) => booking.roomId === room.id);
          return (
            <section key={room.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xl font-semibold">{room.name}</h2>
                <span className="text-sm text-muted-foreground">{room.floor}</span>
              </div>
              {roomBookings.length === 0 ? (
                <p className="mt-2 text-muted-foreground">Open</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {roomBookings.map((booking) => (
                    <li key={booking.id}>
                      <Link href={`/bookings/${booking.id}`} className="block rounded-lg bg-muted px-3 py-2">
                        <span className="block font-semibold">{booking.eventName}</span>
                        <span className="text-muted-foreground">
                          {formatRange(booking.startMin, booking.endMin)} · {booking.headcount} · {styleLabel(booking.setupStyle)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link href={`/bookings/new?date=${date}&room=${room.id}`} className="mt-3 inline-block font-semibold text-primary">
                Hold this room
              </Link>
            </section>
          );
        })}
      </div>
    </>
  );
}

function BookingBlock({ booking, conflict, over }: { booking: BookingDTO; conflict: boolean; over: boolean }) {
  const start = booking.startMin - booking.setupMin;
  const end = booking.endMin + booking.teardownMin;
  if (end <= GRID_START || start >= GRID_END) return null;
  const total = end - start;
  const setupPct = ((booking.startMin - start) / total) * 100;
  const tearPct = ((end - booking.endMin) / total) * 100;
  const tentative = booking.status === "tentative";
  return (
    <Link
      href={`/bookings/${booking.id}`}
      title={`${booking.eventName}, ${formatRange(booking.startMin, booking.endMin)}`}
      className={cn(
        "absolute top-2 z-10 h-[68px] overflow-hidden rounded-md px-2 py-1 shadow-sm",
        tentative ? "border-2 border-primary bg-card text-primary" : "bg-primary text-primary-foreground",
        conflict && "ring-2 ring-clay",
      )}
      style={{ left: `${leftOf(start)}%`, width: `${Math.max(leftOf(end) - leftOf(start), 1.2)}%` }}
    >
      <span
        className={cn("pointer-events-none absolute inset-y-0 left-0", tentative ? "buffer-chip-dark" : "buffer-chip")}
        style={{ width: `${setupPct}%` }}
      />
      <span
        className={cn("pointer-events-none absolute inset-y-0 right-0", tentative ? "buffer-chip-dark" : "buffer-chip")}
        style={{ width: `${tearPct}%` }}
      />
      <span className="relative block truncate font-semibold leading-tight">{booking.eventName}</span>
      <span className="relative block truncate text-sm opacity-90">
        {formatRange(booking.startMin, booking.endMin)} · {booking.headcount}
      </span>
      {conflict || over || tentative ? (
        <span className="relative block truncate text-xs font-semibold">
          {[tentative ? "Tentative" : "", conflict ? "Overlap" : "", over ? "Over capacity" : ""].filter(Boolean).join(" · ")}
        </span>
      ) : null}
    </Link>
  );
}

function WeekView({
  days,
  today,
  bookings,
  roomById,
  conflictIds,
}: {
  days: string[];
  today: string;
  bookings: BookingDTO[];
  roomById: Map<string, RoomDTO>;
  conflictIds: Set<string>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      {days.map((day) => {
        const items = bookings.filter((booking) => booking.date === day);
        return (
          <section
            key={day}
            className={cn(
              "min-h-48 rounded-xl bg-card p-3 ring-1 ring-foreground/10",
              day === today && "ring-2 ring-primary",
            )}
          >
            <Link href={`/?date=${day}&view=day`} className="flex items-baseline justify-between">
              <span className="font-semibold">{weekdayShort(day)}</span>
              <span className="font-serif text-2xl">{dayNumber(day)}</span>
            </Link>
            <ul className="mt-3 space-y-2">
              {items.length === 0 ? <li className="text-sm text-muted-foreground">Nothing held</li> : null}
              {items.map((booking) => {
                const room = roomById.get(booking.roomId);
                return (
                  <li key={booking.id}>
                    <Link
                      href={`/bookings/${booking.id}`}
                      className={cn(
                        "block rounded-lg px-2 py-1.5 text-sm leading-snug",
                        booking.status === "tentative" ? "border border-primary text-primary" : "bg-primary text-primary-foreground",
                        conflictIds.has(booking.id) && "ring-2 ring-clay",
                      )}
                    >
                      <span className="block font-semibold">{formatMin(booking.startMin)} {booking.eventName}</span>
                      <span className="block opacity-90">
                        {room?.name} · {booking.headcount}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link href={`/bookings/new?date=${day}`} className="mt-3 inline-block text-sm font-semibold text-primary">
              Add
            </Link>
          </section>
        );
      })}
    </div>
  );
}
