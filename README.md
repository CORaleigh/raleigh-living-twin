# Raleigh Living Twin

An animated ArcGIS digital twin of Raleigh that spotlights the city's **largest
active building permits** as glowing beacons over the real 3D city — organized as
**district "chapters"** so 146 mi² stays as legible as a downtown block.

- **City overview** — a slow orbit over the whole city; each focus district shows
  one **aggregate beacon** (height = total active valuation).
- **District chapters** — click a district (selector or its beacon) to fly in; its
  top active permits rise as individual beacons, tallest = most valuable.
- **Live data** — buildings, trees, and permits all come from public City of
  Raleigh services. No API key required.

## Data sources (all public)

| Purpose        | Service |
| -------------- | ------- |
| 3D buildings   | `tiles.arcgis.com/…/Raleigh_3D_Buildings_2022/SceneServer` |
| 3D trees       | `tiles.arcgis.com/…/Raleigh_3D_Trees/SceneServer` |
| Building permits | `services.arcgis.com/…/Building_Permits/FeatureServer/0` |

"Active" permits = `statuscurrentmapped IN ('In Review','Fees/Payment','Application Accepted')`
(verified against the live service — completed permits use `Occupancy` / `Permit Finaled`).

## Run it

```bash
npm install
npm run dev        # opens http://localhost:5173
```

Optional: copy `.env.example` to `.env` and add a free
[ArcGIS API key](https://developers.arcgis.com) as `VITE_ARCGIS_API_KEY` to
upgrade the basemap/ground to Esri's hosted dark 3D basemap. Without a key the app
runs against the public SceneLayers over a flat dark ground.

## Project structure

```
src/
  config/districts.ts   # curated chapter districts: center, extent, camera bookmark
  services/permits.ts   # live FeatureLayer queries (top-N, per-district + city stats)
  scene/twin.ts         # Map + SceneView + buildings/trees SceneLayers + beacon layer
  scene/beacons.ts      # PointSymbol3D/LineSymbol3D beacons (individual + aggregate)
  scene/orbit.ts        # auto-orbit camera loop (pauses on interaction)
  ui/selector.ts        # district chapter buttons
  ui/spotlight.ts       # bottom-right spotlight card
  ui/kpis.ts            # citywide KPI cards
  state.ts              # tiny observable store (view mode + selected permit)
  main.ts               # orchestration
```

## Known next steps

- **District boundaries** — extents in `config/districts.ts` are approximate boxes.
  Swap for real boundary polygons (Council Districts or a custom planning-area
  layer) and query with `spatialRelationship: "contains"` for exact filtering.
- **Guided tour mode** — auto-advance City → each district → back for kiosk display.
- **Local ArcGIS assets** — assets currently load from the Esri CDN; use
  `@arcgis/core` `assetsPath` + a copy step for fully offline builds.
- **Refresh** — re-query on a timer (permits update daily) to keep beacons live.
