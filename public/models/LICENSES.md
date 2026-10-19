# Model licenses

| File | Source | Author | License |
|---|---|---|---|
| `man.glb` | "Locomotion collection – Sam 3D Person, Animated": https://www.innerscene.com/tools/library/3d-parts/locomotion-collection-sam-3d-person-animated-dc23800f | Innerscene (built from MakeHuman/MPFB CC0 assets) | **CC0 1.0** (public domain dedication) |
| `woman.glb` | "Locomotion collection – Harper 3D Person, Animated": https://www.innerscene.com/tools/library/3d-parts/locomotion-collection-harper-3d-person-animated-797e1e2a | Innerscene (built from MakeHuman/MPFB CC0 assets) | **CC0 1.0** |

Modifications made for the web (also CC0): kept only the idle / walk / run clips (renamed `idle`, `walk`, `run`), removed the held-accessory mesh, simplified meshes (meshoptimizer, about 45%), converted textures to WebP at 1024 px or less, and quantized vertices (KHR_mesh_quantization; no decoder needed). Tools: glTF-Transform and sharp.

Hero/heroine looks (अपारा, रिया, काव्या, …) are original fictional styles made by recolouring these CC0 models at runtime. They are not based on any real person.

three.js (MIT) is in `../vendor/` (see `three-LICENSE.txt`). All town textures are generated on the device at runtime (no image assets).

Earlier Mixamo-derived models (soldier/michelle/Xbot) were never committed to this repository and are not used.
