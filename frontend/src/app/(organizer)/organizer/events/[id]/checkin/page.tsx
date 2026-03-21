"use client";

// Check-in page — QR camera scan + manual code input + live stats
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Camera, CameraOff, CheckCircle, Clock,
  Keyboard, Loader2, TicketIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckinResult } from "@/components/checkin/checkin-result";
import { apiFetch } from "@/lib/api-client";
import type { CheckInStats, CheckInResponse } from "@/types/organizer";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanMode = "camera" | "manual";

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, colorClass }: {
  icon: React.ReactNode; label: string; value: number; colorClass: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-stone-400">{label}</p>
        <p className="text-xl font-bold text-stone-900">{value}</p>
      </div>
    </div>
  );
}

// ─── QR Camera Scanner ────────────────────────────────────────────────────────

function QrScanner({ onScan }: { onScan: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for metadata to load before playing to avoid interrupted play() warning
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => resolve();
        });
        await videoRef.current.play();
      }
      setActive(true);

      // Use @zxing/browser for decoding
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      reader.decodeFromVideoElement(videoRef.current!, (result) => {
        if (result) {
          onScan(result.getText());
        }
      }).catch(() => {});
    } catch {
      setError("Không thể truy cập camera. Vui lòng kiểm tra quyền.");
    }
  }, [onScan]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl bg-stone-900 aspect-video max-h-64">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {/* Scan overlay */}
        {active && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="size-48 border-2 border-amber-400 rounded-lg opacity-80">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br" />
            </div>
          </div>
        )}
        {!active && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-8 text-white animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <CameraOff className="size-8 text-stone-400" />
            <p className="text-sm text-stone-300">{error}</p>
            <Button size="sm" variant="outline" onClick={startCamera} className="text-white border-stone-500">
              Thử lại
            </Button>
          </div>
        )}
      </div>
      <p className="text-xs text-center text-stone-400">Hướng camera vào mã QR trên vé</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckinPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [mode, setMode] = useState<ScanMode>("camera");
  const [manualCode, setManualCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const lastScannedRef = useRef<string>("");
  const resultTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const statsTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch stats with 10s polling
  useEffect(() => {
    let active = true;
    async function fetchStats() {
      try {
        const data = await apiFetch<CheckInStats>(`/api/checkin/events/${eventId}/stats`);
        if (active) { setStats(data); setStatsLoading(false); }
      } catch {
        if (active) setStatsLoading(false);
      }
      if (active) statsTimerRef.current = setTimeout(fetchStats, 10_000);
    }
    fetchStats();
    return () => { active = false; clearTimeout(statsTimerRef.current); };
  }, [eventId]);

  const performCheckIn = useCallback(async (code: string) => {
    if (!code.trim() || code === lastScannedRef.current) return;
    lastScannedRef.current = code;
    setIsSubmitting(true);
    setResult(null);
    setScanError(null);
    clearTimeout(resultTimerRef.current);

    try {
      const data = await apiFetch<CheckInResponse>(`/api/checkin/events/${eventId}/scan`, {
        method: "POST",
        body: JSON.stringify({ qrCode: code }),
      });
      setResult(data);
      // Refresh stats after successful scan
      apiFetch<CheckInStats>(`/api/checkin/events/${eventId}/stats`).then(setStats).catch(() => {});
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : "Vé không hợp lệ");
    } finally {
      setIsSubmitting(false);
      setManualCode("");
      // Auto-clear result after 4s so next scan is ready
      resultTimerRef.current = setTimeout(() => {
        setResult(null);
        setScanError(null);
        lastScannedRef.current = "";
      }, 4_000);
    }
  }, [eventId]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    performCheckIn(manualCode);
  }

  const pct = stats && stats.totalTickets > 0
    ? Math.round((stats.checkedInTickets / stats.totalTickets) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href={`/organizer/events/${eventId}`}
        className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Quay lại chi tiết sự kiện
      </Link>

      <h1 className="text-2xl font-bold text-stone-900">Check-in vé</h1>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid gap-3 grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : stats ? (
        <div className="space-y-3">
          <div className="grid gap-3 grid-cols-3">
            <StatCard icon={<TicketIcon className="size-4 text-blue-600" />} label="Tổng vé" value={stats.totalTickets} colorClass="bg-blue-50" />
            <StatCard icon={<CheckCircle className="size-4 text-green-600" />} label="Đã vào" value={stats.checkedInTickets} colorClass="bg-green-50" />
            <StatCard icon={<Clock className="size-4 text-amber-600" />} label="Chưa vào" value={stats.pendingTickets} colorClass="bg-amber-50" />
          </div>
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <div className="flex justify-between text-xs text-stone-500 mb-1.5">
              <span>Tiến độ</span><span className="font-semibold text-amber-600">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      ) : null}

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-stone-200 bg-stone-50 p-1 gap-1">
        <button
          type="button"
          onClick={() => setMode("camera")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors cursor-pointer
            ${mode === "camera" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}
        >
          <Camera className="size-4" /> Quét QR
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors cursor-pointer
            ${mode === "manual" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}
        >
          <Keyboard className="size-4" /> Nhập mã
        </button>
      </div>

      {/* Scanner / Manual input */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4">
        {mode === "camera" ? (
          <QrScanner onScan={performCheckIn} />
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <label className="text-sm font-medium text-stone-700">Mã vé</label>
            <div className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Nhập mã vé hoặc mã QR..."
                className="flex-1 font-mono"
                autoFocus
                autoComplete="off"
              />
              <Button
                type="submit"
                disabled={!manualCode.trim() || isSubmitting}
                className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Check-in"}
              </Button>
            </div>
            <p className="text-xs text-stone-400">Nhấn Enter hoặc nhấn nút để xác nhận</p>
          </form>
        )}

        {/* Loading indicator for camera mode */}
        {mode === "camera" && isSubmitting && (
          <div className="flex items-center justify-center gap-2 text-sm text-stone-500">
            <Loader2 className="size-4 animate-spin" /> Đang xử lý...
          </div>
        )}

        {/* Result */}
        <CheckinResult result={result} error={scanError} />
      </div>
    </div>
  );
}
