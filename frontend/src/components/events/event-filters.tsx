"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EventFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function EventFilters({ search, onSearchChange }: EventFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
        <Input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm kiếm sự kiện..."
          className="h-11 rounded-xl border-stone-200 bg-stone-50/80 pl-10 focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
        />
        {search && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 size-8 p-0 text-stone-400 hover:text-stone-600"
            onClick={() => onSearchChange("")}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
