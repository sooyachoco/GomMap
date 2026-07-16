export type PlaceCategoryFilter = string;

export type SavedPlace = {
  id: string;
  name: string;
  category: string;
  categoryGroupCode?: string;
  address: string;
  roadAddress?: string;
  phone?: string;
  placeUrl?: string;
  latitude: number;
  longitude: number;
  note?: string;
  userTag?: string;
};

export const SAVED_PLACES_KEY = "gommap:saved-places:v1";
export const CUSTOM_TAGS_KEY = "gommap:custom-tags:v1";

export const DEFAULT_SAVE_TAGS = ["맛집", "카페", "데이트", "기타"] as const;

export const DEFAULT_CENTER = {
  latitude: 37.5665,
  longitude: 126.978,
} as const;

type KakaoPlaceLike = {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code?: string;
  address_name: string;
  road_address_name?: string;
  phone?: string;
  place_url?: string;
  x: string;
  y: string;
};

export function mapKakaoPlace(result: KakaoPlaceLike): SavedPlace {
  const groupCode = result.category_group_code || undefined;
  return {
    id: result.id,
    name: result.place_name,
    category: deriveCategoryLabel(result.category_name),
    categoryGroupCode: groupCode,
    address: result.address_name,
    roadAddress: result.road_address_name || undefined,
    phone: result.phone || undefined,
    placeUrl: result.place_url || undefined,
    latitude: Number(result.y),
    longitude: Number(result.x),
  };
}

function deriveCategoryLabel(categoryName: string): string {
  const leaf = categoryName.split(">").pop()?.trim();
  return leaf || categoryName || "장소";
}

export function suggestSaveTag(place: SavedPlace): string {
  if (place.categoryGroupCode === "FD6") return "맛집";
  if (place.categoryGroupCode === "CE7") return "카페";
  return "기타";
}

export function normalizeTagName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isReservedTagName(value: string): boolean {
  return value === "전체";
}

export function filterPlacesByCategory(
  places: SavedPlace[],
  category: PlaceCategoryFilter,
): SavedPlace[] {
  if (category === "전체") return places;
  if (category === "맛집") {
    return places.filter(
      (place) =>
        place.categoryGroupCode === "FD6" ||
        (place.userTag || suggestSaveTag(place)) === "맛집",
    );
  }
  if (category === "카페") {
    return places.filter(
      (place) =>
        place.categoryGroupCode === "CE7" ||
        (place.userTag || suggestSaveTag(place)) === "카페",
    );
  }
  return places.filter(
    (place) => (place.userTag || suggestSaveTag(place)) === category,
  );
}

/** 저장 목록은 사용자 태그 기준으로 지도/목록을 분류한다. */
export function filterSavedPlacesByTag(
  places: SavedPlace[],
  category: PlaceCategoryFilter,
): SavedPlace[] {
  if (category === "전체") return places;
  return places.filter(
    (place) => (place.userTag || suggestSaveTag(place)) === category,
  );
}

export function loadSavedPlaces(): SavedPlace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_PLACES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedPlace);
  } catch {
    return [];
  }
}

export function persistSavedPlaces(places: SavedPlace[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(places));
}

export function loadCustomTags(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_SAVE_TAGS];
  try {
    const raw = window.localStorage.getItem(CUSTOM_TAGS_KEY);
    if (!raw) return [...DEFAULT_SAVE_TAGS];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_SAVE_TAGS];
    const tags = parsed
      .filter((item): item is string => typeof item === "string")
      .map(normalizeTagName)
      .filter((tag) => tag && !isReservedTagName(tag));
    return tags.length ? Array.from(new Set(tags)) : [...DEFAULT_SAVE_TAGS];
  } catch {
    return [...DEFAULT_SAVE_TAGS];
  }
}

export function persistCustomTags(tags: string[]): void {
  if (typeof window === "undefined") return;
  const cleaned = Array.from(
    new Set(
      tags
        .map(normalizeTagName)
        .filter((tag) => tag && !isReservedTagName(tag)),
    ),
  );
  window.localStorage.setItem(
    CUSTOM_TAGS_KEY,
    JSON.stringify(cleaned.length ? cleaned : [...DEFAULT_SAVE_TAGS]),
  );
}

function isSavedPlace(value: unknown): value is SavedPlace {
  if (!value || typeof value !== "object") return false;
  const place = value as Record<string, unknown>;
  return (
    typeof place.id === "string" &&
    typeof place.name === "string" &&
    typeof place.category === "string" &&
    typeof place.address === "string" &&
    typeof place.latitude === "number" &&
    typeof place.longitude === "number"
  );
}

export function getPlaceTone(place: SavedPlace): string {
  const tag = place.userTag || suggestSaveTag(place);
  if (place.categoryGroupCode === "CE7" || tag === "카페") return "sunny";
  if (place.categoryGroupCode === "FD6" || tag === "맛집") return "table";
  if (tag === "데이트") return "evening";
  return "forest";
}

export function getPlaceEmoji(place: SavedPlace): string {
  const tag = place.userTag || suggestSaveTag(place);
  if (place.categoryGroupCode === "CE7" || tag === "카페") return "☕";
  if (place.categoryGroupCode === "FD6" || tag === "맛집") return "🍽";
  if (tag === "데이트") return "✨";
  return "🌿";
}
