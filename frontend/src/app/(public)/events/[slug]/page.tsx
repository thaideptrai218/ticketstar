import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetchServer } from "@/lib/api-server";
import type { EventDetail } from "@/types/events";
import { EventDetailClient } from "./event-detail-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await apiFetchServer<EventDetail>(`/api/events/slug/${slug}`);
    return {
      title: `${event.title} — TicketStar`,
      description: event.description ?? `Đặt vé ${event.title} trên TicketStar`,
      openGraph: {
        title: event.title,
        description: event.description ?? undefined,
        images: event.imageUrl ? [event.imageUrl] : undefined,
      },
    };
  } catch {
    return { title: "Sự kiện — TicketStar" };
  }
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  let event: EventDetail;
  try {
    event = await apiFetchServer<EventDetail>(`/api/events/slug/${slug}`);
  } catch {
    notFound();
  }

  return <EventDetailClient event={event} />;
}
