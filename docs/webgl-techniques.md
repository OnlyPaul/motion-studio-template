# WebGL techniques

A vocabulary of 3D effects for launch films, how to build each under the render contract, and
what it costs here. "Built" means it was built in an earlier 16 s study film (no longer in this
repo) and verified in stills and a playback strip; everything else is a recipe that hasn't been
tested yet. `examples/webgl-three.html` is the working starting point.

Costs below were measured on the study's machine; treat them as relative guides. Headless
Chromium renders WebGL on **SwiftShader** (CPU), so they are times to seek and capture one
1920×1080 frame on one page.

## Setup that works

```html
<script type="importmap">{ "imports": {
  "three": "/node_modules/three/build/three.module.js",
  "three/addons/": "/node_modules/three/examples/jsm/"
} }</script>
```

- Build everything once in the scenes builder: renderer on the stage's context, geometry,
  materials, `InstancedMesh`es, per-instance seeds from `rand(seed, i)`, canvas textures,
  and the composer.
- Every frame, set instance matrices, camera, uniforms and pass flags from `t`, then
  `renderer.resetState(); composer.render(0)`. Pass `0` explicitly: without it,
  `EffectComposer` reads its internal `Timer` (wall clock) for the delta. `check` can't see that, because
  it only lints your own files.
- Chain: `RenderPass → (BokehPass) → OutputPass → custom grain pass`. `OutputPass` applies
  `renderer.toneMapping` and sRGB, so set `toneMapping` on the renderer and leave materials alone.
- Several scenes share one camera and one composer. Switch `renderPass.scene` and `pass.enabled`
  per section.
- 2D drawn after the GL draw can use `vector.project(camera)`: the camera matrices are current
  for that frame.

**Banned by the contract:** passes that keep history between frames (`AfterimagePass`,
`TAARenderPass`, anything with feedback buffers). A frame is painted from nothing. Use
`render.mjs --sub` for motion blur.

## Catalogue

