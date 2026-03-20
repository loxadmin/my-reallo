// Simple browser fingerprint generator
// Creates a reasonably unique device identifier from browser properties
export function generateDeviceFingerprint(): string {
  const components: string[] = [];

  // Screen properties
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // Hardware concurrency
  components.push(String(navigator.hardwareConcurrency || 0));

  // Device memory (if available)
  components.push(String((navigator as any).deviceMemory || 0));

  // Touch support
  components.push(String(navigator.maxTouchPoints || 0));

  // Canvas fingerprint
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("Karbali🔒", 2, 2);
      components.push(canvas.toDataURL().slice(-50));
    }
  } catch {
    components.push("no-canvas");
  }

  // Hash the components
  const raw = components.join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  return `fp_${Math.abs(hash).toString(36)}`;
}

// Get or create a persistent device ID
export function getDeviceFingerprint(): string {
  const KEY = "karbali-device-fp";
  let fp = localStorage.getItem(KEY);
  if (!fp) {
    fp = generateDeviceFingerprint();
    try {
      localStorage.setItem(KEY, fp);
    } catch {
      // Storage unavailable
    }
  }
  return fp;
}
