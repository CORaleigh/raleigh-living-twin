import type { Permit, ProjectMedia } from "../types";

const asset = (p: string) => import.meta.env.BASE_URL + p;

interface KnownProject {
  namePattern: RegExp; // match a live permit by name
  media: ProjectMedia;
  demo?: Omit<Permit, "media">; // injected so the project always shows in the demo
}

// Hand-maintained. colorUrl/depthUrl live under public/projects/<id>/.
// depthUrl is optional: without it the turntable falls back to a flat slab.
const KNOWN: KnownProject[] = [
  {
    namePattern: /nash\s*square/i,
    media: {
      colorUrl: asset("projects/nashsquare/color.jpg"),
      depthUrl: asset("projects/nashsquare/depth.png"),
      displacementScale: 0.18,
      credit: "Rendering: Nash Square Hotel administrative alternate — dtraleigh.com"
    },
    demo: {
      objectId: -1001,
      name: "Nash Square Hotel",
      cost: 60_000_000,
      type: "Hotel",
      status: "Proposed",
      units: 200,
      floors: 12,
      address: "Martin St @ Nash Square",
      narrative: "Proposed downtown hotel fronting Nash Square.",
      lon: -78.6425,
      lat: 35.7776
    }
  },
  {
    namePattern: /\b400\s*h\b|400\s*hillsborough/i,
    media: {
      colorUrl: asset("projects/400h/color.jpg"),
      depthUrl: asset("projects/400h/depth.png"),
      modelUrl: asset("projects/400h/model.glb"),
      displacementScale: 0.2,
      credit: "Rendering: 400H — 400hraleigh.com"
    },
    demo: {
      objectId: -1002,
      name: "400H Mixed-Use High-Rise",
      cost: 150_000_000,
      type: "Mixed Use",
      status: "Under construction",
      units: 242,
      floors: 20,
      address: "400 Hillsborough St",
      narrative: "554,893 sqft mixed-use high-rise on Hillsborough Street.",
      lon: -78.6449,
      lat: 35.7815
    }
  }
];

// Media for a live permit whose name matches a known project.
export function mediaForPermit(name: string): ProjectMedia | undefined {
  return KNOWN.find((k) => k.namePattern.test(name))?.media;
}

// Demo permits to inject into a district so the beacons always appear.
export function demoPermitsFor(districtId: string): Permit[] {
  if (districtId !== "downtown") return [];
  return KNOWN.filter((k) => k.demo).map((k) => ({ ...(k.demo as Omit<Permit, "media">), media: k.media }));
}
