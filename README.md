# Raleigh Living Twin

A 3D map of Raleigh that shows the largest active building permits as beacons
over the real buildings. The city view has one beacon per district (height =
total active valuation); clicking a district flies in and shows its top permits
as individual beacons.

Built with [`@arcgis/core`](https://www.npmjs.com/package/@arcgis/core), Vite,
and TypeScript. No backend, no API key required.

## Data sources (all public)

| Purpose          | Service |
| ---------------- | ------- |
| 3D buildings     | `tiles.arcgis.com/…/Raleigh_3D_Buildings_2022/SceneServer` |
| 3D trees         | `tiles.arcgis.com/…/Raleigh_3D_Trees/SceneServer` |
| Building permits | `services.arcgis.com/…/Building_Permits/FeatureServer/0` |

Active permits are filtered with
`statuscurrentmapped IN ('In Review','Fees/Payment','Application Accepted')`.
Completed permits (`Occupancy` / `Permit Finaled`) are excluded.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build to dist/
```

To use Esri's hosted `dark-gray-3d` basemap, copy `.env.example` to `.env` and
set `VITE_ARCGIS_API_KEY` to an [ArcGIS API key](https://developers.arcgis.com).
Without one the app falls back to the free dark basemap.

## Layout

```
src/
  config/districts.ts   district extents + camera positions
  services/permits.ts   FeatureLayer queries
  scene/twin.ts         Map + SceneView setup
  scene/beacons.ts      3D beacon graphics
  scene/orbit.ts        auto-orbit camera
  ui/selector.ts        district tab bar
  ui/spotlight.ts       project detail panel
  ui/kpis.ts            citywide KPI cards
  state.ts              observable store
  main.ts               wiring
```

## TODO

- District extents are approximate boxes; swap for real boundary polygons for
  exact filtering.
- Re-query permits on a timer to keep the data fresh.
- Bundle the ArcGIS assets locally for offline builds (`assetsPath` + copy step).
