# 🌧️ ज़िंदगी ऑनलाइन — Zindagi Online

एक साझा, हमेशा चलने वाली दुनिया जिसमें असली खिलाड़ी पुणे में जन्म लेते हैं, जीते हैं, दोस्ती-शादी करते हैं, एक-दूसरे को कॉल करते हैं और मरते हैं।
A shared, always-on Hindi life-simulation world with an authoritative Node.js server.

## 🏙️ 3D शहर / 3D town client (default)
`/` is now a third-person 3D town built with three.js (bundled locally in `public/vendor/`, so no CDN is needed). The old 2D client is still at **`/classic.html`**.
- Move with the joystick (left), drag on the right to turn the camera, and hold 🏃 दौड़ to run. On desktop: WASD/arrows, mouse drag, Shift to run.
- Landmarks: 🏠 घर, 🏫 स्कूल/कॉलेज, 🏢 ऑफ़िस, 🏥 अस्पताल, 🛒 बाज़ार, 🛕 मंदिर, 🌳 पार्क. Walk into a glowing ring to open that year's choice card. The 🏙️ शहर tab closes the panel.
- Other online players are shown live with name tags. Tap one or walk near them to open their profile (message, friend, propose, call). NPC residents wander the roads (only on your screen).
- Day/night cycle (1 cycle = 10 world days) and rain during monsoon-flood events.
- Protocol addition: client sends `{t:'pos',x,z,ry}` (at most ~8/s). The server clamps it to ±`MAP_HALF` (default 90), uses its own limiter separate from the chat rate limit, keeps it in memory only, and broadcasts `{t:'poses',list:[{id,x,z,ry,n,g,a}]}` every 125 ms.

### 👤 Realistic characters & looks
- Humans are CC0 MakeHuman-based rigged models (Innerscene "Sam" and "Harper") with idle/walk/run clips that crossfade. Materials are PBR (MeshPhysical with skin sheen), skin tone is seeded per player, and everyday clothing colours vary. Sources and licenses: `public/models/LICENSES.md`.
- Looks (pick at signup or with the 👗 लुक button): सामान्य, the hero **अपारा**, and 10 original heroines (रिया, काव्या, तारा, निशा, मीरा, आन्या, ज़ारा, इरा, सिया, नैना). All are fictional and not based on real people. The server field `look` is whitelisted (`setLook` message) and visible to everyone.
- ⚙️ quality toggle: ऑटो / HD / हल्का. Low quality lowers the pixel ratio and turns off shadows and clearcoat. Far characters animate less often (LOD).
- Environment: sky shader with sun/moon/stars, clouds, birds, fireflies, street lamps with night glow, auto-rickshaws and scooters, footpaths, temple shikhara with flags, hospital ambulance, school playground, bazaar stalls, park benches and flowers. Roads look wet in rain. Textures are generated in the browser, so they add no download size.
- The server gzips responses (`compression`).

## 📁 संरचना / Structure
```
online/
  server/server.js   Express + ws server (authoritative, world clock, social, signaling)
  server/engine.js   Life engine: 71 age-gated events + 13 luck/trouble events
  server/test.js     End-to-end test (3 WebSocket clients)
  server/package.json
  public/index.html  3D client shell (HUD/panels) + public/game3d.js (three.js scene)
  public/classic.html Original 2D client
  public/vendor/     three.js r186 (MIT)
```

## ▶️ चलाना / Run locally
```bash
cd server
npm install
npm start            # http://localhost:3000
npm run dev          # DEV_FAST=1: everything 3600x faster (pregnancy 72 s)
npm test             # full automated test (~40 s)
```
Node 18+ required.

### Environment variables
| Var | Default | Meaning |
|---|---|---|
| `PORT` | 3000 | HTTP/WS port |
| `DATA_FILE` | `server/data/world.json` | World save file (atomic write every 3 s). **Put it on a persistent volume in production.** |
| `PREGNANCY_HOURS` | 72 | Real wait before birth (9 months → 8 h/month) |
| `TURN_SECONDS` | 60 | Active (online) seconds between life turns |
| `WORLD_DAY_SECONDS` | 60 | Real seconds per world day (360 days = world year) |
| `TIME_SCALE` | 1 | Divides all durations above (testing). `DEV_FAST=1` = 3600 |
| `HEARTBEAT_MS` | 15000 | Ping interval; missed pong → player SLEEPING |
| `RATE_PER_SEC` / `RATE_BURST` | 6 / 30 | Per-connection message rate limit |
| `TURN_URL`, `TURN_USER`, `TURN_PASS` | – | Optional TURN server (comma-separated URLs) |

