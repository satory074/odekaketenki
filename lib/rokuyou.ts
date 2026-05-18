import {
  ROKUYOU_END_YEAR,
  ROKUYOU_START_YEAR,
  ROKUYOU_TABLE,
} from "./rokuyou-table";

export type Rokuyou =
  | "senshou"
  | "tomobiki"
  | "senbu"
  | "butsumetsu"
  | "taian"
  | "shakkou";

// Index = (lunar_month + lunar_day) % 6.
// Convention: lunar 1月1日 → (1+1)%6 = 2 must map to 先勝.
const INDEX_TO_KEY: readonly Rokuyou[] = [
  "taian",
  "shakkou",
  "senshou",
  "tomobiki",
  "senbu",
  "butsumetsu",
];

const LABEL_FULL: Record<Rokuyou, string> = {
  senshou: "先勝",
  tomobiki: "友引",
  senbu: "先負",
  butsumetsu: "仏滅",
  taian: "大安",
  shakkou: "赤口",
};

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

function dayOfYear(year: number, month1: number, day: number): number {
  const monthLengths = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let doy = 0;
  for (let m = 0; m < month1 - 1; m += 1) {
    doy += monthLengths[m];
  }
  return doy + (day - 1);
}

function tableIndex(year: number, month1: number, day: number): number | null {
  if (year < ROKUYOU_START_YEAR || year > ROKUYOU_END_YEAR) return null;
  let offset = 0;
  for (let y = ROKUYOU_START_YEAR; y < year; y += 1) {
    offset += daysInYear(y);
  }
  return offset + dayOfYear(year, month1, day);
}

export function getRokuyou(isoDate: string): Rokuyou | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const year = Number(m[1]);
  const month1 = Number(m[2]);
  const day = Number(m[3]);
  const idx = tableIndex(year, month1, day);
  if (idx === null || idx < 0 || idx >= ROKUYOU_TABLE.length) return null;
  const code = ROKUYOU_TABLE.charCodeAt(idx) - 48;
  if (code < 0 || code > 5) return null;
  return INDEX_TO_KEY[code];
}

export function rokuyouLabel(r: Rokuyou): string {
  return LABEL_FULL[r];
}
