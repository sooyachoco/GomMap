"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import KakaoMap, { type SearchStatus } from "@/components/KakaoMap";
import { Icon } from "@/components/Icon";
import profileGom from "@/assets/gom.png";
import profileChoco from "@/assets/choco.png";
import loveBubble from "@/assets/love.png";
import {
  DEFAULT_SAVE_TAGS,
  filterPlacesByCategory,
  filterSavedPlacesByTag,
  getPlaceEmoji,
  getPlaceTone,
  isReservedTagName,
  loadCustomTags,
  loadSavedPlaces,
  normalizeTagName,
  persistCustomTags,
  persistSavedPlaces,
  suggestSaveTag,
  type PlaceCategoryFilter,
  type SavedPlace,
} from "@/lib/places";
import { sharePlace } from "@/lib/share";

const gomSrc =
  typeof profileGom === "string" ? profileGom : profileGom.src;
const chocoSrc =
  typeof profileChoco === "string" ? profileChoco : profileChoco.src;
const loveSrc =
  typeof loveBubble === "string" ? loveBubble : loveBubble.src;
const SHEET_DRAG_THRESHOLD = 48;

export default function Home() {
  const [category, setCategory] = useState<PlaceCategoryFilter>("전체");
  const [query, setQuery] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [searchRequest, setSearchRequest] = useState<{
    keyword: string;
    requestId: number;
  } | null>(null);
  const [searchResults, setSearchResults] = useState<SavedPlace[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [selected, setSelected] = useState<SavedPlace | null>(null);
  const [saved, setSaved] = useState<SavedPlace[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [toast, setToast] = useState("");
  const [locateRequestId, setLocateRequestId] = useState(0);
  const [saveTag, setSaveTag] = useState<PlaceCategoryFilter>("맛집");
  const [customTags, setCustomTags] = useState<string[]>([...DEFAULT_SAVE_TAGS]);
  const [editingTags, setEditingTags] = useState(false);
  const [newTagDraft, setNewTagDraft] = useState("");
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [mapMode, setMapMode] = useState<"search" | "saved">("search");
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const [showChoco, setShowChoco] = useState(false);
  const sheetDragRef = useRef<{
    pointerId: number;
    startY: number;
    lastY: number;
  } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const places = loadSavedPlaces();
      const tags = loadCustomTags();
      const usedTags = places
        .map((place) => place.userTag || suggestSaveTag(place))
        .filter((tag) => tag && !isReservedTagName(tag));
      const merged = Array.from(new Set([...tags, ...usedTags]));
      setSaved(places);
      setCustomTags(merged);
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (storageReady) persistSavedPlaces(saved);
  }, [saved, storageReady]);

  useEffect(() => {
    if (storageReady) persistCustomTags(customTags);
  }, [customTags, storageReady]);

  const saveTags = customTags;
  const categories = useMemo(
    () => ["전체", ...customTags],
    [customTags],
  );

  const filteredResults = useMemo(
    () => filterPlacesByCategory(searchResults, category),
    [searchResults, category],
  );

  const savedOnMap = useMemo(
    () => filterSavedPlacesByTag(saved, category),
    [saved, category],
  );

  const pinnedPlaces = mapMode === "saved" ? savedOnMap : null;

  const isSelectedSaved = Boolean(
    selected && saved.some((place) => place.id === selected.id),
  );

  const selectedVisible = useMemo(() => {
    if (!selected) return null;

    if (mapMode === "saved") {
      return savedOnMap.some((place) => place.id === selected.id)
        ? selected
        : null;
    }

    const fromSearch = searchResults.some((place) => place.id === selected.id);
    if (fromSearch) {
      return filteredResults.some((place) => place.id === selected.id)
        ? selected
        : null;
    }

    if (isSelectedSaved) {
      return filterSavedPlacesByTag([selected], category).length > 0
        ? selected
        : null;
    }

    return selected;
  }, [
    selected,
    mapMode,
    savedOnMap,
    searchResults,
    filteredResults,
    isSelectedSaved,
    category,
  ]);

  const isVisibleSaved = Boolean(
    selectedVisible && saved.some((place) => place.id === selectedVisible.id),
  );

  // 상단 분류를 바꾸면 선택 카드·목록·지도가 같은 태그만 보도록 맞춤
  useEffect(() => {
    if (mapMode === "saved") {
      setSelected((current) => {
        if (current && savedOnMap.some((place) => place.id === current.id)) {
          return current;
        }
        return savedOnMap[0] ?? null;
      });
      return;
    }

    setSelected((current) => {
      if (!current) return current;
      const fromSearch = searchResults.some((place) => place.id === current.id);
      if (!fromSearch) return current;
      if (filteredResults.some((place) => place.id === current.id)) {
        return current;
      }
      return filteredResults[0] ?? null;
    });
  }, [category, mapMode, savedOnMap, filteredResults, searchResults]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }, []);

  const runSearch = useCallback(() => {
    if (isComposing) return;
    const keyword = query.trim();
    if (!keyword) return;
    setMapMode("search");
    setSearchRequest({ keyword, requestId: Date.now() });
  }, [isComposing, query]);

  const showSavedOnMap = useCallback(() => {
    setMapMode("saved");
    setExpanded(false);
    const filtered = filterSavedPlacesByTag(saved, category);
    if (filtered.length === 0) {
      setSelected(null);
      showToast(
        category === "전체"
          ? "저장한 장소가 없어요"
          : `저장한 ${category}이(가) 없어요`,
      );
      return;
    }
    setSelected((current) => {
      if (current && filtered.some((place) => place.id === current.id)) {
        return current;
      }
      return filtered[0];
    });
  }, [saved, category, showToast]);

  const toggleSaved = useCallback(
    (place: SavedPlace, tag?: PlaceCategoryFilter) => {
      const exists = saved.some((item) => item.id === place.id);
      if (exists) {
        setSaved((current) => current.filter((item) => item.id !== place.id));
        showToast("저장 목록에서 삭제했어요");
        return;
      }

      const nextTag =
        tag ??
        (place.categoryGroupCode === "FD6" || place.categoryGroupCode === "CE7"
          ? suggestSaveTag(place)
          : saveTag === "전체"
            ? "기타"
            : saveTag);

      const toSave: SavedPlace = {
        ...place,
        userTag: nextTag === "전체" ? "기타" : nextTag,
        note: place.note || place.roadAddress || place.address,
      };

      setSaved((current) => [...current, toSave]);
      showToast("장소 보관함에 저장했어요");
    },
    [saved, saveTag, showToast],
  );

  const handleSelectSaved = (place: SavedPlace) => {
    setMapMode("saved");
    setSelected(place);
    setSaveTag(
      place.userTag && place.userTag !== "전체"
        ? place.userTag
        : suggestSaveTag(place),
    );
    setExpanded(false);
  };

  const handleShare = useCallback(
    async (place: SavedPlace) => {
      const result = await sharePlace(place);
      if (result === "shared") showToast("장소를 공유했어요");
      else if (result === "copied") showToast("공유 내용을 복사했어요");
      else if (result === "failed") showToast("공유에 실패했어요");
    },
    [showToast],
  );

  const updateSavedTag = useCallback(
    (placeId: string, tag: string) => {
      setSaved((current) =>
        current.map((place) =>
          place.id === placeId ? { ...place, userTag: tag } : place,
        ),
      );
      setSelected((current) =>
        current && current.id === placeId
          ? { ...current, userTag: tag }
          : current,
      );
      setSaveTag(tag);
      showToast(`${tag}(으)로 변경했어요`);
    },
    [showToast],
  );

  const addCustomTag = useCallback(() => {
    const next = normalizeTagName(newTagDraft);
    if (!next) {
      showToast("분류 이름을 입력해 주세요");
      return;
    }
    if (isReservedTagName(next)) {
      showToast("‘전체’는 분류 이름으로 쓸 수 없어요");
      return;
    }
    if (customTags.includes(next)) {
      showToast("이미 있는 분류예요");
      return;
    }
    setCustomTags((current) => [...current, next]);
    setNewTagDraft("");
    setSaveTag(next);
    setCategory(next);
    showToast(`‘${next}’ 분류를 추가했어요`);
  }, [newTagDraft, customTags, showToast]);

  const startRenameTag = useCallback((tag: string) => {
    setRenamingTag(tag);
    setRenameDraft(tag);
  }, []);

  const commitRenameTag = useCallback(() => {
    if (!renamingTag) return;
    const next = normalizeTagName(renameDraft);
    if (!next) {
      showToast("분류 이름을 입력해 주세요");
      return;
    }
    if (isReservedTagName(next)) {
      showToast("‘전체’는 분류 이름으로 쓸 수 없어요");
      return;
    }
    if (next !== renamingTag && customTags.includes(next)) {
      showToast("이미 있는 분류예요");
      return;
    }

    const prev = renamingTag;
    setCustomTags((current) =>
      current.map((tag) => (tag === prev ? next : tag)),
    );
    setSaved((current) =>
      current.map((place) =>
        (place.userTag || suggestSaveTag(place)) === prev
          ? { ...place, userTag: next }
          : place,
      ),
    );
    setSelected((current) =>
      current && (current.userTag || suggestSaveTag(current)) === prev
        ? { ...current, userTag: next }
        : current,
    );
    setCategory((current) => (current === prev ? next : current));
    setSaveTag((current) => (current === prev ? next : current));
    setRenamingTag(null);
    setRenameDraft("");
    showToast(
      prev === next ? "분류 이름을 유지했어요" : `‘${prev}’ → ‘${next}’`,
    );
  }, [renamingTag, renameDraft, customTags, showToast]);

  const deleteCustomTag = useCallback(
    (tag: string) => {
      if (customTags.length <= 1) {
        showToast("분류는 최소 1개 필요해요");
        return;
      }
      const fallback =
        customTags.find((item) => item !== tag && item === "기타") ||
        customTags.find((item) => item !== tag) ||
        "기타";

      setCustomTags((current) => current.filter((item) => item !== tag));
      setSaved((current) =>
        current.map((place) =>
          (place.userTag || suggestSaveTag(place)) === tag
            ? { ...place, userTag: fallback }
            : place,
        ),
      );
      setSelected((current) =>
        current && (current.userTag || suggestSaveTag(current)) === tag
          ? { ...current, userTag: fallback }
          : current,
      );
      setCategory((current) => (current === tag ? "전체" : current));
      setSaveTag((current) => (current === tag ? fallback : current));
      if (renamingTag === tag) {
        setRenamingTag(null);
        setRenameDraft("");
      }
      showToast(`‘${tag}’을(를) 삭제하고 ‘${fallback}’(으)로 옮겼어요`);
    },
    [customTags, renamingTag, showToast],
  );

  const modeLabel = useMemo(() => {
    if (mapMode === "saved") {
      const scope = category === "전체" ? "전체" : category;
      return `저장한 장소 · ${scope} ${savedOnMap.length}`;
    }
    if (searchStatus === "ok") {
      return category === "전체"
        ? `검색 결과 ${filteredResults.length}`
        : `검색 결과 · ${category} ${filteredResults.length}`;
    }
    if (searchStatus === "loading") return "검색 중…";
    return "검색하거나 저장 장소를 열어보세요";
  }, [mapMode, category, savedOnMap.length, searchStatus, filteredResults.length]);

  const chipsScrollRef = useRef<HTMLElement | null>(null);
  const sheetFilterScrollRef = useRef<HTMLDivElement | null>(null);
  const hScrollDragRef = useRef<{
    el: HTMLElement;
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
  } | null>(null);

  const onHScrollPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const el = event.currentTarget;
      if (el.scrollWidth <= el.clientWidth) return;
      hScrollDragRef.current = {
        el,
        pointerId: event.pointerId,
        startX: event.clientX,
        startScrollLeft: el.scrollLeft,
        moved: false,
      };
      el.setPointerCapture(event.pointerId);
    },
    [],
  );

  const onHScrollPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = hScrollDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - drag.startX;
      if (Math.abs(deltaX) > 4) drag.moved = true;
      drag.el.scrollLeft = drag.startScrollLeft - deltaX;
    },
    [],
  );

  const onHScrollPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = hScrollDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (drag.moved) {
        // 드래그 직후 버튼 click 방지
        const blockClick = (clickEvent: Event) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          drag.el.removeEventListener("click", blockClick, true);
        };
        drag.el.addEventListener("click", blockClick, true);
        window.setTimeout(() => {
          drag.el.removeEventListener("click", blockClick, true);
        }, 0);
      }
      hScrollDragRef.current = null;
    },
    [],
  );

  const finishSheetDrag = useCallback(
    (deltaY: number) => {
      setIsSheetDragging(false);
      setSheetDragY(0);
      sheetDragRef.current = null;

      if (!expanded && deltaY <= -SHEET_DRAG_THRESHOLD) {
        setExpanded(true);
        return;
      }
      if (expanded && deltaY >= SHEET_DRAG_THRESHOLD) {
        setExpanded(false);
      }
    },
    [expanded],
  );

  const onSheetPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      sheetDragRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        lastY: event.clientY,
      };
      setIsSheetDragging(true);
      setSheetDragY(0);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const onSheetPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = sheetDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const deltaY = event.clientY - drag.startY;
      drag.lastY = event.clientY;
      setSheetDragY(expanded ? Math.max(0, deltaY) : Math.min(0, deltaY));
    },
    [expanded],
  );

  const onSheetPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = sheetDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const deltaY = drag.lastY - drag.startY;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      finishSheetDrag(deltaY);
    },
    [finishSheetDrag],
  );

  return (
    <main className="app-shell">
      <section className="phone" aria-label="GomMap 모바일 앱">
        <div className="phone-chrome">
        <header className="topbar">
          <h1>GomMap</h1>
          <div className="profile-wrap">
            {showChoco ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="love-bubble"
                src={loveSrc}
                alt="곰지연씨 사랑해!"
                width={176}
                height={48}
              />
            ) : null}
            <button
              type="button"
              className="profile-btn"
              aria-label={showChoco ? "곰 프로필로 돌아가기" : "초코 프로필 보기"}
              aria-pressed={showChoco}
              onClick={() => setShowChoco((value) => !value)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="profile"
                src={showChoco ? chocoSrc : gomSrc}
                alt={showChoco ? "초코 프로필" : "곰 프로필"}
                width={48}
                height={48}
              />
            </button>
          </div>
        </header>

        <div className="search-wrap">
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(event) => {
              setIsComposing(false);
              setQuery(event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (event.nativeEvent.isComposing || isComposing) return;
                runSearch();
              }
            }}
            placeholder="어디를 찾고 있나요?"
            aria-label="장소 검색"
          />
          {query ? (
            <button
              className="clear"
              type="button"
              onClick={() => setQuery("")}
              aria-label="검색어 지우기"
            >
              <Icon name="close" />
            </button>
          ) : null}
          <button
            className="search-btn"
            type="button"
            onClick={runSearch}
            aria-label="검색"
          >
            검색
          </button>
        </div>

        <nav
          ref={chipsScrollRef}
          className="chips"
          aria-label={mapMode === "saved" ? "저장 태그 필터" : "검색 결과 필터"}
          onPointerDown={onHScrollPointerDown}
          onPointerMove={onHScrollPointerMove}
          onPointerUp={onHScrollPointerUp}
          onPointerCancel={onHScrollPointerUp}
        >
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
            >
              {item}
            </button>
          ))}
        </nav>
        </div>

        <section className="map" aria-label="장소 지도">
          <KakaoMap
            searchRequest={searchRequest}
            category={category}
            selectedPlaceId={selectedVisible?.id ?? null}
            locateRequestId={locateRequestId}
            pinnedPlaces={pinnedPlaces}
            onSelectPlace={setSelected}
            onSearchStatus={setSearchStatus}
            onSearchResults={setSearchResults}
          />

          <div className="map-mode-badge" role="status">
            {modeLabel}
          </div>
          {mapMode === "saved" && savedOnMap.length === 0 && (
            <div className="empty-map">
              {category === "전체"
                ? "저장한 장소가 없어요"
                : `저장한 ${category}이(가) 없어요`}
              <br />
              <small>태그를 바꾸거나 장소를 저장해 보세요</small>
            </div>
          )}
          {mapMode === "search" && searchStatus === "loading" && (
            <div className="map-status" role="status">
              검색 중…
            </div>
          )}
          {mapMode === "search" && searchStatus === "empty" && (
            <div className="empty-map">
              검색 결과가 없어요
              <br />
              <small>다른 검색어를 입력해 보세요</small>
            </div>
          )}
          {mapMode === "search" && searchStatus === "error" && (
            <div className="empty-map" role="alert">
              검색에 실패했어요
              <br />
              <button type="button" className="retry-btn" onClick={runSearch}>
                다시 시도
              </button>
            </div>
          )}
          {mapMode === "search" &&
            searchStatus === "ok" &&
            category !== "전체" &&
            filteredResults.length === 0 &&
            searchResults.length > 0 && (
              <div className="empty-map">
                {category === "데이트" || category === "기타"
                  ? `${category}는 저장 시 붙이는 태그예요`
                  : `${category} 결과가 없어요`}
                <br />
                <small>
                  {customTags.includes(category) &&
                  category !== "맛집" &&
                  category !== "카페"
                    ? "저장한 장소에서 확인해 보세요"
                    : "전체 필터로 다시 살펴보세요"}
                </small>
              </div>
            )}

          <button
            className="locate"
            type="button"
            aria-label="현재 위치로 이동"
            onClick={() => setLocateRequestId((value) => value + 1)}
          >
            <Icon name="target" />
          </button>

          {selectedVisible ? (
            <article className="selected-place">
              <div className="place-info">
                <div className="place-title-row">
                  <strong>{selectedVisible.name}</strong>
                  {selectedVisible.category ? (
                    <em className="category-tag">{selectedVisible.category}</em>
                  ) : null}
                </div>
                <small>
                  {selectedVisible.roadAddress || selectedVisible.address}
                  {selectedVisible.phone ? ` · ${selectedVisible.phone}` : ""}
                </small>
                {isVisibleSaved ? (
                  <div className="tag-row compact" aria-label="저장 태그 변경">
                    {saveTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={
                          (selectedVisible.userTag ||
                            suggestSaveTag(selectedVisible)) === tag
                            ? "active"
                            : ""
                        }
                        onClick={() => updateSavedTag(selectedVisible.id, tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="tag-row compact" aria-label="저장 태그 선택">
                    {saveTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={saveTag === tag ? "active" : ""}
                        onClick={() => setSaveTag(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
                <div className="place-actions-inline">
                  {selectedVisible.placeUrl ? (
                    <a
                      href={selectedVisible.placeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="place-link"
                    >
                      카카오맵에서 보기
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="place-actions">
                <button
                  type="button"
                  className="share-btn"
                  onClick={() => handleShare(selectedVisible)}
                  aria-label="선택한 장소 공유"
                >
                  <Icon name="share" />
                </button>
                <button
                  type="button"
                  className={`heart${isVisibleSaved ? " saved" : ""}`}
                  onClick={() => toggleSaved(selectedVisible, saveTag)}
                  aria-label={
                    isVisibleSaved ? "선택한 장소 저장 해제" : "선택한 장소 저장"
                  }
                >
                  <Icon name="heart" />
                </button>
              </div>
            </article>
          ) : (
            <article className="selected-place placeholder">
              <div className="place-info">
                <div className="place-title-row">
                  <strong>동네와 키워드로 검색해 보세요</strong>
                </div>
                <small>예: 마곡 카페 · 마커를 눌러 저장할 수 있어요</small>
              </div>
            </article>
          )}
        </section>

        <section
          className={`sheet ${expanded ? "expanded" : "collapsed"}${isSheetDragging ? " dragging" : ""}`}
          style={
            isSheetDragging || sheetDragY
              ? { transform: `translateY(${sheetDragY}px)` }
              : undefined
          }
        >
          <div
            className="sheet-drag-zone"
            onPointerDown={onSheetPointerDown}
            onPointerMove={onSheetPointerMove}
            onPointerUp={onSheetPointerUp}
            onPointerCancel={onSheetPointerUp}
          >
            <button
              className="sheet-handle"
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? "저장 목록 접기" : "저장 목록 펼치기"}
            >
              <span />
            </button>
            <div className="sheet-heading">
              <div>
                <p>MY PLACES</p>
                <h2>
                  저장한 장소 <span>{savedOnMap.length}</span>
                </h2>
              </div>
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => {
                  if (expanded) showSavedOnMap();
                  else {
                    setExpanded(true);
                    setEditingTags(false);
                  }
                }}
              >
                {expanded ? "지도 보기" : "전체 보기"}
              </button>
            </div>
          </div>

          {expanded ? (
            <div className="tag-editor">
              <div
                ref={sheetFilterScrollRef}
                className="tag-row sheet-list-filter"
                aria-label="저장 목록 태그 필터"
                onPointerDown={onHScrollPointerDown}
                onPointerMove={onHScrollPointerMove}
                onPointerUp={onHScrollPointerUp}
                onPointerCancel={onHScrollPointerUp}
              >
                <span>분류</span>
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={category === item ? "active" : ""}
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  className={`tag-edit-toggle${editingTags ? " active" : ""}`}
                  aria-pressed={editingTags}
                  onClick={() => {
                    setEditingTags((value) => !value);
                    setRenamingTag(null);
                    setRenameDraft("");
                  }}
                >
                  {editingTags ? "완료" : "편집"}
                </button>
              </div>

              {editingTags ? (
                <div className="tag-edit-panel" aria-label="분류 편집">
                  <ul className="tag-edit-list">
                    {saveTags.map((tag) => (
                      <li key={tag} className="tag-edit-item">
                        {renamingTag === tag ? (
                          <>
                            <input
                              value={renameDraft}
                              onChange={(event) =>
                                setRenameDraft(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  commitRenameTag();
                                }
                              }}
                              aria-label={`${tag} 새 이름`}
                              maxLength={12}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={commitRenameTag}
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => {
                                setRenamingTag(null);
                                setRenameDraft("");
                              }}
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <strong>{tag}</strong>
                            <button
                              type="button"
                              onClick={() => startRenameTag(tag)}
                            >
                              이름 변경
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => deleteCustomTag(tag)}
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="tag-add-row">
                    <input
                      value={newTagDraft}
                      onChange={(event) => setNewTagDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addCustomTag();
                        }
                      }}
                      placeholder="새 분류 이름"
                      aria-label="새 분류 이름"
                      maxLength={12}
                    />
                    <button type="button" onClick={addCustomTag}>
                      추가
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {expanded && selectedVisible && !isVisibleSaved ? (
            <div className="tag-row" aria-label="저장 태그 선택">
              <span>저장 태그</span>
              {saveTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={saveTag === tag ? "active" : ""}
                  onClick={() => setSaveTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : null}

          {expanded ? (
            <div className="place-list">
              {savedOnMap.length ? (
                savedOnMap.map((place) => (
                  <article
                    className="place-card"
                    key={place.id}
                    onClick={() => handleSelectSaved(place)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelectSaved(place);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={`place-thumb ${getPlaceTone(place)}`}>
                      <span>{getPlaceEmoji(place)}</span>
                    </div>
                    <div className="place-copy">
                      <div
                        className="tag-row compact card-tags"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        {saveTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className={
                              (place.userTag || suggestSaveTag(place)) === tag
                                ? "active"
                                : ""
                            }
                            onClick={() => updateSavedTag(place.id, tag)}
                            aria-label={`${place.name} 태그를 ${tag}(으)로 변경`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      <h3>
                        <span className="place-name">{place.name}</span>
                        {place.category ? (
                          <em className="category-tag">{place.category}</em>
                        ) : null}
                      </h3>
                      <p>{place.note || place.address}</p>
                    </div>
                    <div className="place-actions">
                      <button
                        className="share-btn"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleShare(place);
                        }}
                        aria-label={`${place.name} 공유`}
                      >
                        <Icon name="share" />
                      </button>
                      <button
                        className="heart saved"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSaved(place);
                        }}
                        aria-label={`${place.name} 저장 해제`}
                      >
                        <Icon name="heart" />
                      </button>
                    </div>
                  </article>
                ))
              ) : saved.length ? (
                <div className="empty-list">
                  <span>✦</span>
                  <strong>
                    {category === "전체"
                      ? "표시할 장소가 없어요"
                      : `저장한 ${category}이(가) 없어요`}
                  </strong>
                  <p>다른 분류를 선택하거나 카드에서 태그를 바꿔 보세요.</p>
                </div>
              ) : (
                <div className="empty-list">
                  <span>♡</span>
                  <strong>아직 저장한 장소가 없어요</strong>
                  <p>지도에서 마음에 드는 곳을 저장해 보세요.</p>
                </div>
              )}
            </div>
          ) : null}

          {expanded && selectedVisible && !isVisibleSaved ? (
            <button
              className="save-cta"
              type="button"
              onClick={() => toggleSaved(selectedVisible, saveTag)}
            >
              <Icon name="bookmark" />
              이 장소 저장하기
            </button>
          ) : null}
        </section>

        {toast ? (
          <div className="toast" role="status">
            {toast}
          </div>
        ) : null}
      </section>

      <aside className="desktop-note">
        <span>GOMMAP</span>
        <h2>
          좋아하는 장소를
          <br />
          잊지 않도록.
        </h2>
        <p>검색하고, 분류하고, 나만의 메모와 함께 간직하세요.</p>
      </aside>
    </main>
  );
}
