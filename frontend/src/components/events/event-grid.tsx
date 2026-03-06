import { EventCard } from "./event-card";
import type { EventListItem } from "@/types/events";

interface EventGridProps {
  events: EventListItem[];
  emptyMessage?: string;
}

export function EventGrid({ events, emptyMessage = "Không tìm thấy sự kiện nào." }: EventGridProps) {
  if (events.length === 0) {
    return (
      <div className="py-16 text-center text-stone-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
