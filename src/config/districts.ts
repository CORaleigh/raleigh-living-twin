import type { DistrictConfig } from "../types";

/**
 * Curated "chapter" districts. Each is a recognizable place (not a council
 * district) with a bounding extent that drives its permit query, and a camera
 * bookmark the SceneView flies to. Extents are approximate WGS84 boxes — refine
 * against a real boundary layer (Council Districts / a custom planning-area
 * polygon) when you want exact spatial filtering.
 */
export const DISTRICTS: DistrictConfig[] = [
  {
    id: "downtown",
    name: "Downtown",
    center: [-78.6395, 35.7796],
    extent: [-78.652, 35.770, -78.628, 35.790],
    camera: { zoom: 16, tilt: 66, heading: 20 }
  },
  {
    id: "northhills",
    name: "North Hills",
    center: [-78.6420, 35.8380],
    extent: [-78.655, 35.828, -78.629, 35.848],
    camera: { zoom: 16, tilt: 64, heading: 15 }
  },
  {
    id: "glenwood",
    name: "Glenwood South",
    center: [-78.6470, 35.7890],
    extent: [-78.658, 35.781, -78.639, 35.797],
    camera: { zoom: 16, tilt: 64, heading: 25 }
  },
  {
    id: "dixwarehouse",
    name: "Warehouse / Dix",
    center: [-78.6480, 35.7720],
    extent: [-78.660, 35.763, -78.637, 35.780],
    camera: { zoom: 16, tilt: 64, heading: -10 }
  },
  {
    id: "briercreek",
    name: "Brier Creek",
    center: [-78.7840, 35.9070],
    extent: [-78.805, 35.895, -78.765, 35.920],
    camera: { zoom: 15, tilt: 62, heading: 0 }
  }
];

/** The city-overview establishing shot. */
export const CITY_CAMERA = { center: [-78.665, 35.83] as [number, number], zoom: 11.4, tilt: 58, heading: 0 };
