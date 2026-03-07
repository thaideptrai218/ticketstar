"use client";

// QR scanner hook wrapping @zxing/browser for continuous camera scanning
import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface UseQrScannerOptions {
  onResult: (text: string) => void;
  enabled?: boolean;
}

export function useQrScanner({ onResult, enabled = true }: UseQrScannerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const stop = useCallback(() => {
    if (readerRef.current) {
      // Stop all video tracks
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      readerRef.current = null;
    }
    setIsActive(false);
  }, []);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    setError(null);

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (result) {
          onResultRef.current(result.getText());
        }
        // Ignore NotFoundException — means no QR in frame yet
        if (err && err.name !== "NotFoundException") {
          setError(err.message);
        }
      })
      .then(() => setIsActive(true))
      .catch((err) => {
        if (err.name === "NotAllowedError") {
          setError("Vui lòng cho phép truy cập camera trong cài đặt trình duyệt.");
        } else {
          setError(`Lỗi camera: ${err.message}`);
        }
      });

    return stop;
  }, [enabled, stop]);

  return { videoRef, error, isActive, stop };
}
