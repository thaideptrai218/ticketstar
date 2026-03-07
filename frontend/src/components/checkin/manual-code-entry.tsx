"use client";

// Fallback manual QR code text input for check-in
import { useState } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ManualCodeEntryProps {
  onSubmit: (code: string) => void;
  disabled?: boolean;
}

export function ManualCodeEntry({ onSubmit, disabled }: ManualCodeEntryProps) {
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    onSubmit(code.trim());
    setCode("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="Nhập mã QR thủ công..."
        value={code}
        onChange={(e) => setCode(e.target.value)}
        disabled={disabled}
        className="font-mono"
      />
      <Button type="submit" disabled={disabled || !code.trim()} className="bg-amber-600 hover:bg-amber-700 shrink-0">
        <Keyboard className="size-4 mr-1" />Kiểm tra
      </Button>
    </form>
  );
}
