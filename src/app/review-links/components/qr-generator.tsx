"use client";

import { useRef, useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRGeneratorProps {
  url: string;
  size?: number;
}

export function QRGenerator({ url, size = 200 }: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentSize, setCurrentSize] = useState(size);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    setQrReady(false);
    if (!canvasRef.current) return;
    QRCode.toCanvas(
      canvasRef.current,
      url,
      { width: currentSize, margin: 2 },
      () => {
        setQrReady(true);
      }
    );
  }, [url, currentSize]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "qr-code.png";
    a.click();
  }

  const sizes = [
    { label: "SM", value: 140 },
    { label: "MD", value: 200 },
    { label: "LG", value: 260 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {sizes.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setCurrentSize(s.value)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              currentSize === s.value
                ? "bg-teal-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {s.label} ({s.value}px)
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        <canvas
          ref={canvasRef}
          className="rounded-xl border border-slate-200"
        />
        <p className="text-xs text-slate-500 font-mono text-center break-all max-w-xs">
          {url}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!qrReady}
            onClick={handleDownload}
            className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
