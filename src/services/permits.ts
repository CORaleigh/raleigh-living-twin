import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Extent from "@arcgis/core/geometry/Extent";
import type { DistrictConfig, Permit } from "../types";

const PERMITS_URL =
  "https://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/Building_Permits/FeatureServer/0";

/**
 * "Active permitting" = the in-progress statuses. Verified against the live
 * service: completed permits use 'Occupancy' / 'Permit Finaled', which we exclude.
 */
export const ACTIVE_WHERE =
  "statuscurrentmapped IN ('In Review','Fees/Payment','Application Accepted') AND estprojectcost > 0";

const OUT_FIELDS = [
  "OBJECTID",
  "projectname",
  "proposedworkdescription",
  "estprojectcost",
  "permittypemapped",
  "workclassmapped",
  "housingunitstotal",
  "numberstories",
  "statuscurrentmapped",
  "originaladdress1"
];

/** Shared layer instance — queries hit the service directly, no map needed. */
export const permitsLayer = new FeatureLayer({ url: PERMITS_URL, outFields: OUT_FIELDS });

function toPermit(g: __esri.Graphic): Permit {
  const a = g.attributes ?? {};
  const geom = g.geometry as __esri.Point | null;
  const cost = Number(a.estprojectcost) || 0;
  const name: string =
    (a.projectname && String(a.projectname).trim()) ||
    (a.proposedworkdescription && String(a.proposedworkdescription).trim().slice(0, 48)) ||
    `Permit ${a.OBJECTID}`;
  let narrative: string = (a.proposedworkdescription || "").trim();
  if (narrative.length > 160) narrative = narrative.slice(0, 157) + "…";
  return {
    objectId: Number(a.OBJECTID),
    name,
    cost,
    type: (a.permittypemapped || a.workclassmapped || "Permit").trim(),
    status: (a.statuscurrentmapped || "Active").trim(),
    units: a.housingunitstotal > 0 ? Number(a.housingunitstotal) : null,
    floors: a.numberstories > 0 ? Number(a.numberstories) : null,
    address: (a.originaladdress1 || "").trim() || "Raleigh",
    narrative,
    lon: geom ? geom.longitude ?? geom.x : NaN,
    lat: geom ? geom.latitude ?? geom.y : NaN
  };
}

function extentOf(d: DistrictConfig): Extent {
  const [xmin, ymin, xmax, ymax] = d.extent;
  return new Extent({ xmin, ymin, xmax, ymax, spatialReference: { wkid: 4326 } });
}

/** Top-N most valuable active permits inside a district's extent. */
export async function queryTopPermits(d: DistrictConfig, num = 8): Promise<Permit[]> {
  const q = permitsLayer.createQuery();
  q.where = ACTIVE_WHERE;
  q.geometry = extentOf(d);
  q.spatialRelationship = "intersects";
  q.orderByFields = ["estprojectcost DESC"];
  q.num = num;
  q.returnGeometry = true;
  q.outFields = OUT_FIELDS;
  q.outSpatialReference = { wkid: 4326 } as __esri.SpatialReferenceProperties;
  const res = await permitsLayer.queryFeatures(q);
  return res.features.map(toPermit).filter((p) => p.cost > 0 && !Number.isNaN(p.lon));
}

/** Count + summed valuation of active permits within a district (aggregate beacon). */
export async function queryDistrictStats(d: DistrictConfig): Promise<{ n: number; total: number }> {
  const q = permitsLayer.createQuery();
  q.where = ACTIVE_WHERE;
  q.geometry = extentOf(d);
  q.spatialRelationship = "intersects";
  q.outStatistics = [
    { statisticType: "count", onStatisticField: "OBJECTID", outStatisticFieldName: "n" },
    { statisticType: "sum", onStatisticField: "estprojectcost", outStatisticFieldName: "v" }
  ] as __esri.StatisticDefinitionProperties[];
  q.returnGeometry = false;
  const res = await permitsLayer.queryFeatures(q);
  const a = res.features[0]?.attributes ?? {};
  return { n: Number(a.n) || 0, total: Number(a.v) || 0 };
}

/** Citywide active totals for the KPI cards. */
export async function queryCityStats(): Promise<{ n: number; total: number }> {
  const q = permitsLayer.createQuery();
  q.where = ACTIVE_WHERE;
  q.outStatistics = [
    { statisticType: "count", onStatisticField: "OBJECTID", outStatisticFieldName: "n" },
    { statisticType: "sum", onStatisticField: "estprojectcost", outStatisticFieldName: "v" }
  ] as __esri.StatisticDefinitionProperties[];
  q.returnGeometry = false;
  const res = await permitsLayer.queryFeatures(q);
  const a = res.features[0]?.attributes ?? {};
  return { n: Number(a.n) || 0, total: Number(a.v) || 0 };
}

export function fmtCost(v: number): { val: string; unit: string } {
  if (v >= 1e9) return { val: (v / 1e9).toFixed(2), unit: "B" };
  if (v >= 1e6) return { val: (v / 1e6).toFixed(v < 1e7 ? 1 : 0), unit: "M" };
  return { val: Math.round(v / 1e3).toString(), unit: "K" };
}
