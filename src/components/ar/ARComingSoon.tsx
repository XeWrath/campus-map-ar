"use client";

import dynamic from "next/dynamic";
import { Camera, Layers, Navigation, Scan } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { arConfig } from "@/lib/ar-config";

const ARScenePlaceholder = dynamic(
  () => import("@/components/ar/ARScenePlaceholder").then((m) => m.ARScenePlaceholder),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 text-sm text-slate-500">
        Loading 3D preview…
      </div>
    ),
  }
);

const plannedFeatures = [
  {
    icon: Camera,
    title: "Camera-based navigation",
    description: "Point your phone to see directional arrows overlaid on the real campus.",
  },
  {
    icon: Navigation,
    title: "Waypoint routing",
    description: "Step-by-step paths between buildings using GPS and visual anchors.",
  },
  {
    icon: Layers,
    title: "Building labels in AR",
    description: "Floating labels for halls, dining, and services as you walk the grounds.",
  },
];

export function ARComingSoon() {
  return (
    <div className="space-y-8">
      <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-slate-900 to-emerald-950/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30">
              <Scan className="h-3.5 w-3.5" aria-hidden />
              Coming soon
            </span>
            <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
              Augmented reality navigation
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-400">
              {arConfig.minCameraPermissionMessage} The project is set up with{" "}
              <strong className="font-medium text-slate-300">Three.js</strong> and{" "}
              <strong className="font-medium text-slate-300">React Three Fiber</strong>{" "}
              for the future AR experience.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-500">
              <li>WebXR features planned: hit-test, dom-overlay, local-floor</li>
              <li>Status: {arConfig.enabled ? "enabled" : "disabled (placeholder)"}</li>
            </ul>
          </div>
          <div className="flex-1">
            <ARScenePlaceholder />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {plannedFeatures.map((feature) => (
          <Card key={feature.title} hover>
            <feature.icon className="h-6 w-6 text-emerald-400" aria-hidden />
            <h3 className="mt-3 font-semibold text-white">{feature.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{feature.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
