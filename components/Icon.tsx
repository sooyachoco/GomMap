import type { ReactNode } from "react";

type IconName = "search" | "bookmark" | "heart" | "target" | "close";

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
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
