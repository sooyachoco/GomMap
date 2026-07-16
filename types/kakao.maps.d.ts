export {};

declare global {
  interface Window {
    kakao: KakaoNamespace;
  }

  interface KakaoNamespace {
    maps: KakaoMaps;
  }

  interface KakaoMaps {
    load: (callback: () => void) => void;
    Map: new (
      container: HTMLElement,
      options: {
        center: KakaoLatLng;
        level: number;
      },
    ) => KakaoMap;
    LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
    LatLngBounds: new () => KakaoLatLngBounds;
    Marker: new (options: {
      map?: KakaoMap | null;
      position: KakaoLatLng;
      image?: KakaoMarkerImage;
      zIndex?: number;
      clickable?: boolean;
      title?: string;
    }) => KakaoMarker;
    MarkerImage: new (
      src: string,
      size: KakaoSize,
      options?: {
        offset?: KakaoPoint;
        alt?: string;
      },
    ) => KakaoMarkerImage;
    Size: new (width: number, height: number) => KakaoSize;
    Point: new (x: number, y: number) => KakaoPoint;
    CustomOverlay: new (options: {
      map?: KakaoMap | null;
      position: KakaoLatLng;
      content: HTMLElement | string;
      xAnchor?: number;
      yAnchor?: number;
      zIndex?: number;
      clickable?: boolean;
    }) => KakaoCustomOverlay;
    event: {
      addListener: (
        target: KakaoMarker | KakaoMap | KakaoCustomOverlay,
        type: string,
        handler: () => void,
      ) => void;
      removeListener: (
        target: KakaoMarker | KakaoMap | KakaoCustomOverlay,
        type: string,
        handler: () => void,
      ) => void;
    };
    services: {
      Places: new () => KakaoPlacesService;
      Status: {
        OK: KakaoPlacesStatus;
        ZERO_RESULT: KakaoPlacesStatus;
        ERROR: KakaoPlacesStatus;
      };
    };
  }

  interface KakaoLatLng {
    getLat: () => number;
    getLng: () => number;
  }

  interface KakaoLatLngBounds {
    extend: (latlng: KakaoLatLng) => void;
    isEmpty: () => boolean;
  }

  interface KakaoMap {
    setCenter: (latlng: KakaoLatLng) => void;
    getCenter: () => KakaoLatLng;
    setLevel: (level: number) => void;
    getLevel: () => number;
    setBounds: (bounds: KakaoLatLngBounds, padding?: number) => void;
    relayout: () => void;
  }

  interface KakaoMarker {
    setMap: (map: KakaoMap | null) => void;
    getMap: () => KakaoMap | null;
    setPosition: (position: KakaoLatLng) => void;
    getPosition: () => KakaoLatLng;
    setZIndex: (zIndex: number) => void;
    setImage: (image: KakaoMarkerImage) => void;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface KakaoMarkerImage {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface KakaoSize {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface KakaoPoint {}

  interface KakaoCustomOverlay {
    setMap: (map: KakaoMap | null) => void;
    getMap: () => KakaoMap | null;
    setPosition: (position: KakaoLatLng) => void;
    setContent: (content: HTMLElement | string) => void;
    setZIndex: (zIndex: number) => void;
  }

  type KakaoPlacesStatus = string;

  interface KakaoPlaceResult {
    id: string;
    place_name: string;
    category_name: string;
    category_group_code: string;
    address_name: string;
    road_address_name: string;
    phone: string;
    place_url: string;
    x: string;
    y: string;
  }

  interface KakaoPlacesService {
    keywordSearch: (
      keyword: string,
      callback: (
        data: KakaoPlaceResult[],
        status: KakaoPlacesStatus,
        pagination: KakaoPagination,
      ) => void,
      options?: {
        location?: KakaoLatLng;
        radius?: number;
        page?: number;
        size?: number;
        sort?: string;
      },
    ) => void;
  }

  interface KakaoPagination {
    current: number;
    last: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: () => void;
    prevPage: () => void;
    gotoPage: (page: number) => void;
    gotoFirst: () => void;
    gotoLast: () => void;
  }
}
