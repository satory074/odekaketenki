export type Station = {
  id: string;
  name: string;
  prefecture: string;
  lat: number;
  lng: number;
};

export type DailyRecord = {
  tmax: (number | null)[];
  tmin: (number | null)[];
  tavg: (number | null)[];
  prcp: (number | null)[];
  sunshine: (number | null)[];
  wind: (number | null)[];
  humidity?: (number | null)[];
};

export type StationData = {
  station_id: string;
  name: string;
  prefecture: string;
  lat: number;
  lng: number;
  years: number[];
  daily: Record<string, DailyRecord>;
};

export type Percentiles = {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

export type RainShare = {
  none: number;
  light: number;
  moderate: number;
  heavy: number;
};

export type YearOutcome = {
  year: number;
  n: number;
  rainDays: number;
  maxPrcp: number;
  tmaxMean: number;
  tminMean: number;
};

export type DailyOffset = {
  offset: number;
  tmax: number;
  tmin: number;
  rainProb: number;
};

export type SampleRecord = {
  year: number;
  offset: number;
  monthDay: string;
  tmax: number | null;
  tmin: number | null;
  tavg: number | null;
  prcp: number | null;
  sunshine: number | null;
  wind: number | null;
  humidity: number | null;
};

export type Aggregated = {
  n: number;
  rainProb: number;
  heavyRainProb: number;
  avgPrcp: number;
  avgTmax: number;
  avgTmin: number;
  avgTavg: number;
  hotDayProb: number;
  coldDayProb: number;
  avgSunshine: number;
  avgWind: number;
  avgHumidity: number | null;
  tmaxDist: Percentiles;
  tminDist: Percentiles;
  windDist: Percentiles;
  rainShare: RainShare;
  byYear: YearOutcome[];
  byOffset: DailyOffset[];
  samples: SampleRecord[];
  expectedSampleDays: number;
  yearRange: { start: number; end: number };
};

export type RiskLevel = "low" | "mid" | "high";

export type ScoreReport = {
  rain: RiskLevel;
  heat: RiskLevel;
  cold: RiskLevel;
  wind: RiskLevel;
  total: number;
};

export type DiagnoseResult = {
  date: string;
  stats: Aggregated;
  scores: ScoreReport;
  comment: string;
};

export type DiagnoseResponse = {
  station: {
    id: string;
    name: string;
    prefecture: string;
    distanceKm: number;
  };
  results: DiagnoseResult[];
};

export type GeocodeCandidate = {
  name: string;
  lat: number;
  lng: number;
  prefecture?: string;
  country?: string;
};
