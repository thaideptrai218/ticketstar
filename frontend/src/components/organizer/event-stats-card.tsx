"use client";

// Reusable stats card for organizer dashboard
import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EventStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
}

export function EventStatsCard({ title, value, icon: Icon, description }: EventStatsCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-50">
          <Icon className="size-5 text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-stone-500">{title}</p>
          <p className="text-2xl font-bold text-stone-900">{value}</p>
          {description && <p className="text-xs text-stone-400 mt-0.5">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
