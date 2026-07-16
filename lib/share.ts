import type { SavedPlace } from "@/lib/places";

export function buildPlaceSharePayload(place: SavedPlace): {
  title: string;
  text: string;
  url?: string;
} {
  const address = place.roadAddress || place.address;
  const lines = [
    `📍 ${place.name}${place.category ? ` · ${place.category}` : ""}`,
    address,
  ];
  if (place.phone) lines.push(place.phone);

  return {
    title: place.name,
    text: lines.join("\n"),
    url: place.placeUrl,
  };
}

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export async function sharePlace(place: SavedPlace): Promise<ShareResult> {
  const payload = buildPlaceSharePayload(place);
  const clipboardText = payload.url
    ? `${payload.text}\n${payload.url}`
    : payload.text;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  try {
    await navigator.clipboard.writeText(clipboardText);
    return "copied";
  } catch {
    return "failed";
  }
}
