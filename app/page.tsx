"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import KakaoMap, { type SearchStatus } from "@/components/KakaoMap";
import { Icon } from "@/components/Icon";
import {
  filterPlacesByCategory,
  getPlaceEmoji,
  getPlaceTone,
  loadSavedPlaces,
  persistSavedPlaces,
  type PlaceCategoryFilter,
  type SavedPlace,
} from "@/lib/places";

const categories: PlaceCategoryFilter[] = ["전체", "맛집", "카페", "데이트", "기타"];

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSaved(loadSavedPlaces());
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (storageReady) persistSavedPlaces(saved);
  }, [saved, storageReady]);

  const filteredResults = useMemo(
    () => filterPlacesByCategory(searchResults, category),
    [searchResults, category],
  );

  const isSelectedSaved = Boolean(
    selected && saved.some((place) => place.id === selected.id),
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }, []);

  const runSearch = useCallback(() => {
    if (isComposing) return;
    const keyword = query.trim();
    if (!keyword) return;
    setSearchRequest({ keyword, requestId: Date.now() });
  }, [isComposing, query]);

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
        (place.category === "카페" || place.category === "맛집"
          ? place.category
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
    setSelected(place);
    setExpanded(false);
  };

  return (
    <main className="app-shell">
      <section className="phone" aria-label="GomMap 모바일 앱">
        <header className="topbar">
          <div className="brand-mark">
            <Icon name="bookmark" />
          </div>
          <div>
            <p className="eyebrow">나만의 장소 컬렉션</p>
            <h1>GomMap</h1>
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

        <nav className="chips" aria-label="장소 카테고리">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <section className="map" aria-label="장소 지도">
          <KakaoMap
            searchRequest={searchRequest}
            category={category}
            selectedPlaceId={selected?.id ?? null}
            locateRequestId={locateRequestId}
            onSelectPlace={setSelected}
            onSearchStatus={setSearchStatus}
            onSearchResults={setSearchResults}
          />

          {searchStatus === "loading" && (
            <div className="map-status" role="status">
              검색 중…
            </div>
          )}
          {searchStatus === "empty" && (
            <div className="empty-map">
              검색 결과가 없어요
              <br />
              <small>다른 검색어를 입력해 보세요</small>
            </div>
          )}
          {searchStatus === "error" && (
            <div className="empty-map" role="alert">
              검색에 실패했어요
              <br />
              <button type="button" className="retry-btn" onClick={runSearch}>
                다시 시도
              </button>
            </div>
          )}
          {searchStatus === "ok" &&
            category !== "전체" &&
            filteredResults.length === 0 &&
            searchResults.length > 0 && (
              <div className="empty-map">
                {category === "데이트" || category === "기타"
                  ? `${category}는 저장 시 붙이는 태그예요`
                  : `${category} 결과가 없어요`}
                <br />
                <small>
                  {category === "데이트" || category === "기타"
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

          {selected ? (
            <article className="selected-place">
              <div>
                <span>{selected.category}</span>
                <strong>{selected.name}</strong>
                <small>
                  {selected.roadAddress || selected.address}
                  {selected.phone ? ` · ${selected.phone}` : ""}
                </small>
                {selected.placeUrl ? (
                  <a
                    href={selected.placeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="place-link"
                  >
                    카카오맵에서 보기
                  </a>
                ) : null}
              </div>
              <button
                type="button"
                className={isSelectedSaved ? "saved" : ""}
                onClick={() => toggleSaved(selected)}
                aria-label="선택한 장소 저장"
              >
                <Icon name="heart" />
              </button>
            </article>
          ) : (
            <article className="selected-place placeholder">
              <div>
                <span>안내</span>
                <strong>장소를 검색해 보세요</strong>
                <small>마커를 선택하면 상세 정보가 나타나요</small>
              </div>
            </article>
          )}
        </section>

        <section className={`sheet ${expanded ? "expanded" : ""}`}>
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
                저장한 장소 <span>{saved.length}</span>
              </h2>
            </div>
            <button type="button" onClick={() => setExpanded((value) => !value)}>
              {expanded ? "지도 보기" : "전체 보기"}
            </button>
          </div>

          {selected && !isSelectedSaved ? (
            <div className="tag-row" aria-label="저장 태그 선택">
              <span>저장 태그</span>
              {(["맛집", "카페", "데이트", "기타"] as const).map((tag) => (
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

          <div className="place-list">
            {saved.length ? (
              saved.map((place) => (
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
                    <small>{place.userTag || place.category}</small>
                    <h3>{place.name}</h3>
                    <p>{place.note || place.address}</p>
                  </div>
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
                </article>
              ))
            ) : (
              <div className="empty-list">
                <span>♡</span>
                <strong>아직 저장한 장소가 없어요</strong>
                <p>지도에서 마음에 드는 곳을 저장해 보세요.</p>
              </div>
            )}
          </div>

          <button
            className={`save-cta ${isSelectedSaved ? "is-saved" : ""}`}
            type="button"
            disabled={!selected}
            onClick={() => selected && toggleSaved(selected, saveTag)}
          >
            <Icon name={isSelectedSaved ? "heart" : "bookmark"} />
            {isSelectedSaved ? "저장한 장소예요" : "이 장소 저장하기"}
          </button>
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
