import Map from "@arcgis/core/Map";
import SceneView from "@arcgis/core/views/SceneView";
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Basemap from "@arcgis/core/Basemap";
import WebTileLayer from "@arcgis/core/layers/WebTileLayer";

const BUILDINGS_URL =
  "https://tiles.arcgis.com/tiles/v400IkDOw1ad7Yad/arcgis/rest/services/Raleigh_3D_Buildings_2022/SceneServer";
const TREES_URL =
  "https://tiles.arcgis.com/tiles/v400IkDOw1ad7Yad/arcgis/rest/services/Raleigh_3D_Trees/SceneServer";

export interface Twin {
  view: SceneView;
  beaconLayer: GraphicsLayer;
}

/**
 * Keyless dark basemap from CARTO (free, no API key). Matches the control-room
 * palette and gives street context under the 3D buildings. If an Esri API key is
 * present we prefer Esri's "dark-gray-3d" instead.
 */
function cartoDarkBasemap(): Basemap {
  return new Basemap({
    baseLayers: [
      new WebTileLayer({
        urlTemplate: "https://{subDomain}.basemaps.cartocdn.com/dark_all/{level}/{col}/{row}.png",
        subDomains: ["a", "b", "c", "d"],
        copyright: "© OpenStreetMap contributors © CARTO"
      })
    ],
    title: "CARTO Dark",
    id: "carto-dark"
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
    basemap: hasApiKey ? "dark-gray-3d" : cartoDarkBasemap(),
    ground: "world-elevation",
    layers: [buildings, trees, beaconLayer]
  });

  const view = new SceneView({
    container,
    map,
    qualityProfile: "high",
    environment: {
      background: { type: "color", color: [7, 11, 22, 1] },
      starsEnabled: false,
      atmosphereEnabled: true,
      lighting: { type: "virtual", directShadowsEnabled: true } as __esri.VirtualLighting
    },
    ui: { components: ["attribution"] },
    camera: { position: { longitude: -78.665, latitude: 35.79, z: 6000 }, tilt: 58, heading: 0 }
  });

  return { view, beaconLayer };
}
