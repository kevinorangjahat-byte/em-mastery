// =============================================================
// Simulasi kasus klinis bercabang.
// node: { phase, prompt, reveal:[], ecg, labs:[], choices:[{ text, q:'best'|'ok'|'bad', fb, next?, vitals?, rhythm? }] }
//   - choice.next kosong → tetap di node (coba lagi) dengan kondisi yang berubah
//   - vitals: nilai baru (overwrite) parsial
// node akhir: { end: true, outcome: 'good'|'fair'|'bad', summary, learning:[] }
// =============================================================
export const CASES = [
{
  id: 'case-trauma-mvc', module: 'atls', topic: 'atls-primary-survey', level: 2, title: 'Pengendara Motor — Sesak & Syok',
  brief: 'Pria 24 tahun, tabrakan motor vs truk, tiba 25 menit setelah kejadian.',
  patient: 'Pria, 24 tahun, ±70 kg', mist: 'M: motor vs truk kecepatan tinggi, terlempar ±5 m. I: jejas dada kanan, nyeri pelvis. S: gelisah, sesak. T: collar, O₂ NRM, 1 IV 18G.',
  vitals: { hr: 132, sbp: 84, dbp: 56, rr: 34, spo2: 86, gcs: 14, temp: 36.1 }, rhythm: 'sinus-tachy', start: 'n1',
  nodes: {
    n1: { phase: 'Primary survey — A & B', prompt: 'Pasien bicara terputus-putus, airway paten. Trakea tampak deviasi ke kiri, gerak dada kanan tertinggal, suara napas kanan hilang, perkusi kanan hipersonor, vena leher distensi. Tindakan berikutnya?',
      choices: [
        { text: 'Foto toraks AP dulu untuk konfirmasi', q: 'bad', fb: 'Tension pneumothorax adalah diagnosis klinis. Menunggu foto menunda terapi; pasien memburuk.', vitals: { spo2: 80, sbp: 72, hr: 145 } },
        { text: 'Dekompresi segera hemitoraks kanan (jarum ICS 4–5 anterior MAL / finger thoracostomy), lalu chest tube', q: 'best', fb: 'Tepat. Tanda klasik tension PTX + syok obstruktif. Dekompresi segera, lalu chest tube 28–32 Fr di ICS 4–5 anterior MAL.', next: 'n2', vitals: { spo2: 93, rr: 26, sbp: 92, hr: 124 } },
        { text: 'Intubasi segera (RSI)', q: 'bad', fb: 'Ventilasi tekanan positif memperburuk tension PTX dan dapat menyebabkan henti jantung. Dekompresi terlebih dahulu.', vitals: { spo2: 78, sbp: 64, hr: 150 } },
      ] },
    n2: { phase: 'Primary survey — C', prompt: 'Setelah dekompresi & chest tube (output 250 mL darah), SpO₂ 93%. Namun TD 90/58, HR 124, kulit dingin, CRT 4 detik. FAST: tidak ada cairan bebas intraperitoneal/perikard. Foto pelvis: diastasis simfisis pubis ("open book"). Tindakan prioritas?',
      choices: [
        { text: 'Pasang pelvic binder setinggi trokanter mayor + aktivasi MTP + TXA', q: 'best', fb: 'Tepat. Open-book pelvis adalah sumber perdarahan besar. Binder mengurangi volume pelvis; transfusi seimbang dan TXA ≤3 jam.', next: 'n3', vitals: { sbp: 98, hr: 116 } },
        { text: 'Bolus kristaloid 3 L lalu evaluasi ulang', q: 'bad', fb: 'Kristaloid berlebih → dilusi, hipotermia, koagulopati. Prioritas: kontrol sumber (binder) + darah.', vitals: { sbp: 82, hr: 134, temp: 35.2 } },
        { text: 'Kirim ke CT untuk menilai fraktur pelvis', q: 'bad', fb: 'Pasien masih syok — CT pada pasien tidak stabil berbahaya. Lakukan intervensi di resus terlebih dahulu.', vitals: { sbp: 76, hr: 140 } },
        { text: 'Pasang pelvic binder setinggi krista iliaka', q: 'ok', fb: 'Konsep benar, posisi kurang tepat — binder harus di trokanter mayor agar efektif.', vitals: { sbp: 90, hr: 124 } },
      ] },
    n3: { phase: 'Respons resusitasi', prompt: 'Setelah 2 unit PRC + 2 unit plasma: TD 98/62, lalu 20 menit kemudian kembali 80/50, HR 128. Apa interpretasi & langkah selanjutnya?',
      choices: [
        { text: 'Transient responder — perdarahan berlanjut → angioembolisasi atau preperitoneal packing/ fiksasi eksternal segera, lanjut MTP', q: 'best', fb: 'Tepat. Transient responder menandakan perdarahan aktif; butuh hemostasis definitif.', next: 'n4', vitals: { sbp: 100, hr: 108 } },
        { text: 'Rapid responder — lanjut secondary survey dengan tenang', q: 'bad', fb: 'Respons sementara lalu memburuk = transient responder, bukan rapid responder.', vitals: { sbp: 74, hr: 138 } },
        { text: 'Mulai norepinefrin untuk menaikkan TD', q: 'bad', fb: 'Vasopresor bukan pengganti darah & kontrol sumber pada syok hemoragik.', vitals: { sbp: 78, hr: 135 } },
      ] },
    n4: { phase: 'Disposisi', prompt: 'Pasien menjalani angioembolisasi arteri iliaka interna, hemodinamik stabil. GCS 15. Langkah berikutnya?',
      choices: [
        { text: 'Secondary survey lengkap + tertiary survey, ICU, cegah hipotermia, cek kalsium & koagulasi', q: 'best', fb: 'Tepat — sekarang stabil, lakukan secondary survey dan cari missed injuries.', next: 'end' },
        { text: 'Pulangkan setelah observasi 6 jam', q: 'bad', fb: 'Pasien trauma mayor pasca embolisasi memerlukan perawatan intensif.' },
      ] },
    end: { end: true, outcome: 'good', summary: 'Pasien selamat dengan tension PTX dan fraktur pelvis APC yang ditangani sesuai prioritas.', learning: ['Tension PTX = diagnosis klinis → dekompresi segera', 'Syok + pelvis open book → binder di trokanter + MTP + TXA', 'Transient responder = perdarahan aktif → hemostasis definitif'] },
  },
},
{
  id: 'case-vf-arrest', module: 'acls', topic: 'acls-arrest', level: 2, title: 'Kolaps di Ruang Tunggu',
  brief: 'Pria 58 tahun kolaps saat menunggu pemeriksaan nyeri dada.',
  patient: 'Pria, 58 tahun, ±80 kg, riwayat hipertensi & merokok', mist: 'Mengeluh nyeri dada 1 jam, tiba-tiba kolaps di kursi. Disaksikan.',
  vitals: { hr: 0, sbp: 0, dbp: 0, rr: 0, spo2: 0, gcs: 3, etco2: 0 }, rhythm: 'vf', start: 'n1',
  nodes: {
    n1: { phase: 'Pengenalan', prompt: 'Pasien tidak responsif, napas gasping. Anda tidak meraba nadi dalam 10 detik. Tindakan pertama?',
      choices: [
        { text: 'Mulai kompresi dada segera, panggil tim & defibrilator', q: 'best', fb: 'Tepat. Gasping = henti jantung. Mulai CPR berkualitas tanpa menunda.', next: 'n2', vitals: { etco2: 14 } },
        { text: 'Cek nadi lagi selama 30 detik untuk memastikan', q: 'bad', fb: 'Cek nadi maksimal 10 detik. Penundaan menurunkan peluang hidup.' },
        { text: 'Beri 2 napas bantuan terlebih dahulu', q: 'ok', fb: 'Urutan C-A-B: kompresi dahulu. Ventilasi setelah 30 kompresi.', next: 'n2', vitals: { etco2: 11 } },
      ] },
    n2: { phase: 'Analisis ritme', prompt: 'Defibrilator terpasang. Ritme di monitor (lihat strip). Tindakan?', ecg: 'vf',
      choices: [
        { text: 'Defibrilasi (bifasik 120–200 J sesuai pabrik), langsung lanjut CPR 2 menit', q: 'best', fb: 'Tepat — VF. Shock lalu langsung CPR tanpa cek nadi.', next: 'n3' },
        { text: 'Kardioversi sinkron 100 J', q: 'bad', fb: 'Mode sinkron tidak dapat mendeteksi QRS pada VF — shock tidak keluar/ tertunda. Gunakan defibrilasi.' },
        { text: 'Epinefrin 1 mg dulu, lalu shock', q: 'bad', fb: 'Pada VF, defibrilasi didahulukan; epinefrin setelah shock ke-2.' },
      ] },
    n3: { phase: 'Siklus ke-2', prompt: 'Setelah 2 menit CPR, akses IV terpasang. Ritme masih VF. Tindakan?', ecg: 'vf',
      choices: [
        { text: 'Shock kedua → CPR + epinefrin 1 mg IV', q: 'best', fb: 'Tepat — epinefrin setelah shock ke-2, ulang tiap 3–5 menit.', next: 'n4', vitals: { etco2: 18 } },
        { text: 'Amiodarone 300 mg tanpa shock', q: 'bad', fb: 'VF tetap harus didefibrilasi setiap cek ritme; antiaritmia setelah shock ke-3.' },
        { text: 'Shock kedua → CPR saja tanpa obat', q: 'ok', fb: 'Shock benar, tetapi epinefrin seharusnya diberikan pada siklus ini.', next: 'n4', vitals: { etco2: 16 } },
      ] },
    n4: { phase: 'Siklus ke-3', prompt: 'Cek ritme: masih VF. ETCO₂ 18 mmHg dengan advanced airway terpasang. Tindakan?', ecg: 'vf',
      choices: [
        { text: 'Shock ketiga → CPR + amiodarone 300 mg IV (atau lidokain 1–1,5 mg/kg)', q: 'best', fb: 'Tepat — VF refrakter terhadap shock → antiaritmia.', next: 'n5', rhythm: 'nsr', vitals: { etco2: 38 } },
        { text: 'Hentikan resusitasi karena ETCO₂ rendah', q: 'bad', fb: 'ETCO₂ 18 menunjukkan CPR cukup; bukan alasan menghentikan. Lanjutkan algoritma.' },
        { text: 'Ventilasi lebih cepat 30 kali/menit agar ETCO₂ naik', q: 'bad', fb: 'Hiperventilasi menurunkan venous return. Dengan advanced airway: 10 napas/menit.' },
      ] },
    n5: { phase: 'ROSC', prompt: 'Setelah shock ke-4, ETCO₂ naik mendadak ke 38 mmHg dan teraba nadi karotis. TD 86/54, SpO₂ 99% dengan FiO₂ 100%. Pasien tidak mengikuti perintah. EKG 12 lead: elevasi ST V1–V4. Langkah terbaik?', ecg: 'stemi',
      choices: [
        { text: 'Titrasi FiO₂ ke SpO₂ 92–98%, norepinefrin untuk MAP ≥65, aktivasi cath lab darurat, mulai temperature control', q: 'best', fb: 'Tepat — bundle pasca-ROSC + STEMI → angiografi darurat; koma → temperature control.', next: 'end', vitals: { sbp: 108, dbp: 64, hr: 96, spo2: 96, rr: 12, etco2: 38 } },
        { text: 'Pertahankan FiO₂ 100% dan tunggu troponin sebelum cath', q: 'bad', fb: 'Hindari hiperoksia; STEMI pasca-ROSC tidak menunggu troponin.' },
        { text: 'Lakukan neuroprognostikasi sekarang karena pasien koma', q: 'bad', fb: 'Prognostikasi dilakukan ≥72 jam setelah normotermia, multimodal.' },
      ] },
    end: { end: true, outcome: 'good', summary: 'ROSC dicapai dan pasien dibawa ke cath lab — oklusi LAD proksimal dibuka.', learning: ['CPR berkualitas + defibrilasi dini', 'Epi setelah shock ke-2, antiaritmia setelah shock ke-3', 'Pasca-ROSC: SpO₂ 92–98, MAP ≥65, STEMI → cath, koma → TTM'] },
  },
},
{
  id: 'case-brady', module: 'acls', topic: 'acls-brady', level: 2, title: 'Pusing dan Hampir Pingsan',
  brief: 'Wanita 76 tahun dengan pusing berat dan hampir pingsan sejak pagi.',
  patient: 'Wanita, 76 tahun, ±60 kg, riwayat hipertensi', mist: 'Obat: amlodipin. Pusing, lemas, sekali hampir pingsan.',
  vitals: { hr: 34, sbp: 74, dbp: 42, rr: 20, spo2: 95, gcs: 14, temp: 36.6 }, rhythm: 'avb3', start: 'n1',
  nodes: {
    n1: { phase: 'Penilaian', prompt: 'Pasien pucat, keringat dingin, agak bingung. Monitor menunjukkan ritme ini. Interpretasi?', ecg: 'avb3',
      choices: [
        { text: 'AV block derajat 3 dengan escape ventrikel — bradikardia tidak stabil', q: 'best', fb: 'Tepat — P dan QRS tidak berhubungan, escape QRS lebar ~38/menit, dengan hipotensi dan perubahan mental.', next: 'n2' },
        { text: 'Sinus bradikardia', q: 'bad', fb: 'Perhatikan P yang berjalan independen dari QRS — itu disosiasi AV.' },
        { text: 'Mobitz I', q: 'bad', fb: 'Pada Mobitz I PR memanjang progresif lalu drop; di sini tidak ada hubungan P–QRS sama sekali.' },
      ] },
    n2: { phase: 'Terapi awal', prompt: 'IV terpasang. Tindakan pertama?',
      choices: [
        { text: 'Atropin 1 mg IV sambil menyiapkan pacing transkutan', q: 'best', fb: 'Tepat. Atropin dapat dicoba, tetapi pada blok infranodal sering tidak efektif — siapkan TCP tanpa menunda.', next: 'n3', vitals: { hr: 36 } },
        { text: 'Lidokain untuk menekan ritme ventrikel', q: 'bad', fb: 'Escape ventrikel adalah satu-satunya ritme penopang — lidokain dapat menyebabkan asistol!', vitals: { hr: 22, sbp: 58, gcs: 10 } },
        { text: 'Adenosin 6 mg', q: 'bad', fb: 'Adenosin untuk SVT, bukan bradikardia — memperparah blok.', vitals: { hr: 26, sbp: 60 } },
      ] },
    n3: { phase: 'Respons', prompt: 'Setelah atropin 1 mg (diulang sekali), HR tetap 36, TD 72/40. Langkah berikutnya?',
      choices: [
        { text: 'Pacing transkutan dengan sedasi/analgesia, konfirmasi mechanical capture (nadi femoral) — ATAU infus dopamin 5–20 mcg/kg/menit / epinefrin 2–10 mcg/menit', q: 'best', fb: 'Tepat — atropin tidak efektif → TCP dan/atau infus kronotropik, konsultasi untuk pacing transvena.', next: 'n4', vitals: { hr: 70, sbp: 104, dbp: 62, gcs: 15 }, rhythm: 'nsr' },
        { text: 'Atropin 1 mg tiap 3 menit sampai total 6 mg', q: 'bad', fb: 'Dosis maksimal atropin 3 mg. Jangan menunda pacing.' },
      ] },
    n4: { phase: 'Disposisi', prompt: 'Dengan pacing, HR 70 (capture terkonfirmasi), TD 104/62. Hasil K⁺ 5,1. Langkah berikutnya?',
      choices: [
        { text: 'Konsultasi kardiologi untuk pacing transvena/ permanen, cari penyebab (iskemia, obat, elektrolit), rawat di unit dengan monitor', q: 'best', fb: 'Tepat.', next: 'end' },
        { text: 'Lepas pacing dan pulangkan dengan kontrol poli', q: 'bad', fb: 'Blok total simptomatik membutuhkan pacing definitif.' },
      ] },
    end: { end: true, outcome: 'good', summary: 'Pasien mendapat pacemaker permanen setelah evaluasi.', learning: ['Blok derajat 3 + gejala = tidak stabil', 'Atropin 1 mg (maks 3 mg) — jangan tunda TCP', 'Jangan beri lidokain pada escape ventrikel'] },
  },
},
{
  id: 'case-svt', module: 'acls', topic: 'acls-tachy', level: 1, title: 'Berdebar Mendadak',
  brief: 'Wanita 30 tahun berdebar sejak 40 menit lalu.',
  patient: 'Wanita, 30 tahun, ±55 kg, tanpa riwayat penyakit', mist: 'Berdebar mendadak saat menaiki tangga, pernah serupa dan hilang sendiri.',
  vitals: { hr: 188, sbp: 112, dbp: 72, rr: 20, spo2: 99, gcs: 15, temp: 36.8 }, rhythm: 'svt', start: 'n1',
  nodes: {
    n1: { phase: 'Penilaian', prompt: 'Pasien sadar baik, tidak nyeri dada, tanpa sesak. Monitor menunjukkan ritme berikut. Klasifikasi?', ecg: 'svt',
      choices: [
        { text: 'Takikardia QRS sempit, regular, stabil — kemungkinan SVT re-entry', q: 'best', fb: 'Tepat.', next: 'n2' },
        { text: 'VT — tidak stabil', q: 'bad', fb: 'QRS sempit dan pasien stabil.' },
        { text: 'Atrial fibrillation', q: 'bad', fb: 'Ritme sangat regular — bukan AF.' },
      ] },
    n2: { phase: 'Terapi', prompt: 'Langkah awal?',
      choices: [
        { text: 'Modified Valsalva (meniup 15 detik, lalu dibaringkan dengan tungkai diangkat)', q: 'best', fb: 'Tepat — manuver vagal lini pertama, modified Valsalva lebih efektif.', next: 'n3' },
        { text: 'Kardioversi sinkron 100 J', q: 'bad', fb: 'Pasien stabil — kardioversi tidak perlu sebagai lini pertama.' },
        { text: 'Pijat karotis bilateral bersamaan', q: 'bad', fb: 'Jangan pijat karotis bilateral. Pijat karotis unilateral pun dihindari pada lansia/ bruit.' },
      ] },
    n3: { phase: 'Gagal vagal', prompt: 'Manuver vagal tidak berhasil. Langkah berikutnya?',
      choices: [
        { text: 'Adenosin 6 mg IV push cepat di vena antecubiti + flush 20 mL, rekam strip; bila gagal 12 mg', q: 'best', fb: 'Tepat. Beritahu pasien efek sementara (rasa "seperti akan mati", flushing).', next: 'end', rhythm: 'nsr', vitals: { hr: 82 } },
        { text: 'Adenosin 6 mg diberikan perlahan selama 2 menit', q: 'bad', fb: 'Adenosin memiliki waktu paruh detik — harus push cepat + flush.' },
        { text: 'Amiodarone 300 mg bolus', q: 'bad', fb: 'Dosis henti jantung; bukan pilihan pertama SVT stabil.' },
      ] },
    end: { end: true, outcome: 'good', summary: 'Konversi ke sinus setelah adenosin 6 mg.', learning: ['Stabil sempit regular → vagal → adenosin 6 → 12', 'Rekam strip saat adenosin', 'Tidak stabil → kardioversi sinkron 50–100 J'] },
  },
},
{
  id: 'case-stemi-rv', module: 'acls', topic: 'acls-acs', level: 3, title: 'Nyeri Dada dan Hipotensi',
  brief: 'Pria 62 tahun, nyeri dada 2 jam, keringat dingin.',
  patient: 'Pria, 62 tahun, ±75 kg, DM tipe 2', mist: 'Nyeri dada kiri menjalar ke rahang 2 jam, mual, diaforesis. Tidak menggunakan sildenafil.',
  vitals: { hr: 58, sbp: 88, dbp: 54, rr: 22, spo2: 95, gcs: 15, temp: 36.5 }, rhythm: 'stemi', start: 'n1',
  nodes: {
    n1: { phase: 'Evaluasi awal', prompt: 'Tiba di IGD. Apa yang harus dilakukan dalam 10 menit pertama?',
      choices: [
        { text: 'EKG 12 lead, monitor, IV, aspirin 162–325 mg dikunyah', q: 'best', fb: 'Tepat.', next: 'n2' },
        { text: 'Tunggu troponin untuk memastikan ACS', q: 'bad', fb: 'EKG ≤10 menit; troponin tidak boleh menunda reperfusi STEMI.' },
        { text: 'O₂ 15 L/menit NRM rutin', q: 'ok', fb: 'O₂ hanya bila SpO₂ <90%; SpO₂ 95% tidak butuh O₂ tambahan.', next: 'n2' },
      ] },
    n2: { phase: 'EKG', prompt: 'EKG: elevasi ST II, III, aVF; ST III > II; V4R elevasi ST 1 mm. TD 88/54. Perawat menawarkan nitrogliserin SL. Respons Anda?', ecg: 'stemi',
      choices: [
        { text: 'Tunda nitrat — curiga infark RV dengan hipotensi; beri bolus cairan hati-hati, aktivasi cath lab', q: 'best', fb: 'Tepat — infark RV bergantung preload; nitrat dapat menyebabkan hipotensi berat.', next: 'n3', vitals: { sbp: 100, dbp: 60 } },
        { text: 'Beri nitrogliserin 0,4 mg SL untuk nyeri', q: 'bad', fb: 'Nitrat kontraindikasi pada SBP <90 dan infark RV.', vitals: { sbp: 66, dbp: 38, hr: 52 } },
        { text: 'Morfin 10 mg IV untuk nyeri', q: 'bad', fb: 'Opioid dosis besar dapat memperburuk hipotensi & menunda absorpsi P2Y12; gunakan hati-hati dalam dosis kecil bila perlu.', vitals: { sbp: 74 } },
      ] },
    n3: { phase: 'Reperfusi', prompt: 'Rumah sakit Anda tidak punya cath lab. Pusat PCI terdekat ±3 jam perjalanan. Onset nyeri 2,5 jam. Tidak ada kontraindikasi fibrinolitik. Strategi terbaik?',
      choices: [
        { text: 'Fibrinolitik dalam ≤30 menit lalu transfer ke pusat PCI (farmako-invasif)', q: 'best', fb: 'Tepat — PCI tidak tercapai ≤120 menit → fibrinolisis lalu transfer.', next: 'end' },
        { text: 'Transfer untuk PCI primer tanpa fibrinolitik', q: 'ok', fb: 'Penundaan >120 menit — fibrinolisis lebih dulu lebih bermanfaat bila tidak ada kontraindikasi.', next: 'end' },
        { text: 'Rawat di ICU dengan antikoagulan saja', q: 'bad', fb: 'STEMI membutuhkan reperfusi.' },
      ] },
    end: { end: true, outcome: 'good', summary: 'Fibrinolitik diberikan, nyeri berkurang dan resolusi ST >50%; pasien ditransfer untuk angiografi.', learning: ['STEMI inferior → cek V4R', 'Infark RV: hindari nitrat, beri cairan', 'PCI tidak ≤120 menit → fibrinolisis ≤30 menit'] },
  },
},
{
  id: 'case-tbi', module: 'atls', topic: 'atls-tbi', level: 3, title: 'Jatuh dari Tangga — Penurunan Kesadaran',
  brief: 'Pria 45 tahun jatuh dari tangga 3 m, sempat sadar lalu menurun.',
  patient: 'Pria, 45 tahun, ±80 kg', mist: 'Jatuh 3 m, kepala membentur lantai. Sempat bicara ("lucid") 15 menit, lalu makin mengantuk dan muntah.',
  vitals: { hr: 64, sbp: 168, dbp: 92, rr: 10, spo2: 89, gcs: 7, temp: 36.4 }, rhythm: 'sinus-brady', start: 'n1',
  nodes: {
    n1: { phase: 'Primary survey', prompt: 'GCS E1V2M4 = 7, snoring, SpO₂ 89%. Pupil kanan 6 mm tidak reaktif, kiri 3 mm reaktif. Prioritas pertama?',
      choices: [
        { text: 'Amankan airway: definitive airway (RSI dengan MILS), target SpO₂ ≥94% dan PaCO₂ 35–45', q: 'best', fb: 'Tepat — GCS ≤8 dan hipoksia memperburuk cedera otak sekunder.', next: 'n2', vitals: { spo2: 98, rr: 14 } },
        { text: 'CT kepala segera sebelum intervensi apa pun', q: 'bad', fb: 'Airway & oksigenasi dahulu. Hipoksia memperparah cedera otak.', vitals: { spo2: 84, gcs: 6 } },
        { text: 'Turunkan TD dengan labetalol karena 168/92', q: 'bad', fb: 'Hipertensi + bradikardia mungkin respons Cushing terhadap TIK tinggi; menurunkan TD dapat menurunkan CPP.' },
      ] },
    n2: { phase: 'Tanda herniasi', prompt: 'Terintubasi, SpO₂ 98%. Tanda herniasi unkal kanan menetap. Terapi yang tepat sambil menghubungi bedah saraf?',
      choices: [
        { text: 'Mannitol 1 g/kg IV (TD adekuat) atau salin hipertonik, hiperventilasi singkat PaCO₂ ~30–35, elevasi kepala 30°', q: 'best', fb: 'Tepat — terapi bridging herniasi.', next: 'n3' },
        { text: 'Dexamethasone 10 mg IV', q: 'bad', fb: 'Steroid meningkatkan mortalitas pada TBI (CRASH).' },
        { text: 'Hiperventilasi PaCO₂ 20 mmHg berjam-jam', q: 'bad', fb: 'Vasokonstriksi berat → iskemia serebral. Hanya singkat dan moderat.' },
      ] },
    n3: { phase: 'Imaging', prompt: 'CT: lesi hiperdens bikonveks temporoparietal kanan ±45 mL dengan midline shift 8 mm. Diagnosis & tindakan?',
      choices: [
        { text: 'Epidural hematoma → kraniotomi evakuasi segera (transfer bila tidak ada bedah saraf)', q: 'best', fb: 'Tepat — EDH >30 mL adalah indikasi evakuasi bedah.', next: 'end' },
        { text: 'Subdural hematoma → observasi ICU', q: 'bad', fb: 'Bikonveks = EDH; dengan volume & shift ini perlu operasi segera.' },
      ] },
    end: { end: true, outcome: 'good', summary: 'EDH dievakuasi; pasien pulih dengan defisit minimal.', learning: ['Lucid interval → curigai EDH', 'Cegah hipoksia & hipotensi', 'Herniasi: hiperosmolar + hiperventilasi singkat → operasi'] },
  },
},
];
export const CASE_MAP = Object.fromEntries(CASES.map(c => [c.id, c]));
