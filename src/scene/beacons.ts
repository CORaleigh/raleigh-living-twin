import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import Polyline from "@arcgis/core/geometry/Polyline";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import PointSymbol3D from "@arcgis/core/symbols/PointSymbol3D";
import LineSymbol3D from "@arcgis/core/symbols/LineSymbol3D";
import PathSymbol3DLayer from "@arcgis/core/symbols/PathSymbol3DLayer";
import IconSymbol3DLayer from "@arcgis/core/symbols/IconSymbol3DLayer";
import type { DistrictData, Permit } from "../types";

const AMBER_HI: [number, number, number] = [255, 214, 148];

const WGS84 = { wkid: 4326 };

/**
 * A beacon's anchor point. The 3D scene draws the beam + dot at this location;
 * the returned anchors also let callers know which permit/district each beacon
 * represents. One anchor per beacon keeps positions in a single place.
 */
export interface BeaconAnchor {
  lon: number;
  lat: number;
  /** tip height in meters — matches the beam height so the card sits at the top */
  height: number;
  kind: "district" | "permit";
  /** the largest beacon in the current set (drives the expanded "hero" card) */
  hero: boolean;
  permit?: Permit;
  district?: DistrictData;
}

function verticalLine(lon: number, lat: number, heightMeters: number, width: number): Graphic {
  const line = new Polyline({
    hasZ: true,
    paths: [
      [
        [lon, lat, 0],
        [lon, lat, heightMeters]
      ]
    ],
    spatialReference: WGS84
  });
  const symbol = new LineSymbol3D({
    symbolLayers: [
      // translucent glow beam behind…
      new PathSymbol3DLayer({ profile: "quad", width: width * 3.6, height: width * 3.6, material: { color: [255, 177, 74, 0.22] }, castShadows: false }),
      // …bright core in front
      new PathSymbol3DLayer({ profile: "quad", width, height: width, material: { color: AMBER_HI }, castShadows: false })
    ]
  });
  return new Graphic({ geometry: line, symbol });
}

function tipDot(lon: number, lat: number, heightMeters: number, sizePx: number, attributes: object): Graphic {
  const point = new Point({ longitude: lon, latitude: lat, z: heightMeters, hasZ: true, spatialReference: WGS84 });
  const symbol = new PointSymbol3D({
    symbolLayers: [
      // soft halo (also widens the clickable target)
      new IconSymbol3DLayer({ resource: { primitive: "circle" }, material: { color: [255, 177, 74, 0.32] }, size: sizePx * 2.2 }),
      // solid glowing core
      new IconSymbol3DLayer({
        resource: { primitive: "circle" },
        material: { color: AMBER_HI },
        outline: { color: [255, 255, 255, 0.95], size: 1.5 },
        size: sizePx
      })
    ]
  });
  return new Graphic({ geometry: point, symbol, attributes });
}

/** Individual permit beacons — height scales with valuation across the set. */
export function renderPermitBeacons(layer: GraphicsLayer, permits: Permit[]): BeaconAnchor[] {
  layer.removeAll();
  if (!permits.length) return [];
  const max = Math.max(...permits.map((p) => p.cost));
  const min = Math.min(...permits.map((p) => p.cost));
  const anchors: BeaconAnchor[] = [];
  permits.forEach((p, i) => {
    const norm = (p.cost - min) / Math.max(1, max - min);
    const h = 130 + norm * 400; // meters — taller so they read against the skyline
    const isHero = i === 0; // permits arrive sorted by cost desc
    layer.add(verticalLine(p.lon, p.lat, h, isHero ? 6 : 3.5));
    layer.add(tipDot(p.lon, p.lat, h, isHero ? 22 : 14, { kind: "permit", objectId: p.objectId }));
    anchors.push({ lon: p.lon, lat: p.lat, height: h, kind: "permit", hero: isHero, permit: p });
  });
  return anchors;
}

/** City overview — one aggregate beacon per district, height scales with total value. */
export function renderDistrictBeacons(layer: GraphicsLayer, districts: DistrictData[]): BeaconAnchor[] {
  layer.removeAll();
  const maxTotal = Math.max(1, ...districts.map((d) => d.total));
  const anchors: BeaconAnchor[] = [];
  districts.forEach((d) => {
    const [lon, lat] = d.center;
    const h = 200 + (d.total / maxTotal) * 900; // meters — aggregate beacons tower
    layer.add(verticalLine(lon, lat, h, 7));
    layer.add(tipDot(lon, lat, h, 24, { kind: "district", districtId: d.id }));
    anchors.push({ lon, lat, height: h, kind: "district", hero: d.total === maxTotal, district: d });
  });
  return anchors;
}

export function clearBeacons(layer: GraphicsLayer): void {
  layer.removeAll();
}
