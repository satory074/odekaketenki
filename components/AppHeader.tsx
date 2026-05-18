import Link from "next/link";

type Props = {
  searchSlot?: React.ReactNode;
  placeBadge?: React.ReactNode;
  actions?: React.ReactNode;
};

export function AppHeader({ searchSlot, placeBadge, actions }: Props) {
  return (
    <header
      role="banner"
      className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75"
    >
      <div className="mx-auto flex w-full max-w-screen-2xl items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-md py-1 pr-1 transition-colors hover:opacity-90"
          aria-label="お出かけ天気ナビ ホーム"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm"
          >
            <BrandMark />
          </span>
          <h1 className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
            お出かけ天気ナビ
          </h1>
        </Link>

        {placeBadge && (
          <div className="hidden min-w-0 sm:block">{placeBadge}</div>
        )}

        {searchSlot && (
          <div className="ml-auto min-w-0 flex-1 sm:max-w-md lg:max-w-lg">
            {searchSlot}
          </div>
        )}

        {actions && (
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

function BrandMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="9" r="3.5" />
      <path d="M17 13a4 4 0 0 0-4-4 5 5 0 0 0-9.6 1.5A3.5 3.5 0 0 0 4 17h13a3 3 0 1 0 0-6Z" />
    </svg>
  );
}
