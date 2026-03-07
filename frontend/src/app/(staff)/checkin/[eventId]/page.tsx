"use client";

// QR Scanner page — camera scanning + manual entry + result display + stats
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Camera, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQrScanner } from "@/hooks/use-qr-scanner";
import { CheckinResult } from "@/components/checkin/checkin-result";
import { ManualCodeEntry } from "@/components/checkin/manual-code-entry";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { CheckInResponse, CheckInStats } from "@/types/organizer";

export default function ScannerPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [scanResult, setScanResult] = useState<CheckInResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const statsTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Prevent duplicate scans while processing or showing result
  const canScan = useRef(true);

  const handleScan = useCallback(async (qrCode: string) => {
    if (!canScan.current) return;
    canScan.current = false;
    setProcessing(true);
    setScanResult(null);
    setScanError(null);

    try {
      const res = await apiFetch<CheckInResponse>(`/api/checkin/events/${eventId}/scan`, {
        method: "POST",
        body: JSON.stringify({ qrCode }),
      });
      setScanResult(res);
    } catch (err) {
      setScanError(err instanceof ApiError ? err.message : "Lỗi quét vé.");
    } finally {
      setProcessing(false);
      // Auto-reset after 3s for next scan
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => {
        setScanResult(null);
        setScanError(null);
        canScan.current = true;
      }, 3000);
    }
  }, [eventId]);

  const { videoRef, error: cameraError } = useQrScanner({
    onResult: handleScan,
    enabled: mode === "camera",
  });

  // Fetch stats every 10s
  useEffect(() => {
    let active = true;
    async function fetchStats() {
      try {
        const s = await apiFetch<CheckInStats>(`/api/checkin/events/${eventId}/stats`);
        if (active) setStats(s);
      } catch { /* ignore */ }
      if (active) statsTimer.current = setTimeout(fetchStats, 10_000);
    }
    fetchStats();
    return () => { active = false; clearTimeout(statsTimer.current); };
  }, [eventId]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-stone-900">Quét vé check-in</h1>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button variant={mode === "camera" ? "default" : "outline"} size="sm" onClick={() => setMode("camera")} className={mode === "camera" ? "bg-amber-600" : ""}>
          <Camera className="size-4 mr-1" />Camera
        </Button>
        <Button variant={mode === "manual" ? "default" : "outline"} size="sm" onClick={() => setMode("manual")} className={mode === "manual" ? "bg-amber-600" : ""}>
          <Keyboard className="size-4 mr-1" />Thủ công
        </Button>
      </div>

      {/* Scanner or manual input */}
      {mode === "camera" ? (
        <div className="rounded-xl overflow-hidden border border-stone-200 bg-black aspect-video max-w-lg">
          <video ref={videoRef} className="w-full h-full object-cover" />
          {cameraError && <p className="text-sm text-red-400 p-3 bg-stone-900">{cameraError}</p>}
        </div>
      ) : (
        <ManualCodeEntry onSubmit={handleScan} disabled={processing} />
      )}

      {/* Processing indicator */}
      {processing && <p className="text-sm text-amber-600 animate-pulse">Đang xử lý...</p>}

      {/* Result */}
      <CheckinResult result={scanResult} error={scanError} />

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-stone-200 bg-white p-4 text-center">
          <div>
            <p className="text-xs text-stone-400">Tổng vé</p>
            <p className="text-lg font-bold">{stats.totalTickets}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Đã quét</p>
            <p className="text-lg font-bold text-green-600">{stats.checkedInTickets}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Còn lại</p>
            <p className="text-lg font-bold text-amber-600">{stats.pendingTickets}</p>
          </div>
        </div>
      )}
    </div>
  );
}
