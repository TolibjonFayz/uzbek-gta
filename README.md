# TASHKENT CITY — Uzbek GTA 🇺🇿 (v4 MEGA)

Toshkent shahri bo'ylab erkin sayohat o'yini (three.js, brauzerda ishlaydi).

## 📱 Telegram Mini App

O'yin **Telegram Mini App** sifatida ishlaydi — o'zbek auditoriyasiga to'g'ridan-to'g'ri tarqaladi.

**Ishga tushirilganda:**
- To'liq ekran (fullscreen) + landshaft rejimga qulflanadi
- **Haptika** — yulduz terganda, poyga yutganda/yutqazganda telefon tebranadi
- **CloudStorage** — progress (pul, yulduzlar, mashinalar, rekordlar) Telegram hisobingizda saqlanadi: telefon almashsangiz ham hammasi joyida turadi (localStorage bilan birga)
- Vertikal ushlab tursangiz — **"Telefonni yotiq holatga o'giring"** ekrani chiqadi (o'yin faqat landshaft)
- Landshaft telefonlarda HUD ixcham rejimga o'tadi (kichik minimap, kichik yozuvlar)

Oddiy brauzerda ochsangiz — Telegram funksiyalari xavfsiz o'chiq, o'yin odatdagidek ishlaydi.

### Botga qanday ulash (deploy)
1. Fayllarni statik hostga qo'ying (GitHub Pages, Netlify, Vercel, yoki oddiy `https` server) — HTTPS shart
2. [@BotFather](https://t.me/BotFather) da bot yarating → **Bot Settings → Menu Button → Configure** → Mini App URL'ini kiriting (hosting manzili)
3. Yoki `/newapp` bilan alohida Mini App yarating
4. Foydalanuvchi botni ochib menyu tugmasini bosadi — o'yin ochiladi

> Eslatma: `telegram-web-app.js` CDN'dan yuklanadi. Fullscreen/orientatsiya qulfi Telegram **8.0+** da to'liq ishlaydi; eski versiyalarda o'yin baribir ishlaydi, faqat qulf bo'lmaydi (o'girish ekrani yo'l ko'rsatadi).

## v4: MEGA XARITA — 5000×5000 m (~5 barobar katta!) 🗺️

Yo'l tarmog'i endi **15×15** (yangi tashqi halqa ±2400 m). Hamma narsa xarita bo'ylab **tarqatilgan** — bir joyda to'planish yo'q:

**YANGI O'ZBEKISTON TOMONI (sharq):**
- 🕊️ **Yangi O'zbekiston bog'i** — ulkan park: Istiqlol ustuni (Humo qanotlari bilan), ko'l, gulzorlar, bayroq, xiyobonlar
- 🥇 **Olimpiya shaharchasi** — katta olimpiya stadioni, ⛸️ **Muz saroyi**, olimpiya halqalari, basketbol maydoni, suzish havzasi + atrofida poyga trassasi ("Olimpiya ringi")
- 🌆 **Yangi Shahar** — 5 ta baland shisha minora (70–124 m), zamonaviy biznes tuman; **Lux Motors avtosaloni endi shu yerda**

**TARQATILGANLAR:**
- 🏠 Mening uyim → g'arbiy dala hovlilar tomoniga ko'chdi (tinch joy)
- 🏎️ 3 salon endi 3 tomonda: Lux (Yangi Shahar, sharq), Audi (Yunusobod, shimol), VW (Chilonzor, g'arb)
- 🏁 4 poyga: Markaz aylanasi · Sergeli sprinti · **Katta halqa marafoni** (yangi tashqi halqa, ~9.6 km, 800 000 so'm!) · **Olimpiya ringi** (350 000)
- ⭐ 25 yulduz butun 5 km xarita bo'ylab (14 tasi markazdan 1+ km uzoqda), yangi halqa burchaklarida ham
- ⛽ 10 benzokolonka + 6 avto servis (yangi hududlarda ham), 72 oziq-ovqat do'koni

## Ishga tushirish

```
python -m http.server 8347 --directory uzbek-gta
```
Keyin brauzerda: `http://localhost:8347`

## Haqiqiy qo'shiqlar 🎵

MP3 fayllaringizni **music/** papkasiga tashlang **VA** `music/playlist.json` dagi `tracks` ro'yxatiga yozing:

```json
{ "tracks": [ { "title": "Sevara - Yo'l bo'lsin", "file": "sevara.mp3" } ] }
```

> ⚠️ **playlist.json ni to'ldirish SHART.** Papkani avtomatik skanerlash faqat lokal dev serverda ishlaydi — Netlify/Vercel/GitHub Pages'da papka ro'yxati yo'q, shuning uchun ro'yxat bo'sh bo'lsa saytda musiqa **chalinmaydi** (sintez kuyga tushib qoladi). Batafsil: `music/QOSHIQLAR-QANDAY-QOSHILADI.txt`

Fayl nomida bo'sh joy/kirill/qavslar bo'lsa ham bo'ladi — o'yin URL'ni o'zi to'g'ri kodlaydi. MP3 yo'q bo'lsa sintez qilingan xalq kuylari chalinadi.

## Boshqaruv

| Tugma | Vazifa |
|---|---|
| **W A S D** / strelkalar | Yurish / haydash |
| **Enter** | Mashinaga minish / tushish |
| **Space** | Sakrash (mashinada — qo'l tormozi) |
| **Ctrl** | O'tirish |
| **Shift** | Yugurish |
| **V** | Salon kamerasi |
| **M** | Keyingi qo'shiq |
| **H** | Klakson |
| **F** | Musht urish (jang) |
| **E** | Ovqat olish (piyoda) / Stansiya: yoqilg'i-tuzatish (mashinada) |

Mashinaga minsangiz — pastda uning brendi, turi, uzunligi va maksimal tezligi ko'rsatiladi.

## Kun / Tun 🌗

Vaqt avtomatik o'tadi (to'liq sutka ~6 daqiqa), tepada soat ko'rinadi (☀️/🌙). **Quyosh diski** sharqdan chiqib osmon bo'ylab yurib g'arbga botadi (ufqda kattaroq va apelsin rang), osmon rangi o'zgaradi. Tunda **yulduzlar va oy** paydo bo'ladi.

Tunda yoritish (haqiqiy nur bilan):
- **Ko'cha chiroqlari** asosiy yo'llarda yo'lda yorug' dog' hosil qiladi (o'yinchi atrofidagi eng yaqin ustunlar yonadi)
- **Mashina faralari** haydaganда oldindagi yo'lni yoritadi (2 ta spotlight nuri)
- Yon ko'chalar qorong'iroq — faralar zarur bo'ladi

**T** tugmasi bilan vaqtni tez o'tkazish mumkin.

## Militsiya 🚔

Odam bosib ketsangiz — ★ qidiruv boshlanadi va militsiya (oq Malibu, mig'alka + sirena bilan) sizni quvadi. Ushlashsa "QO'LGA OLINDINGIZ" chiqadi. Bir muddat jinoyat qilmasangiz qidiruv o'chadi. Militsiya minimapda ko'k nuqta.

**Telefonda:** chap pastda joystick, o'ngda tugmalar (minish 🚗, musht 👊, sakrash ⬆️, o'tirish 🧎, tormoz 🅿️, kamera 👁️, qo'shiq 🎵, signal 📣, vaqt ⏩). Tugmalar rejimga qarab almashadi.

## Jang 👊

**F** (yoki telefonda 👊) — musht urish. Oldingizdagi odam yiqiladi, atrofdagilar qo'rqib **yugurib qochadi** (baqirib, "Voy!!" deb). Yiqilgan odam bir ozdan keyin turib qochadi.

## Pul va topshiriqlar 💰

Yuqori chapda pulingiz ko'rinadi (so'm). Shahar bo'ylab **belgi ustunlari** paydo bo'ladi:
- 🟡 **Taksi** (qo'l silkitayotgan yo'lovchi) — mashinada belgiga yeting, yo'lovchini manzilga (masalan Chorsu) olib boring
- 🔵 **Yetkazish** (quti) — qutini oling va manzilga yetkazing

Manzil masofasiga qarab **pul** olasiz (masofa uzoq — pul ko'p, 15 000–55 000 so'm). Minimapда belgilar ko'rinadi (uzoq bo'lsa chekkada yo'nalish ko'rsatadi). Topshiriq mashinada bajariladi.

## Mashina shikastlanishi 🏎

Mashina urilganда shikastlanadi:
- Yengil urilса — **old bamper tushadi** (yerga qulaydi)
- **orqa bamper tushadi**
- Ko'p urilsa — kuzov **pachoq** bo'ladi (bo'yog'i tirnaladi, biroz qiyshayadi)
- Mashina **portlamaydi** — faqat pachoq bo'ladi, lekin haydash mumkin

## Ovqat va energiya

Yuqori chapda **energiya** chizig'i bor — yugurganda kamayadi. Shahar bo'ylab **~50 ta** oziq-ovqat do'koni tarqalgan. Real Toshkent joylari: **Evos, FeedUP, Beshqozon, Nomdor, Oqtepa Lavash, Knopka, Havas, Makro, Choyxona, Korzinka**.

Piyoda do'kon eshigiga yeting, **E** (yoki telefonda ovqat tugmasi) bosing, menyu ochiladi. Pulga ovqat oling: osh, lag'mon, somsa, shashlik, manti, lavash, gamburger, shaurma. Har taom energiya beradi. Missiyalardan pul ishlab ovqatga sarflang.

## Yoqilg'i va tuzatish

Mashinada haydaganда yoqilg'i (bak) kamayadi — pastda ko'rsatkich bor. Tugasa mashina yurmaydi.

- **Benzokolonka** (6 ta) — mashinani ustiga haydab, **E** (yoki telefonda stansiya tugmasi) bosing → yoqilg'i to'ladi (missing * 180 so'm).
- **Avto servis** (4 ta) — pachoq mashinani tuzatadi (bamper qaytadi, tirnalish ketadi), shikast miqdoriga qarab pul oladi.

Ikkalasi ham xaritada joy nomi va minimapda ko'rinadi.

## v3 da nima yangi

- **Xarita ~9 barobar katta (2400×2400 m), 6 tuman**: Markaz, Yunusobod, Chilonzor, Eski shahar, Mirzo Ulug'bek, Sergeli + halqa yo'li
- **Yangi joylar**: Toshkent aeroporti (samolyotlar bilan), Vokzal (poyezd bilan), Magic City (aylanadigan charxpalak!), Hazrati Imom, Kukeldash, Mega Planet, Navoiy teatri, Botanika bog'i
- **Aniq fizika**: to'qnashuv endi mashina shakli bo'yicha (aylanalar zanjiri) — yonidan 1 m masofada bemalol o'tasiz, ustma-ust kirib ketish yo'q
- **Odamlar reaksiyasi**: bosib ketsangiz yiqilib o'ladi (keyin boshqa joyda qayta paydo bo'ladi); yaqinidan tez o'tsangiz qo'rqib baqiradi, chetga sakraydi, gap pufagi chiqadi ("Hoy!!", "Ko'zingga qarab yur!")
- **Svetaforlar pro**: har chorraha mustaqil sikl + **sekund hisoblagichi** (haqiqiy Toshkent svetaforlaridek), hamma-qizil oralig'i bilan
- **Mashinalar realroq**: haqiqiy o'lchamlar (Matiz 3.50 m, Tahoe 5.35 m...), yon siluet bo'yicha qurilgan kuzov (kapot-oyna-tom-bagaj), rulga burilardigan old g'ildiraklar, model bo'yicha tezlik/quvvat
- **Ovozlar**: klakson, avariya zarbi, shina chiyillashi, odam qichqirig'i, vitesli motor ovozi
- **Traffic hamisha atrofda**: uzoqlashgan mashinalar/piyodalar o'yinchi yaqiniga qayta joylanadi
- **Tezlik hissi**: FOV kengayishi, minimap endi zoom rejimda

## Xarita va marshrut 🗺️

**X** (telefonda 🗺️ tugma) — butun shahar xaritasi ochiladi: barcha yo'llar, tumanlar nomi bilan, kanal, temir yo'l, diqqatga sazovor joylar (nomli iconlar), do'konlar, militsiya, poyezd va siz.

- Xaritaga **ikki marta bosing** — o'sha joyga **yo'llar bo'ylab marshrut** chiziladi (yashil), minimapda ham ko'rinadi
- O'sha joyga **yana ikki marta bossangiz** — marshrut bekor bo'ladi
- Manzilga yetganingizda marshrut o'zi yo'qoladi ("📍 Manzilga yetdingiz!")
- **Missiya paytida** (yo'lovchi/quti olganda) manzilga **sariq marshrut** avtomatik chiziladi, topshirganda yo'qoladi
- Minimap iconlari endi oq doirali badge ko'rinishida — aniq o'qiladi

## Poyga missiyalari 🏁 (v2 — AI raqiblar bilan!)

Endi har poygada **2 ta haqiqiy raqib** bor: **Bek** (qizil BMW M5) va **Timur** (ko'k Audi RS7). Ular start chizig'ida siz bilan turadi, KETDIK bilan birga chiqadi va yo'llar bo'ylab haydaydi. **G'alaba = marraga 1-bo'lib kelish!** Raqib oldin kelsa — yutqazasiz. HUD'da jonli o'rningiz: "O'rin: 1/3". Raqiblar minimapda qizil nuqta. Rezinka tizimi: juda o'zib ketsangiz ular tezlashadi, ortda qolsangiz kutib turishmaydi lekin sekinlashadi — poyga doim qiziq.

Trassalar (xarita bo'ylab tarqatilgan): Markaz aylanasi (150k) · Sergeli sprinti — janubda (250k) · Olimpiya ringi — shimoli-sharqda (350k) · Katta halqa marafoni — tashqi halqa (800k).

**v2 tuzatishlar:** checkpoint radiusi kattalashtirildi (asosiy yo'l chekka lane'sida o'tsangiz ham hisoblanadi), marra=start tsikli tuzatildi (poyga o'z-o'zidan qayta boshlanmaydi — zonadan chiqib qaytish kerak), start belgi ustunlari yo'l ichidan chetga olindi.

Qo'shimcha: mashinadan tushsangiz poyga bekor · rekord vaqtlar saqlanadi ("YANGI REKORD!") · har g'alaba reytingga +300 ball · checkpoint sariq halqa + osmon nuri, keyingisiga to'q sariq marshrut chiziladi.

## Xarita muvozanati 🗺️

POI'lar butun xaritaga tarqatildi — har 3×3 zonada kamida bitta narsa: Minor masjidi shimoli-g'arbda, Bunyodkor janubi-g'arbda, Magic City janubi-sharqda, Mega Planet shimolda. Missiya takliflari (🚕/📦) endi doim **o'yinchiga yaqin** (250–850 m) paydo bo'ladi, manzillar 1.5 km dan uzoq bo'lmaydi.

## 3 ta Premium Avtosalon 🏎️

Trafikda **umuman uchramaydigan** 19 ta mashina — har salonda har xil (piyoda mashinaga yaqinlashib **E** — sotib olish):

**LUX MOTORS** (markaz, Navoiy ko'chasi) — Mercedes-Benz & BMW: E200 (800k), S500 (1.4M), **Maybach (3M)**, G63 Gelik (2.2M), M5 (1M), M8 (1.9M), X7 (1.7M)

**AUDI MARKAZI** (Yunusobod) — Audi'ning zo'rlari: A6 (600k), A8 L (1.3M), Q7 (1.5M), **RS7 (2M)**, RS Q8 (2.4M), **R8 superkar (3.5M — o'yindagi eng tez mashina!)**

**VW SALON** (Chilonzor) — Volkswagen: Polo (350k — eng arzon premium), Jetta (500k), Passat (700k), Tiguan (900k), Arteon (1.2M), Touareg (1.6M)

Har salon ichida aylanuvchi ko'rgazma mashinasi bor (Gelik, R8, Touareg) 😎

## Mening uyim 🏠

Markazda (xaritada 🏠) **shaxsiy hovli**:
- **Garaj — 10 mashina joyi**: sotib olingan har bir mashina shu yerga qo'yiladi va **abadiy saqlanadi** (o'yinni yopib ochsangiz ham turadi)
- **Uy — 3 xonali**: mehmonxona (divan, televizor, gilam, kreslo), uxlash xonasi (karavot, shkaf, tumba), oshxona (plita, muzlatgich, stol-stul) — eshikdan kirib bemalol yurasiz
- **Aqlli ko'rinish**: ichkariga kirganingizda tashqi devorlar va tom avtomatik shaffof bo'ladi — hamma narsa ko'rinadi (GTA uslubi); chiqsangiz qaytib qattiq bo'ladi. Ichki devorlar past — kamerani to'smaydi
- Ko'chadagi mashina — tekin lekin vaqtinchalik; garajdagi — sizniki, doimiy

## Reyting va yulduzlar 🏆

**B** tugmasi (xaritada 🏆 tugma) — reyting paneli: ball, unvon, masofa, yulduzlar, missiyalar, ishlab topilgan pul, rekord tezlik, o'yin vaqti. Hammasi **saqlanadi** (brauzer localStorage) — o'yinni yopib ochsangiz ham progress turadi.

- Shahar bo'ylab **25 ta aylanuvchi oltin yulduz** yashiringan (mashhur joylar oldida va chekka burchaklarda). Ustidan o'tsangiz terib olasiz: **+25 000 so'm** har biri, hammasini tersangiz **+1 000 000 so'm**! Katta xaritada (X) sariq nuqtalar — terilmagan yulduzlar
- Yuqori o'ngda hisoblagich: ⭐ nechta terilgani + umumiy masofa
- **Ball** = masofa (km×15) + yulduz (×400) + missiya (×250) + pul (÷1000)
- **Unvonlar**: Yangi kelgan → Shahar o'rganuvchisi (500) → Toshkent haydovchisi (1500) → Ko'cha ustasi (3500) → Shahar afsonasi (7000) → TOSHKENT QIROLI 👑 (15000)

## Shina izlari va burnout 🏁

- **Tormoz** bosganda (tezlikda) — asfaltda qora shina izi qoladi (**hamma mashinada**)
- **Qo'l tormozi** bilan driftda ham iz + ozgina tutun
- Joyidan **gazni to'liq bossangiz** — **burnout**: g'ildirak izi + oq tutun + chiyillash. Bu faqat **kuchli mashinalarda** (Malibu 2, Tahoe, Kia K5, Sonata, Monza, Traverse, Elantra). Matiz/Nexia/Cobalt burnout qilolmaydi 😄
- Izlar asfaltda qoladi, eskilari asta yangilariga o'rin bo'shatadi

## Harakat qoidasi 🚦

O'zbekistondagidek **o'ng qo'l harakati**: har mashina o'z yo'nalishining o'ng tomonida yuradi. Har bir yo'l **ikki tomonlama** — bir tomonga ketuvchi va qaytuvchi oqim alohida lane'da (asosiy yo'llarda har tomonga 2 lane). Politsiya ham shu qoidada.

## v3.1 yangiliklari

- **Yoqilg'i/energiya balansi**: to'liq gazda bak ~10.5 daqiqa yetadi (tinch haydashda 20+ daqiqa); yugurish energiyasi ~90 soniyaga yetadi, musht arzonlashdi
- **Binolar endi yo'lga chiqmaydi**: barcha joylashtirish funksiyalarida asfalt-tekshiruv (`onAsphalt`), mahalla hovli devorlari ham hisobda
- **Temir yo'l butun shahar bo'ylab** (g'arbdan sharqqacha, z=620): shpalli yotqizma, vokzalda soyabonli 1-platforma
- **Haqiqiy yuradigan Afrosiyob**: shahar chetidan kirib keladi, gudok chalib bekatda to'xtaydi, platformadagi odamlar chiqadi, tushuvchilar vokzalga ketadi, poyezd shahardan chiqib ketadi — keyingisi qarama-qarshi tomondan keladi. Relsda turgan mashinani uradi (shikast!). Minimapда shtrixli chiziq + yashil poyezd belgisi
- **Bunyodkor stadioni Chilonzorga ko'chdi** (temir yo'l chizig'idan)
- **Mashinalar endi silliq**: yumaloq burun, qavariq kapot, kamarli tom, g'ildirak arkalari, tepaga toraygan kabina (tumblehome), qiya yon oynalar
- **Motor ovozi realistik**: 4 qatlam (asosiy + gurullash + vixlop sub-oktavasi + garmonika) + havo shovqini + yumshoq distorsiya + salda "lop-lop", vites almashganda RPM tushadi

## Fayl tuzilishi

- `index.html` — UI, HUD, mobil tugmalar
- `js/util.js` — yordamchilar, teksturalar, kollayder indeksi
- `js/audio.js` — MP3 radio + sintez zaxira + ovoz effektlari
- `js/vehicles.js` — mashina fabrikasi (14 real model) + aniq to'qnashuv
- `js/world.js` — Toshkent xaritasi (6 tuman)
- `js/traffic.js` — svetaforlar (hisoblagich bilan), traffic AI
- `js/peds.js` — odamlar (o'lim, qo'rqish, baqirish)
- `js/train.js` — yuradigan poyezdlar (Afrosiyob), yo'lovchilar, kesishma xavfi
- `js/map.js` — katta xarita (X), yo'l grafigi bo'yicha marshrut (Dijkstra), waypoint
- `js/police.js` — militsiya (jinoyat, quvish, qo'lga olish)
- `js/daynight.js` — kun/tun sikli, yorug'lik, chiroqlar
- `js/damage.js` — mashina shikastlanishi (bamper tushishi, pachoq)
- `js/missions.js` — pul + topshiriqlar (taksi, yetkazish)
- `js/main.js` — o'yin sikli, boshqaruv, kameralar
- `music/` — o'z MP3 qo'shiqlaringiz uchun

## Auto-shahar

Bo'sh kataklar avtomatik binolar bilan to'ldiriladi (tuman uslubiga qarab: markaz — shisha ofislar, Yunusobod/Chilonzor — panelkalar, Eski shahar — mahalla uylari). Hammasi instancing bilan chizilgani uchun yuzlab bino qo'shilsa ham tezlik tushmaydi. Yangi bo'sh joyni to'ldirmaslik uchun `markUsed(x,z)` ishlatiladi.

## 🆕 3D grafika (tekin CC0 modellar)

Start ekranida **Grafika: Yangi 3D modellar / Klassik** tanlovi bor (tanlov `localStorage` da saqlanadi, `?gfx=classic` yoki `?gfx=kenney` bilan ham sinash mumkin). Yuklanmasa o'yin avtomatik klassik grafikaga o'tadi.

- **Mashinalar** — Quaternius *Realistic Car Pack* (sedan, xetchbek, sport, SUV, taksi, militsiya; rangi o'yindagidek tasodifiy) + RG Poly *Cars Free* (tez yordam, fura, betonovoz, Matiz uchun mini). Damas furgoni va urilganda uchadigan bamper — Kenney *Car Kit*. Fayllar: `assets/models/cars.pack.gz` (~0.6 MB), `assets/models/kenney.pack.gz`.
- **Xizmat mashinalari** (tez yordam, fura, betonovoz) trafikda har ~11 mashinadan birida chiqadi.
- **Binolar** — Quaternius *Downtown City MegaKit* teksturalari (g'isht, beton, suvoq, shifer, deraza ortidagi xona suratlari) bilan realistik fasadlar: panelkalar, ofislar, turar joy binolari, hovli uylar. Binolar oddiy quti bo'lib qoladi (tezlik saqlanadi), har bir turi bitta atlas-tekstura bilan bitta draw call'da chiziladi. Teksturalar: `assets/textures/` (~45 KB).
- Qayta yig'ish: `node tools/pack-cars.js <Quaternius OBJ papka> <RG Poly gLTF papka>` va `node tools/pack-models.js <kenney papka>`.
- Litsenziyalar: hammasi CC0 — `assets/models/LICENSE-*.txt` va `assets/textures/LICENSE-Quaternius-CC0.txt`. Mualliflar: Quaternius (quaternius.com), RG Poly (rg-poly.itch.io), Kenney (kenney.nl).
