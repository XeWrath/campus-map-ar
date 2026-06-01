export const arConfig = {
  enabled: true,
  // MindAR image tracking configuration
  imageTargetSrc: "/targets/campus-map.mind",
  // Default model to show when a location doesn't have a dedicated GLB
  defaultModelPath: "/models/model_if.glb",
  // Camera permission message
  minCameraPermissionMessage:
    "Izinkan akses kamera untuk menggunakan fitur navigasi AR Kampus FSM UNDIP.",
  // MindAR options
  mindAROptions: {
    uiLoading: "no" as const,
    uiScanning: "no" as const,
    uiError: "no" as const,
  },
};
