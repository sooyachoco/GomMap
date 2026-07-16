import type { ReactNode } from "react";

type IconName =
  | "search"
  | "bookmark"
  | "heart"
  | "target"
  | "close"
  | "share"
  | "diary";

const paths: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  bookmark: <path d="M7 4.5h10v16l-5-3.2L7 20.5z" />,
  heart: (
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.3A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  close: (
    <>
      <path d="m7 7 10 10M17 7 7 17" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 13.2 7.5 4.1M15.7 6.7l-7.5 4.1" />
    </>
  ),
  diary: (
    <>
      <path d="M6 4.5h11.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H6" />
      <path d="M6 4.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2" />
      <path d="M9 8.5h7M9 12h7M9 15.5h4" />
    </>
  ),
};
export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
