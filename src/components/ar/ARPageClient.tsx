"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function ARPageClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "gedung-e";

  useEffect(() => {
    // Redirect to standalone AR page (uses importmap for MindAR + Three.js v0.160 from CDN)
    // This avoids webpack bundling issues with MindAR's TF.js internals
    window.location.href = `/ar.html?id=${encodeURIComponent(id)}`;
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-sm text-slate-300">Membuka AR...</p>
      </div>
    </div>
  );
}
