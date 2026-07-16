# GomMap

카카오맵으로 장소를 검색하고, 즐겨찾기를 로컬에 보관하는 모바일 웹 앱입니다.

## 시작하기

1. 의존성 설치

```bash
npm install
```

2. 환경변수 설정

`.env.example`을 참고해 `.env.local`을 만듭니다.

```env
NEXT_PUBLIC_KAKAO_MAP_KEY=카카오_자바스크립트_키
```

- 반드시 **JavaScript 키**를 사용하세요.
- REST API 키 / Admin 키는 프론트엔드에 넣지 마세요.
- 변경 후 개발 서버를 다시 시작하세요.

3. 카카오 개발자 콘솔에서 JavaScript SDK 도메인 등록

- 로컬: `http://localhost:3000`
- GitHub Pages: `https://sooyachoco.github.io`

4. 개발 서버 실행

```bash
npm run dev
```

## GitHub Pages

저장소 Settings → Secrets and variables → Actions에 다음 secret을 등록합니다.

- `NEXT_PUBLIC_KAKAO_MAP_KEY`

`main` 브랜치 push 시 `/GomMap/` 경로로 정적 배포됩니다.

## 스크립트

- `npm run dev` — 로컬 개발
- `npm run lint` — ESLint
- `npm run build` — 정적 export (`out/`)
