// Foreground geolocation capture. Silently no-ops if the browser blocks it
// or the user denies permission — never blocks a form submission.

import { supabase } from "@/integrations/supabase/client";

export type Coords = { latitude: number; longitude: number; accuracy?: number };

export function captureCoords(timeoutMs = 8000): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    let done = false;
    const finish = (v: Coords | null) => { if (!done) { done = true; resolve(v); } };
    navigator.geolocation.getCurrentPosition(
      (pos) => finish({
        latitude: Number(pos.coords.latitude.toFixed(6)),
        longitude: Number(pos.coords.longitude.toFixed(6)),
        accuracy: pos.coords.accuracy,
      }),
      () => finish(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
    setTimeout(() => finish(null), timeoutMs + 500);
  });
}

export async function logStaffLocation(params: {
  staffId: string;
  coords: Coords;
  source: "visit_log" | "task_update" | "manual";
  relatedId?: string | null;
}): Promise<void> {
  await supabase.from("staff_locations").insert({
    staff_id: params.staffId,
    latitude: params.coords.latitude,
    longitude: params.coords.longitude,
    accuracy: params.coords.accuracy ?? null,
    source: params.source,
    related_id: params.relatedId ?? null,
  });
}
