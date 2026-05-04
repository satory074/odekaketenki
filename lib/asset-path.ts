const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function assetPath(p: string): string {
  if (!p.startsWith("/")) return `${BASE}/${p}`;
  return `${BASE}${p}`;
}
