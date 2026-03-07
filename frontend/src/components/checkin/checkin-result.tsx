// Check-in result display — success, duplicate, or error states
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CheckInResponse } from "@/types/organizer";

interface CheckinResultProps {
  result: CheckInResponse | null;
  error: string | null;
}

export function CheckinResult({ result, error }: CheckinResultProps) {
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-3 p-5">
          <XCircle className="size-8 text-red-500 shrink-0" />
          <div>
            <p className="font-medium text-red-700">Vé không hợp lệ</p>
            <p className="text-sm text-red-500 mt-0.5">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  // Already checked in — duplicate scan
  if (result.checkedInAt && !result.isCheckedIn) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-center gap-3 p-5">
          <AlertTriangle className="size-8 text-amber-500 shrink-0" />
          <div>
            <p className="font-medium text-amber-700">Đã quét trước đó</p>
            <p className="text-sm text-amber-600 mt-0.5">{result.attendeeName} — {result.ticketTypeName}</p>
            <p className="text-xs text-amber-400 mt-1">Quét lúc: {new Date(result.checkedInAt).toLocaleString("vi-VN")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Successful check-in
  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="flex items-center gap-3 p-5">
        <CheckCircle className="size-8 text-green-500 shrink-0" />
        <div>
          <p className="font-medium text-green-700">Check-in thành công!</p>
          <p className="text-sm text-green-600 mt-0.5">{result.attendeeName}</p>
          <p className="text-xs text-green-500 mt-0.5">{result.ticketTypeName}</p>
        </div>
      </CardContent>
    </Card>
  );
}