## ⏱️ गति / Pacing
- **गर्भ / Pregnancy:** 3 real days (server timestamps; continues while offline). Every new life needs another 3-day wait.
- **जीवन / Life = 5 game-years.** One game-year = 20 human-age years; each turn = 1 human-age year (ages 0-4 are one quick turn). So a full life ≈ 96 turns (age 100 maximum; most die earlier).
- A turn unlocks after `TURN_SECONDS` (60 s) of **ACTIVE** time. The life clock only runs while you are connected; when you disconnect you are **SLEEPING** and your life pauses, while the world keeps going. Default: ≈ 20 active minutes per game-year, ≈ 1.5–2 hours of play per full life.
- **दुनिया / World:** 1 world day = 60 s. NPC residents marry, have children and die; world events (Diwali, Ganeshotsav, monsoon flood, market crash/boom, election, flu) hit every living player and appear in the live feed.

## 👥 Multiplayer
Players list (sleeping players dimmed), profiles, persisted 1:1 chat, friend requests, marriage proposals (both 18+, friends, unmarried; accept/decline), kids with a real spouse, divorce/death handled for both. Friends and spouse add रिश्ते/खुशी every turn. All stats live on the server; clients only send choice indices. Identity = random token issued at signup, stored in the browser's localStorage (`?token=...` in the URL also works, handy for testing).

## 📞 Voice calls
1:1 WebRTC audio, signaling over the same WebSocket (ring / accept / decline / busy / hangup / offer / answer / ice). STUN: `stun:stun.l.google.com:19302`. The mic is requested only when you start or accept a call.
- **getUserMedia needs HTTPS** (or `http://localhost`). Over plain HTTP on a LAN IP, calls will not work.
- STUN alone fails behind strict/symmetric NAT (common on mobile data). For reliable calls add a TURN server: self-host **coturn** on a VPS, or use a paid TURN service (usually priced per GB relayed; check current pricing). Set `TURN_URL=turn:your.host:3478`, `TURN_USER`, `TURN_PASS`.

## 🧪 Test with 2 browsers
1. `npm run dev` (fast mode).
2. Open `http://localhost:3000` in Chrome and in a private/incognito window (or another browser). Each one gets its own token.
3. Sign up in both and wait about 72 s to be born. Then go to लोग → देखें → दोस्ती, संदेश, शादी (after 18), 📞 कॉल.
4. Close one tab: the other sees it dimmed (😴 sleeping). Reopen it and it resumes.

## ☁️ Deployment & approximate costs (as of Oct 2026, verify current pricing)
| Option | Approx. cost | Caveats |
|---|---|---|
| Render free | $0 | Spins down after 15 min idle (about 1 min cold start); **filesystem lost** on spin-down/redeploy; no disks. Fine for a demo only. |
| Render Starter + disk | ~$7/mo + $0.25/GB disk | Always on, HTTPS included. Mount the disk and set `DATA_FILE` on it. |
| Railway Hobby | $5/mo (includes $5 usage) | Usage-based; add a volume (~$0.15/GB) for `DATA_FILE`. |
| Fly.io | ~$2–4/mo (256–512 MB shared VM) | Per-second billing, no free tier (trial only); use a Fly volume. |
| Small VPS (DigitalOcean, Hetzner…) | ~$4–6/mo | Full control; run with pm2/systemd behind Caddy or nginx with free Let's Encrypt HTTPS; can also host coturn. |
| Domain | ~$10–15/yr | Optional (platforms give a subdomain). |
| TURN | $0 self-hosted coturn on your VPS (bandwidth counts), or paid per-GB | Needed for reliable calls on strict NAT. |

HTTPS is mandatory for the mic. It is included on Render/Railway/Fly, and free via Let's Encrypt on a VPS. The server keeps everything in one process plus a JSON file, so run **one instance only**; don't scale horizontally.

## ⚠️ Limitations
- Single process with a JSON file: fine for hundreds of players; use a real DB beyond that.
- Token auth only (no password or recovery): a lost token means a lost character.
- No moderation/blocking tools for chat yet; voice is 1:1 only.
- Later lives reuse the same Pune birth story.
