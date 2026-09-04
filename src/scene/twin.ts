import Map from "@arcgis/core/Map";
import SceneView from "@arcgis/core/views/SceneView";
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Basemap from "@arcgis/core/Basemap";
import WebTileLayer from "@arcgis/core/layers/WebTileLayer";
import TileInfo from "@arcgis/core/layers/support/TileInfo";

const BUILDINGS_URL =
  "https://tiles.arcgis.com/tiles/v400IkDOw1ad7Yad/arcgis/rest/services/Raleigh_3D_Buildings_2022/SceneServer";
const TREES_URL =
  "https://tiles.arcgis.com/tiles/v400IkDOw1ad7Yad/arcgis/rest/services/Raleigh_3D_Trees/SceneServer";

export interface Twin {
  view: SceneView;
  beaconLayer: GraphicsLayer;
}

/**
 * Keyless Esri dark basemap using the World Dark Gray Base tile service (free,
 * no API key). Matches the control-room palette and gives street context under
 * the 3D buildings. If an Esri API key is present we prefer Esri's
 * "dark-gray-3d" instead.
 */
function esriDarkBasemap(): Basemap {
  // The keyless World Dark Gray Base is only cached to ~zoom 16. Cap the LODs so
  // ArcGIS overzooms (upsamples the deepest available tile) when we fly into a
  // district, instead of requesting missing tiles and drawing nothing.
  const tileInfo = TileInfo.create({ size: 256 });
  tileInfo.lods = tileInfo.lods.filter((lod) => lod.level <= 16);
  return new Basemap({
    baseLayers: [
      new WebTileLayer({
        urlTemplate:
          "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{level}/{row}/{col}",
        copyright: "Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS user community",
        tileInfo
      })
    ],
    title: "Esri Dark Gray",
    id: "esri-dark-gray"
  });
}

export function createTwin(container: string, hasApiKey: boolean): Twin {
  const buildings = new SceneLayer({ url: BUILDINGS_URL, title: "Raleigh 3D Buildings" });
  const trees = new SceneLayer({ url: TREES_URL, title: "Raleigh 3D Trees" });

  // Beacons live above the scene surface (Z is meters above ground).
  const beaconLayer = new GraphicsLayer({
    title: "Active permit beacons",
    elevationInfo: { mode: "relative-to-ground" }
  });

  const map = new Map({
    // Always use world elevation so the buildings/trees SceneLayers (which carry
    // real-world elevation) sit correctly on the terrain and the ground-relative
    // beacons start at the right height. An API key only upgrades the basemap.
    basemap: hasApiKey ? "dark-gray-3d" : esriDarkBasemap(),
    ground: "world-elevation",
    layers: [buildings, trees, beaconLayer]
  });

  const view = new SceneView({
    container,
    map,
    qualityProfile: "high",
    environment: {
      background: { type: "color", color: [7, 11, 22, 1] },
      starsEnabled: true,
      atmosphereEnabled: true,
      // Low evening sun (fixed, not camera-tracked) throws long directional
      // shadows and warm rim-light across the massing — far more dramatic than
      // flat "virtual" lighting. Tune the drama by moving the time of day: a
      // later UTC time = lower sun = longer shadows.
      lighting: {
        type: "sun",
        date: new Date("2026-03-15T22:15:00Z"), // ≈ 6:15pm over Raleigh — golden, raking light
        directShadowsEnabled: true,
        cameraTrackingEnabled: false
      } as __esri.SunLighting,
      // Thin haze so distant districts fall back and the foreground reads.
      weather: { type: "foggy", fogStrength: 0.05 } as __esri.FoggyWeather
    },
    ui: { components: ["attribution"] },
    // No popups: clicking a building or tree must not select/highlight it. All
    // click interaction is handled by our own beacon hit-test in main.ts.
    popupEnabled: false,
    camera: { position: { longitude: -78.665, latitude: 35.79, z: 6000 }, tilt: 58, heading: 0 }
  });

  return { view, beaconLayer };
}
