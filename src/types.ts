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
  media?: ProjectMedia; // rendering(s) for the 3D turntable, if we have any
}

// Curated renderings for a known project, matched onto a live permit.
export interface ProjectMedia {
  colorUrl: string;        // the rendering image
  depthUrl?: string;       // grayscale depth map; enables the relief mesh
  displacementScale?: number;
  credit: string;          // required attribution line
}

export interface DistrictConfig {
  id: string;
  name: string;
  center: [number, number]; // [lon, lat]
  extent: [number, number, number, number]; // [xmin, ymin, xmax, ymax] WGS84
  camera: { zoom: number; tilt: number; heading: number };
}

export interface DistrictData extends DistrictConfig {
  permits: Permit[];
  total: number;
  count: number;
}

// "city" = overview; a number indexes into DISTRICTS.
export type ViewMode = "city" | number;
