# Vice City UZ 🎮🌴

Uzbek-style GTA driving game built with Three.js. Two islands, one city, infinite freedom.

**Play it:** Open `index.html` in a browser (needs a local server due to ES modules).

## Features

- **3D city:** Vice City-style map with two islands, ocean, beaches, palm trees
- **Uzbek everything:** Chevrolet Cobalt, Nexia, Damas, Matiz — real cars Uzbeks drive. Piyoda in do'ppi, ayollar in atlas dresses, choyxona, Chorsu bozori, street signs in Uzbek
- **Driving physics:** Realistic acceleration, drift (handbrake), collision system, car jacking
- **Police & wanted system:** 1–5 star wanted levels, police chase on higher stars, carjack = wanted, hit peds = wanted
- **Pedestrians:** 34 NPCs walking, panicking when cars approach, yelling Uzbek phrases
- **Crime scenes:** 3 locations with police tape, chalk outlines, officers, ambulance — area restricted
- **No build step:** Pure vanilla ES modules, Three.js from CDN

## Controls

| Key | Action |
|-----|--------|
| **W A S D** | Move (walk) / Drive |
| **Shift** | Run |
| **F / E** | Enter/exit vehicle |
| **Space** | Handbrake (drift) |
| **H** | Horn |
| **C** | Camera (far/near) |

## Running locally

```bash
# Start a local server (any will do)
npx http-server .

# Or with Python
python -m http.server 8000

# Then open http://localhost:PORT/
```

## File structure

```
vice-city-uz/
├── index.html          # Start screen, HUD, minimap
├── js/
│   ├── main.js         # Game loop, setup
│   ├── world.js        # Map, buildings, roads, decorations
│   ├── config.js       # Road layout, islands, crime scenes
│   ├── cars.js         # Vehicle models (9 Uzbek types + police)
│   ├── peds.js         # Pedestrians, dialogue
│   ├── player.js       # Player controller (car/foot)
│   ├── traffic.js      # AI cars following road network
│   ├── police.js       # Police, wanted system, pursuit
│   ├── network.js      # Road graph for traffic
│   ├── physics.js      # Collision, pushOut
│   ├── hud.js          # Speed, wanted stars, minimap
│   ├── audio.js        # Engine sounds, siren
│   └── utils.js        # Helpers (math, textures, sprites)
```

## Tips

- **Don't hit pedestrians** — wanted level jumps fast. Politsiya start chasing at 2+ stars
- **Wanted decays** — lay low for 7+ seconds and it drops slowly
- **Handbrake (Space)** — hold it while turning for drifts; great for tight city streets
- **Every car is stealable** — but carjacking a politsiya car = instant 3-star wanted 😅
- **Crime scenes are off-limits** — getting close triggers a warning

## What's next?

- Missions (taxi driver, delivery)
- Day/night cycle with proper lighting
- Gamepad support
- Sound effects beyond engine/siren
- More interiors (choyxona, shops)

---

Made with ❤️ in Uzbekistan. Yaxshi o'yinlar! 🚗💨
"# uzbek-gta" 