| Effect | Technique | Status | Recipe |
|---|---|---|---|
| Opening paper storm | `InstancedMesh` of thin boxes, scattered and tumbling, shadowed onto a ground | **Built** (01) | Seeds per instance; rotation `noise(t * f, i)`; `castShadow` + `receiveShadow` on the mesh |
| Sheets stack into a ribbon | Per-instance morph between two states, staggered along the curve | **Built** | `p = spring(t - (t0 + u0 * stagger), SPRING.heavy)`; lerp position (plus an arc `sin(πp)`), `slerpQuaternions` |
| Ribbon of slabs; final ring | Slabs aligned to a closed curve: thin axis on the tangent, twist along it; the curve itself morphs to a circle | **Built** | Tangent by finite difference; `Matrix4.makeBasis(X, Y, T)`; flow with `u = (u0 + v * t) % 1` (a closed curve hides the wrap) |
| Reticle locks onto one sheet, `P7` | 2D HUD bound to a 3D point | **Built** | `v.copy(p).project(cam)` → pixels; skip when `v.z ≥ 1` (behind the camera); brackets close as they fade in |
| Requests/second counter | Odometer | **Built** (2D) | Each place rolls only in the last 15% before its digit changes, so carries ripple up |
| Letterbox opening, then full frame | 2.39:1 bars in the 2D layer | **Built** | Landscape only; bars sit under the HUD |
| Box city / maze field | `InstancedMesh` heightfield, stepped heights from 2D value noise, backlit sun, fog to haze | **Built** (02) | Box geometry translated so `y = 0` is the base; height = `scale.y`; beat ripples are summed pulses over distance |
| Shallow focus on the lifted card | `BokehPass`, focus = distance to subject every frame | **Built** | `bokeh.uniforms.focus.value = cam.position.distanceTo(subject)` |
| Crane up to a hazy horizon | Heavy spring on camera height and target | **Built** | Keep the end frame populated; a crane into pure fog reads as a dead hold |
| Sun haze | Sprite with a radial canvas texture, `fog: false` | **Built** | Far behind the field; additive for glows, normal for haze |
| Card tunnel | Textured instances flying at the camera on beat surges | **Built** (03) | One `CanvasTexture` card face drawn once; `z = -((ph·D − travel(t)) mod D)`; fog hides the wrap at the far end; `travel = v·t + Σ spring(t − beat_k)` |
| Light rays in the tunnel | Radial speed lines | **Built** (2D) | Seeded angles, phase `(rand + t·speed) % 1`, alpha `sin(π·phase)` |
| Word swaps over the tunnel | Slice smear | **Built** (2D) | Pre-render the word; strips offset by `rand · (1 − p)²` under a blur |
| Pixel mosaic between chapters | 2D cell dissolve, scene switch under full cover | **Built** (2D) | Cover order `rand(91, i)`, uncover order `rand(92, i)` |
| Grain, vignette, RGB split | Final `ShaderPass` | **Built** | Seed `Math.round(t * fps)` so the subframes of one frame share the grain |
| Motion blur on everything fast | Subframe accumulation | **Built** | `render.mjs` default `--sub 4 --shutter 0.5` |
| Sheet folds into a paper plane | Rigid-panel fold | Recipe | Model the plane as 4–6 triangles hinged on the sheet's crease lines; each panel's hinge angle is `spring(t − t_k)`. Or morph between two meshes with matching vertex order in the vertex shader (`mix(flat, folded, u)`) |
| Plane flock with line trails | Analytic paths | Recipe | Position = pure function `path(t, seed)` (summed sines or curl-like field). The trail is a `Line` sampling `path(t − k·dt)` for k = 0…N each frame: history without state |
| Vortex to a point, white flash | Paths converge to one point | Recipe | Blend each `path` towards a centre with a heavy spring; 2–4 white frames in 2D |
| 3D bar chart, dark reflective floor, spotlight | Lit boxes, mirrored floor, glow sprite | Recipe | `Reflector` from `three/addons/objects/Reflector.js` (costly), or a mirrored copy of the bars under a semi-transparent floor (cheap); additive sprite for the light cone; leader labels in 2D via `project()` |
| Outline `21×` in 3D, then flat violet `21×` | 3D → 2D match cut | Recipe | Draw the outline in 2D at the projected anchor, cut on the beat to the same glyphs, flat, at the same screen position |
| Floating cards joined by gradient arcs | Planes in 3D, arcs projected | Recipe | Cards as textured planes; arcs as 2D quadratic Béziers between projected anchors with a gradient stroke |
| Bokeh highlights behind blown sheets | Additive sprites, out of focus | Recipe | Soft disc sprites far behind; or `BokehPass` with a near focus |
| Pastel mesh background | Moving gaussian blobs | Recipe | One fullscreen fragment shader summing 4–6 blobs whose centres follow `noise(t)`; or 2D radial gradients |
| Point-cloud morph | `Points` with several target-position attributes | Recipe | Upload plane, vase, torus positions as attributes; `mix` them in the vertex shader by uniforms set from `t` |

## Cost

Measured on the study film's three sections with `render.mjs --workers 1` at 1920×1080: a 5.2 s
segment of each at 30 fps, 156 captures each, including page start-up.

| Section | Content | s/capture |
|---|---|---|
| 01 sheets | 900 instances, shadow map 2048 + PCFSoft, fog, 600 dust points, grain pass | 0.15 |
| 02 field | 4,032 instances, shadow map 2048, fog, BokehPass, grain | 0.51 |
| 03 tunnel | 150 textured instances, additive sprite, grain, 2D lines and smear | 0.15 |

The full study (16 s, 60 fps × 4 subframes = 3,840 captures, 6 workers) rendered in 858 s.

- **BokehPass is the most expensive item.** A profiler run with and without it put it at about
  half of the field's frame time, and the 4,032-box shadow map at about a third. Use DOF only
  where shallow focus carries meaning, and keep those sections short. Fit the shadow camera to
  what the lens sees; 1024 is often enough.
- Instance counts in the thousands are cheap on the CPU side (matrix updates take a few ms).
- **Workers barely help WebGL on SwiftShader, which already uses every core per page.** The field
  segment took 79 s with 1 worker and 79 s with 6. The full render took 858 s against a ≈1,030 s
  serial estimate. Leave the default; don't expect it to scale.
- `--scale 0.5` only downsizes after capture, so a WebGL animatic costs full price per frame. For
  quick motion checks, render a section with `--from/--to` at `--fps 30 --sub 1`.
- Budget a render as `dur × fps × sub × s/capture`. Check stills first.
