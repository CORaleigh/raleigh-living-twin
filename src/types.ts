export interface Permit {
  objectId: number;
  name: string;
  cost: number;
  type: string;
  status: string;
  units: number | null;
  floors: number | null;
  address: string;
  narrative: string;
  lon: number;
  lat: number;
}

export interface DistrictConfig {
  id: string;
  name: string;
  /** [lon, lat] centroid used for the district camera bookmark + aggregate beacon. */
  center: [number, number];
  /** [xmin, ymin, xmax, ymax] in WGS84 — the spatial filter for this district's permits. */
  extent: [number, number, number, number];
  camera: { zoom: number; tilt: number; heading: number };
}

export interface DistrictData extends DistrictConfig {
  permits: Permit[];
  total: number;
  count: number;
}

/** "city" = the overview chapter; a number = index into DISTRICTS. */
export type ViewMode = "city" | number;
