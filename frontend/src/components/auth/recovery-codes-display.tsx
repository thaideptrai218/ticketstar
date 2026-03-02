"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface RecoveryCodesDisplayProps {
  codes: string[];
}

export function RecoveryCodesDisplay({ codes }: RecoveryCodesDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-800">
          ⚠️ Lưu các mã này ở nơi an toàn. Bạn sẽ không thể xem lại chúng sau khi đóng trang này.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-4">
        {codes.map((code) => (
          <code
            key={code}
            className="rounded bg-white px-2 py-1.5 text-center text-xs font-mono text-stone-700 shadow-sm border border-stone-200"
          >
            {code}
          </code>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={copyAll}
        className="w-full rounded-lg border-stone-300 gap-2"
      >
        {copied ? (
          <>
            <Check className="size-4 text-emerald-600" aria-hidden="true" />
            Đã sao chép!
          </>
        ) : (
          <>
            <Copy className="size-4" aria-hidden="true" />
            Sao chép tất cả
          </>
        )}
      </Button>
    </div>
  );
}
