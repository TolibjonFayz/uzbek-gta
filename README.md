# TASHKENT CITY — Uzbek GTA 🇺🇿 (v3 PRO)

Toshkent shahri bo'ylab erkin sayohat o'yini (three.js, brauzerda ishlaydi).

## Ishga tushirish

```
python -m http.server 8347 --directory uzbek-gta
```
Keyin brauzerda: `http://localhost:8347`

## Haqiqiy qo'shiqlar 🎵

MP3 fayllaringizni **music/** papkasiga tashlang — radio ularni avtomatik topib chaladi.
Aniq ro'yxat kerak bo'lsa `music/playlist.json` ni to'ldiring (`music/QOSHIQLAR-QANDAY-QOSHILADI.txt` ga qarang).
MP3 yo'q bo'lsa sintez qilingan xalq kuylari chalinadi.

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

## Fayl tuzilishi

- `index.html` — UI, HUD, mobil tugmalar
- `js/util.js` — yordamchilar, teksturalar, kollayder indeksi
- `js/audio.js` — MP3 radio + sintez zaxira + ovoz effektlari
- `js/vehicles.js` — mashina fabrikasi (14 real model) + aniq to'qnashuv
- `js/world.js` — Toshkent xaritasi (6 tuman)
- `js/traffic.js` — svetaforlar (hisoblagich bilan), traffic AI
- `js/peds.js` — odamlar (o'lim, qo'rqish, baqirish)
- `js/police.js` — militsiya (jinoyat, quvish, qo'lga olish)
- `js/daynight.js` — kun/tun sikli, yorug'lik, chiroqlar
- `js/damage.js` — mashina shikastlanishi (bamper tushishi, pachoq)
- `js/missions.js` — pul + topshiriqlar (taksi, yetkazish)
- `js/main.js` — o'yin sikli, boshqaruv, kameralar
- `music/` — o'z MP3 qo'shiqlaringiz uchun

## Auto-shahar

Bo'sh kataklar avtomatik binolar bilan to'ldiriladi (tuman uslubiga qarab: markaz — shisha ofislar, Yunusobod/Chilonzor — panelkalar, Eski shahar — mahalla uylari). Hammasi instancing bilan chizilgani uchun yuzlab bino qo'shilsa ham tezlik tushmaydi. Yangi bo'sh joyni to'ldirmaslik uchun `markUsed(x,z)` ishlatiladi.
