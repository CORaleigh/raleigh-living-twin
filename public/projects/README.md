# Project renderings (turntable assets)

Each project the turntable can show needs a folder here matching the id used in
`src/config/projectMedia.ts`:

```
public/projects/
  nashsquare/
    color.jpg     # the rendering (required)
    depth.png     # grayscale depth map (optional; enables the relief mesh)
  400h/
    color.jpg
    depth.png
```

Paths are referenced as `projects/<id>/color.jpg` and resolved against the Vite
base path, so they work in both `npm run dev` and the built site.

## color.jpg
The rendering image. A ~1600px-wide JPG/PNG is plenty. Landscape works best.

## depth.png (optional but recommended)
Grayscale, same dimensions as color. White = near, black = far. With a depth map
the turntable displaces a subdivided plane into a relief and rotates it with real
parallax. Without it, the turntable falls back to a flat rotating slab.

Ways to make one:
- Depth-estimation model, e.g. Depth-Anything or MiDaS (best quality). Run once
  offline and save the output PNG here.
- Or paint a rough depth map by hand in any image editor (near objects lighter,
  sky/background darker). A crude map still reads well on a slow turntable.

## Licensing
These renderings are third-party copyrighted works. This viewer is intended for
an INTERNAL demo. Do not publish the images publicly (e.g. to the GitHub Pages
site) without permission from the rights holder. Keep the credit line in
`projectMedia.ts` accurate.
