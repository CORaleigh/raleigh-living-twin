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

// Keyless dark basemap (World Dark Gray Base tiles). Used when no API key is
// set; with a key we use Esri's "dark-gray-3d" basemap instead.
function esriDarkBasemap(): Basemap {
  // These tiles are only cached to ~zoom 16, so cap the LODs and let ArcGIS
  // overzoom rather than request tiles that don't exist.
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
    basemap: hasApiKey ? "dark-gray-3d" : esriDarkBasemap(),
    // world-elevation keeps the SceneLayers on the terrain and ground-relative
    // beacons at the right height.
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
      // Fixed low evening sun for long shadows. A later UTC time = lower sun.
      lighting: {
        type: "sun",
        date: new Date("2026-03-15T22:15:00Z"), // ~6:15pm local
        directShadowsEnabled: true,
        cameraTrackingEnabled: false
      } as __esri.SunLighting,
      weather: { type: "foggy", fogStrength: 0.05 } as __esri.FoggyWeather
    },
    ui: { components: ["attribution"] },
    // Off so clicking buildings/trees can't select them; clicks handled in main.ts.
    popupEnabled: false,
    camera: { position: { longitude: -78.665, latitude: 35.79, z: 6000 }, tilt: 58, heading: 0 }
  });

  return { view, beaconLayer };
}
