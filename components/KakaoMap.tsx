"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_CENTER,
  filterPlacesByCategory,
  mapKakaoPlace,
  type PlaceCategoryFilter,
  type SavedPlace,
} from "@/lib/places";

export type SearchStatus = "idle" | "loading" | "ok" | "empty" | "error";

type KakaoMapProps = {
  searchRequest: { keyword: string; requestId: number } | null;
  category: PlaceCategoryFilter;
  selectedPlaceId: string | null;
  locateRequestId: number;
  onSelectPlace: (place: SavedPlace | null) => void;
  onSearchStatus: (status: SearchStatus) => void;
  onSearchResults: (places: SavedPlace[]) => void;
};

type MarkerEntry = {
  place: SavedPlace;
  overlay: KakaoCustomOverlay;
  element: HTMLButtonElement;
};

const SCRIPT_ATTR = "data-kakao-map-sdk";

function createPinElement(active: boolean): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = active ? "kakao-pin selected" : "kakao-pin";
  button.innerHTML = "<span></span>";
  return button;
}

export default function KakaoMap({
  searchRequest,
  category,
  selectedPlaceId,
  locateRequestId,
  onSelectPlace,
  onSearchStatus,
  onSearchResults,
}: KakaoMapProps) {
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const placesServiceRef = useRef<KakaoPlacesService | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);
  const searchResultsRef = useRef<SavedPlace[]>([]);
  const latestSearchIdRef = useRef(0);
  const selectedPlaceIdRef = useRef(selectedPlaceId);
  const onSelectPlaceRef = useRef(onSelectPlace);
  const onSearchStatusRef = useRef(onSearchStatus);
  const onSearchResultsRef = useRef(onSearchResults);
  const lastLocateIdRef = useRef(0);
  const categoryRef = useRef(category);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  selectedPlaceIdRef.current = selectedPlaceId;
  onSelectPlaceRef.current = onSelectPlace;
  onSearchStatusRef.current = onSearchStatus;
  onSearchResultsRef.current = onSearchResults;
  categoryRef.current = category;

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((entry) => entry.overlay.setMap(null));
    markersRef.current = [];
  }, []);

  const syncMarkerStyles = useCallback((activeId: string | null) => {
    markersRef.current.forEach((entry) => {
      const isActive = entry.place.id === activeId;
      entry.element.className = isActive ? "kakao-pin selected" : "kakao-pin";
      entry.overlay.setZIndex(isActive ? 10 : 1);
    });
  }, []);

  const renderMarkers = useCallback(
    (places: SavedPlace[], fitBounds: boolean) => {
      const map = mapRef.current;
      if (!map || !window.kakao?.maps) return;

      clearMarkers();

      if (places.length === 0) {
        syncMarkerStyles(null);
        return;
      }

      const bounds = new window.kakao.maps.LatLngBounds();

      places.forEach((place) => {
        const position = new window.kakao.maps.LatLng(
          place.latitude,
          place.longitude,
        );
        bounds.extend(position);

        const element = createPinElement(
          place.id === selectedPlaceIdRef.current,
        );
        element.setAttribute("aria-label", `${place.name} 선택`);

        const overlay = new window.kakao.maps.CustomOverlay({
          map,
          position,
          content: element,
          xAnchor: 0.5,
          yAnchor: 1,
          zIndex: place.id === selectedPlaceIdRef.current ? 10 : 1,
          clickable: true,
        });

        const handleClick = () => {
          onSelectPlaceRef.current(place);
        };
        element.addEventListener("click", handleClick);

        markersRef.current.push({ place, overlay, element });
      });

      if (fitBounds && places.length > 0) {
        map.setBounds(bounds, 64);
      }

      syncMarkerStyles(selectedPlaceIdRef.current);
    },
    [clearMarkers, syncMarkerStyles],
  );

  useEffect(() => {
    if (!appKey) return;

    let cancelled = false;
    const container = containerRef.current;

    const initialize = () => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      if (!window.kakao?.maps) {
        setLoadError(true);
        return;
      }

      window.kakao.maps.load(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        const center = new window.kakao.maps.LatLng(
          DEFAULT_CENTER.latitude,
          DEFAULT_CENTER.longitude,
        );

        const map = new window.kakao.maps.Map(containerRef.current, {
          center,
          level: 4,
        });

        mapRef.current = map;
        placesServiceRef.current = new window.kakao.maps.services.Places();
        setReady(true);
        setLoadError(false);
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[${SCRIPT_ATTR}="true"]`,
    );

    if (existing) {
      if (window.kakao?.maps) {
        initialize();
      } else {
        existing.addEventListener("load", initialize, { once: true });
        existing.addEventListener(
          "error",
          () => {
            if (!cancelled) setLoadError(true);
          },
          { once: true },
        );
      }
    } else {
      const script = document.createElement("script");
      script.dataset.kakaoMapSdk = "true";
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
      script.async = true;
      script.addEventListener("load", initialize, { once: true });
      script.addEventListener(
        "error",
        () => {
          if (!cancelled) setLoadError(true);
        },
        { once: true },
      );
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      clearMarkers();
      mapRef.current = null;
      placesServiceRef.current = null;
      if (container) {
        container.innerHTML = "";
      }
      setReady(false);
    };
  }, [appKey, clearMarkers]);

  useEffect(() => {
    if (!ready || !searchRequest) return;

    const keyword = searchRequest.keyword.trim();
    if (!keyword) return;

    const requestId = searchRequest.requestId;
    latestSearchIdRef.current = requestId;
    onSearchStatusRef.current("loading");

    const service = placesServiceRef.current;
    if (!service) {
      onSearchStatusRef.current("error");
      return;
    }

    service.keywordSearch(keyword, (data, status) => {
      if (requestId !== latestSearchIdRef.current) return;

      if (status === window.kakao.maps.services.Status.OK) {
        const places = data.map(mapKakaoPlace);
        searchResultsRef.current = places;
        onSearchResultsRef.current(places);
        onSearchStatusRef.current(places.length ? "ok" : "empty");

        const filtered = filterPlacesByCategory(
          places,
          categoryRef.current,
        );
        renderMarkers(filtered, true);

        if (filtered.length > 0) {
          onSelectPlaceRef.current(filtered[0]);
        } else {
          onSelectPlaceRef.current(null);
        }
        return;
      }

      if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        searchResultsRef.current = [];
        onSearchResultsRef.current([]);
        onSearchStatusRef.current("empty");
        clearMarkers();
        onSelectPlaceRef.current(null);
        return;
      }

      onSearchStatusRef.current("error");
    });
  }, [searchRequest, ready, clearMarkers, renderMarkers]);

  useEffect(() => {
    if (!ready) return;
    const filtered = filterPlacesByCategory(
      searchResultsRef.current,
      category,
    );
    renderMarkers(filtered, false);

    if (
      selectedPlaceIdRef.current &&
      !filtered.some((place) => place.id === selectedPlaceIdRef.current)
    ) {
      onSelectPlaceRef.current(filtered[0] ?? null);
    }
  }, [category, ready, renderMarkers]);

  useEffect(() => {
    if (!ready) return;
    syncMarkerStyles(selectedPlaceId);

    if (!selectedPlaceId || !mapRef.current) return;
    const entry = markersRef.current.find(
      (item) => item.place.id === selectedPlaceId,
    );
    if (entry) {
      mapRef.current.setCenter(
        new window.kakao.maps.LatLng(
          entry.place.latitude,
          entry.place.longitude,
        ),
      );
    }
  }, [selectedPlaceId, ready, syncMarkerStyles]);

  useEffect(() => {
    if (!ready || !locateRequestId || locateRequestId === lastLocateIdRef.current) {
      return;
    }
    lastLocateIdRef.current = locateRequestId;

    if (!navigator.geolocation || !mapRef.current) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mapRef.current) return;
        const latlng = new window.kakao.maps.LatLng(
          position.coords.latitude,
          position.coords.longitude,
        );
        mapRef.current.setCenter(latlng);
        mapRef.current.setLevel(4);
      },
      () => {
        if (!mapRef.current) return;
        mapRef.current.setCenter(
          new window.kakao.maps.LatLng(
            DEFAULT_CENTER.latitude,
            DEFAULT_CENTER.longitude,
          ),
        );
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [locateRequestId, ready]);

  if (!appKey) {
    return (
      <div className="map-fallback" role="status">
        <strong>카카오맵 키가 필요해요</strong>
        <p>
          프로젝트 루트에 <code>.env.local</code>을 만들고
          <br />
          <code>NEXT_PUBLIC_KAKAO_MAP_KEY</code>에 JavaScript 키를 넣어 주세요.
        </p>
        <p className="map-fallback-hint">
          변경 후 개발 서버를 다시 시작해야 적용됩니다.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="map-fallback" role="alert">
        <strong>지도를 불러오지 못했어요</strong>
        <p>
          카카오 개발자 콘솔에서 아래 두 가지를 확인해 주세요.
        </p>
        <ol className="map-fallback-list">
          <li>
            <strong>제품 설정 → 카카오맵</strong>을 ON
          </li>
          <li>
            <strong>플랫폼 키 → JavaScript 키 → JavaScript SDK 도메인</strong>에
            <br />
            <code>http://localhost:3000</code>,{" "}
            <code>https://sooyachoco.github.io</code> 등록
          </li>
        </ol>
        <p className="map-fallback-hint">
          제품 링크 관리의 웹 도메인과는 다른 설정입니다.
        </p>
        <button
          type="button"
          className="retry-btn"
          onClick={() => window.location.reload()}
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="kakao-map-root">
      <div ref={containerRef} className="kakao-map-canvas" />
      {!ready && (
        <div className="map-loading" role="status">
          지도를 불러오는 중…
        </div>
      )}
    </div>
  );
}
