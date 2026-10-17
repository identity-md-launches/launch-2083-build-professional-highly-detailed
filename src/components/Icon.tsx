export type IconName =
  | "arrow"
  | "external"
  | "sun"
  | "moon"
  | "close"
  | "check"
  | "copy"
  | "plus"
  | "minus"
  | "wallet"
  | "pause"
  | "play"
  | "refresh"
  | "chevron"
  | "code"
  | "clock"
  | "layers"
  | "shield"
  | "spark"
  | "menu";
const paths: Record<IconName, React.ReactNode> = {
  arrow: (
    <>
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6m0-6-9 9M10 5H5v14h14v-5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
    </>
  ),
  moon: <path d="M20 14a8 8 0 0 1-10-10A8 8 0 1 0 20 14Z" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V4H4v12h4" />
    </>
  ),
  plus: <path d="M5 12h14M12 5v14" />,
  minus: <path d="M5 12h14" />,
  wallet: (
    <>
      <path d="M20 8V5H4v15h16v-5M4 8h17v8h-6V9" />
      <circle cx="17" cy="12" r=".6" />
    </>
  ),
  pause: (
    <>
      <path d="M8 5v14M16 5v14" />
    </>
  ),
  play: <path d="m8 4 12 8-12 8z" />,
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" />
    </>
  ),
  chevron: <path d="m8 5 7 7-7 7" />,
  code: (
    <>
      <path d="m7 6-6 6 6 6m10-12 6 6-6 6M14 3l-4 18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l4 2" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 10 5-10 5L2 8zm-9 9 9 5 9-5m-18 5 9 5 9-5" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  spark: <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
};
export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

export function ClockMark() {
  return (
    <svg
      className="clock-mark"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="15"
        cy="17"
        r="11.5"
        stroke="currentColor"
        strokeWidth="2.3"
      />
      <path
        d="M15 9v8l5 3M15 3V1M29 17h2M1 17h2M15 29v2"
        stroke="currentColor"
        strokeWidth="2.3"
      />
      <path d="M25 2v6h6V2z" fill="var(--color-teal)" />
    </svg>
  );
}
