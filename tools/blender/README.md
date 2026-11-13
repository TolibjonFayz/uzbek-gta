# Blender modellari

O'yindagi hamma mashinalar o'zimizniki (Blender 5.3, oynasiz skriptlar):

| Skript | Nima qiladi |
|---|---|
| `cars.py <id>` | Mashina generatori: 38 ta model (qo'lda sozlangan 7 ta + `art/specs.json` dan avtomatik ~30 ta + politsiya) |
| `import_full.py <id>` | Yuklab olingan modelni (DeLorean, Mazda AZ-1) o'yinga moslash: teksturalar saqlanadi, ~40k ga soddalashtiriladi |
| `common.py` | Umumiy yordamchilar: `rbox`, `cyl`, `place_on` (kuzov sirtiga raycast), `export_glb`, `export_extra`, `render_views` |
| `import_car.py` | Muqobil: yuklab olingan modelni vertex color'ga "pishirib" juda yengil qilish (hozir ishlatilmaydi) |

## Hammasini qayta yasash

```bash
# 1) o'yin spec'larini eksport (vehicles.js -> art/specs.json) — README pastida node buyrug'i
# 2) har bir mashina (art/<id>.glb + art/<id>_lod.glb + art/export/<id>/*.{blend,fbx,obj})
"C:\Program Files\Blender Foundation\Blender 5.3\blender.exe" --background --factory-startup --python tools/blender/cars.py -- mercedes_g63 art [render_papka]
# 3) paket
node tools/pack-blender.js            # art/*.glb -> assets/models/blender.pack.gz
```
Paket o'zgarsa `js/models.js` dagi `blender.pack.gz?v=` raqamini oshiring.

Asl modellar: `import_full.py -- delorean <manba.glb> assets/models/full/delorean.glb` (+ `_lod.glb`).

## O'yinda qanday ishlaydi

- `models.js carModelFor`: `b/<slug(nom)>` bo'lsa o'shani oladi ('Mercedes G63' -> `b/mercedes_g63`); politsiya -> `b/malibu2_police`.
- **LOD**: har mashinaning `<id>_lod` nusxasi (~1,4k uchburchak, g'ildiraklar kuzovda) 42 m dan uzoqda chiziladi.
- **Chizish chaqiruvlari**: `pack-blender.js` oddiy ranglarni (`c:#hex`) bitta `vc` (vertex color) guruhiga
  birlashtiradi — mashina ~9 chaqiruvda chiziladi (avval ~35). Pozitsiya Int16, normal Int8 (hajm ~2x kichik).
- Asl modellar (`spec.full`): GLTFLoader + Draco, o'yin ochilgandan keyin fonda; trafikdagi bitta mashina almashtiriladi.
  LOD fayli teksturasiz — materiallar asl modeldan nom bo'yicha olinadi.

## Generator qoidalari

- Blender'da oldinga = **-Y**, tepaga = +Z (glTF'da +Z oldinga, chap = +X). Model **haqiqiy metrda**.
- Obyektlar: `body` + `wheel-front-left/right`, `wheel-back-left/right` (origin = o'q markazi).
- Material nomlari: `paint` (o'yin rangi), `glass`, `hl`, `tl`; qolganlari o'z rangida (pack'da `vc`).
- Avtomatik profil spec'dan: `wsB/roofF/roofR/rwB` (L/2 ga nisbat), `noseH/hoodH/tailH/roofH`, `ohF/ohR`, `type`.
  Brend panjarasi `BRAND` jadvalida (kidney, single, merc, slim, tiger, cascade, bars).
- Maxsuslar: `g63`, `ambulance`, `police`, `mixer`, `fura`, `tahoe`, `damas`, `svj` (`*_extras` funksiyalar).

## specs.json eksporti

```bash
node -e "const s=new Proxy(function(){},{get:(t,k)=>k==='prototype'?{}:s,construct:()=>s,apply:()=>s});global.window=global;global.G={};global.THREE=s;global.document={getElementById:()=>null,addEventListener(){},createElement:()=>s};require('./js/vehicles.js');const o={};for(const k in G.CAR_SPECS){const v=Object.assign({},G.CAR_SPECS[k]);delete v.colors;o[k]=v}require('fs').writeFileSync('art/specs.json',JSON.stringify(o,null,1))"
```
