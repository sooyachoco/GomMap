export type PlaceCategoryFilter = "전체" | "맛집" | "카페" | "데이트";

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
  userTag?: PlaceCategoryFilter;
};

export const SAVED_PLACES_KEY = "gommap:saved-places:v1";

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
    category: deriveCategoryLabel(result.category_name, groupCode),
    categoryGroupCode: groupCode,
    address: result.address_name,
    roadAddress: result.road_address_name || undefined,
    phone: result.phone || undefined,
    placeUrl: result.place_url || undefined,
    latitude: Number(result.y),
    longitude: Number(result.x),
  };
}

function deriveCategoryLabel(
  categoryName: string,
  groupCode?: string,
): string {
  if (groupCode === "FD6") return "맛집";
  if (groupCode === "CE7") return "카페";
  const leaf = categoryName.split(">").pop()?.trim();
  return leaf || categoryName || "장소";
}

export function filterPlacesByCategory(
  places: SavedPlace[],
  category: PlaceCategoryFilter,
): SavedPlace[] {
  if (category === "전체") return places;
  if (category === "맛집") {
    return places.filter((place) => place.categoryGroupCode === "FD6");
  }
  if (category === "카페") {
    return places.filter((place) => place.categoryGroupCode === "CE7");
  }
  // 데이트: 카카오 공식 카테고리가 아니므로 사용자 태그로만 필터
  return places.filter(
    (place) => place.userTag === "데이트" || place.category === "데이트",
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
  if (place.categoryGroupCode === "CE7" || place.category === "카페") {
    return "sunny";
  }
  if (place.categoryGroupCode === "FD6" || place.category === "맛집") {
    return "table";
  }
  if (place.userTag === "데이트" || place.category === "데이트") {
    return "evening";
  }
  return "forest";
}

export function getPlaceEmoji(place: SavedPlace): string {
  if (place.categoryGroupCode === "CE7" || place.category === "카페") {
    return "☕";
  }
  if (place.categoryGroupCode === "FD6" || place.category === "맛집") {
    return "🍽";
  }
  return "🌿";
}
