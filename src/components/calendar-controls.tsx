"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { RoomDTO } from "@/lib/model";
import { addDays } from "@/lib/time";
import { cn } from "@/lib/utils";

export function CalendarControls({
  date,
  today,
  view,
  room,
  rooms,
}: {
  date: string;
  today: string;
  view: "day" | "week";
  room: string;
  rooms: RoomDTO[];
}) {
  const router = useRouter();

  function go(next: Partial<{ date: string; view: "day" | "week"; room: string }>) {
    const params = new URLSearchParams();
    params.set("date", next.date ?? date);
    params.set("view", next.view ?? view);
    const roomId = next.room ?? room;
    if (roomId !== "all") params.set("room", roomId);
    router.push(`/?${params.toString()}`);
  }

  const step = view === "week" ? 7 : 1;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={() => go({ date: today })}>
        Today
      </Button>
      <Button type="button" variant="outline" onClick={() => go({ date: addDays(date, -step) })} aria-label="Previous">
        Back
      </Button>
      <Button type="button" variant="outline" onClick={() => go({ date: addDays(date, step) })} aria-label="Next">
        Next
      </Button>
      <input
        type="date"
        value={date}
        aria-label="Jump to date"
        onChange={(event) => {
          if (event.target.value) go({ date: event.target.value });
        }}
        className="h-11 rounded-lg border border-input bg-card px-3 text-base"
      />
      <div className="flex rounded-lg bg-muted p-1">
        {(["day", "week"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => go({ view: option })}
            className={cn(
              "rounded-md px-4 py-2 text-base font-semibold capitalize",
              view === option ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {option}
          </button>
        ))}
      </div>
      <select
        aria-label="Filter by room"
        value={room}
        onChange={(event) => go({ room: event.target.value })}
        className="h-11 rounded-lg border border-input bg-card px-3 text-base"
      >
        <option value="all">All rooms</option>
        {rooms.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <Button type="button" className="ml-auto" onClick={() => router.push(`/bookings/new?date=${date}${room !== "all" ? `&room=${room}` : ""}`)}>
        New event
      </Button>
    </div>
  );
}
