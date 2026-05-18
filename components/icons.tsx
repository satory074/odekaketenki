type IconProps = { className?: string; size?: number };

function svg(props: { size?: number; className?: string; children: React.ReactNode }) {
  const s = props.size ?? 16;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

export function SearchIcon({ className, size }: IconProps) {
  return svg({
    size,
    className,
    children: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  });
}

export function ClearIcon({ className, size }: IconProps) {
  return svg({
    size,
    className,
    children: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
  });
}

export function LocateIcon({ className, size }: IconProps) {
  return svg({
    size,
    className,
    children: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3" />
        <path d="M12 19v3" />
        <path d="M2 12h3" />
        <path d="M19 12h3" />
      </>
    ),
  });
}

export function PinIcon({ className, size }: IconProps) {
  return svg({
    size,
    className,
    children: (
      <>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
  });
}

export function ClockIcon({ className, size }: IconProps) {
  return svg({
    size: size ?? 14,
    className,
    children: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  });
}

export function CloseIcon({ className, size }: IconProps) {
  return svg({
    size: size ?? 18,
    className,
    children: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
  });
}

export function ChevronLeftIcon({ className, size }: IconProps) {
  return svg({
    size: size ?? 20,
    className,
    children: <path d="m15 18-6-6 6-6" />,
  });
}

export function ChevronRightIcon({ className, size }: IconProps) {
  return svg({
    size: size ?? 20,
    className,
    children: <path d="m9 18 6-6-6-6" />,
  });
}

export function GridIcon({ className, size }: IconProps) {
  return svg({
    size,
    className,
    children: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
  });
}

export function Spinner({ className, size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      className={`animate-spin ${className ?? "text-slate-500"}`}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 1-9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
