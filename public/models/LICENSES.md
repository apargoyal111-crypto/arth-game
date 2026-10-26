# Model licenses

| File | Source | Author | License |
|---|---|---|---|
| `man.glb` | "Locomotion collection – Sam 3D Person, Animated": https://www.innerscene.com/tools/library/3d-parts/locomotion-collection-sam-3d-person-animated-dc23800f | Innerscene (built from MakeHuman/MPFB CC0 assets) | **CC0 1.0** (public domain dedication) |
| `woman.glb` | "Locomotion collection – Harper 3D Person, Animated": https://www.innerscene.com/tools/library/3d-parts/locomotion-collection-harper-3d-person-animated-797e1e2a | Innerscene (built from MakeHuman/MPFB CC0 assets) | **CC0 1.0** |

Modifications made for the web (also CC0): kept only the idle / walk / run clips (renamed `idle`, `walk`, `run`), removed the held-accessory mesh, simplified meshes (meshoptimizer, about 45%), converted textures to WebP at 1024 px or less, and quantized vertices (KHR_mesh_quantization; no decoder needed). Tools: glTF-Transform and sharp.

Hero/heroine looks (अपारा, रिया, काव्या, …) are original fictional styles made by recolouring these CC0 models at runtime. They are not based on any real person.

three.js (MIT) is in `../vendor/` (see `three-LICENSE.txt`). All town textures are generated on the device at runtime (no image assets).

Earlier Mixamo-derived models (soldier/michelle/Xbot) were never committed to this repository and are not used.

## Oct 2026 update
- Models are now the meshopt-compressed versions (EXT_meshopt_compression, ~1.75 MB / ~1.8 MB). Decoder: `../vendor/jsm/libs/meshopt_decoder.module.js` (meshoptimizer, MIT).
- Indian everyday outfits (कुर्ता-पजामा, शर्ट-पैंट, सलवार-कमीज़, साड़ी colours), stripe/check/booti print patterns, wider Indian skin-tone range, hair colours (grey for older people) are all runtime shader recolours of the same CC0 models — no new assets.
- Punch, sit, wave, stagger and action poses are procedural bone rotations in code (no extra animation files).
- `town.js` layout, all buildings, props and textures are generated in code (no image or model assets).

## Premium + driving update
- Sounds (ambience, birds, crickets, market murmur, music pad, clicks, footsteps, punch, horn, engine) are synthesised at runtime with WebAudio in `public/audio.js`, so there are no audio files.
- Vehicles (car, auto-rickshaw, scooter) are procedural low-poly meshes in code.
- Window glow, water ripple, contact-shadow and particle textures are canvas-generated.
- Font: Mukta from Google Fonts (SIL Open Font License 1.1), loaded from fonts.googleapis.com.
