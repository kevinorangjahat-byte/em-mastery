// =============================================================
// AI tutor — Claude API melalui SDK resmi @anthropic-ai/sdk (browser).
// Kunci API disimpan HANYA di IndexedDB perangkat ini dan dikirim
// langsung ke api.anthropic.com. Untuk deployment multi-user, pindahkan
// panggilan ini ke backend/proxy agar kunci tidak berada di browser.
// =============================================================
import { search } from './search.js';
import { TOPIC_MAP } from '../data/index.js';

const SDK_URL = 'https://esm.sh/@anthropic-ai/sdk';
let sdkPromise = null;
const loadSDK = () => (sdkPromise ||= import(/* @vite-ignore */ SDK_URL));

export const MODES = {
  free: { label: 'Tanya bebas', hint: 'Tanyakan apa saja tentang ATLS/ACLS.' },
  simple: { label: 'Jelaskan sederhana', hint: 'Penjelasan dari dasar, dengan analogi, lalu naik ke level klinis.' },
  compare: { label: 'Bandingkan diagnosis', hint: 'Mis. "Tension PTX vs tamponade vs massive hemothorax".' },
  algorithm: { label: 'Bedah algoritma', hint: 'Mis. "Bedah algoritma takikardia AHA langkah demi langkah".' },
  case: { label: 'Diskusi kasus', hint: 'Tempel vignette; tutor akan berdiskusi Sokratik.' },
};

const MODE_INSTR = {
  free: 'Jawab pertanyaan secara terstruktur.',
  simple: 'Jelaskan dari konsep paling dasar dengan bahasa sederhana dan satu analogi, lalu naikkan ke level klinis untuk dokter.',
  compare: 'Buat perbandingan dalam tabel markdown (patofisiologi, presentasi, temuan pemeriksaan/penunjang, tatalaksana, jebakan), lalu jelaskan cara membedakan di bedside.',
  algorithm: 'Bedah algoritma langkah demi langkah: untuk tiap langkah jelaskan APA yang dilakukan, MENGAPA (rasional fisiologis/bukti), dosis bila relevan, dan kesalahan umum.',
  case: 'Diskusikan kasus secara Sokratik: rangkum data, susun diferensial, prioritas xABCDE/algoritma, langkah berikutnya beserta alasannya, lalu ajukan 1–2 pertanyaan balik kepada pengguna untuk menguji penalaran.',
};

const SYSTEM = `Anda adalah AI tutor dalam aplikasi "Emergency Medicine Mastery – ATLS & ACLS Learning System". Pengguna adalah dokter yang belajar ATLS dan ACLS untuk kasus klinis, ujian, dan pelatihan sertifikasi.

Bahasa: Bahasa Indonesia; istilah medis baku boleh dalam bahasa Inggris.

Cara menjawab:
- Jelaskan reasoning secara terstruktur, bukan jawaban singkat. Gunakan heading pendek, poin, dan tabel bila membantu. Bagian yang umumnya berguna: Inti jawaban → Penjelasan/rasional → Langkah praktis/dosis bila relevan → Jebakan umum → Ringkasan high-yield.
- Dasarkan konten pada guideline resmi: AHA (Guidelines CPR & ECC 2020, Focused Update ACLS 2023, Guidelines 2025) untuk ACLS; American College of Surgeons ATLS (edisi 10, 2018; edisi 11, 2025) untuk ATLS; serta guideline evidence-based lain (BTF, ACC/AHA ACS 2025, AHA/ASA stroke). Sebutkan sumber dan tahun untuk rekomendasi penting.
- Jangan mengarang dosis, algoritma, atau rekomendasi. Jika Anda tidak yakin atau rincian berbeda antar edisi/protokol, katakan secara eksplisit dengan label "⚠ Perlu verifikasi" dan jelaskan apa yang perlu dicek.
- Konteks dari materi aplikasi (bila disertakan) adalah ringkasan yang disusun untuk aplikasi ini; gunakan sebagai rujukan utama dan tandai bila Anda menemukan ketidaksesuaian dengan guideline.
- Akhiri jawaban klinis dengan satu baris pengingat singkat bahwa ini untuk edukasi dan protokol rumah sakit/guideline terbaru serta supervisi klinis tetap berlaku.
- Bila pertanyaan menyangkut pasien nyata yang sedang ditangani, ingatkan bahwa aplikasi ini bukan pengganti penilaian klinis dan dorong konsultasi senior/protokol lokal, namun tetap berikan kerangka berpikir edukatif.`;

/** Ambil konteks lokal yang relevan (RAG sederhana). */
export function retrieve(q, topicId) {
  const hits = search(q, 6).filter(h => h.kind === 'Topik' || h.kind === 'Obat').slice(0, 3);
  if (topicId && TOPIC_MAP[topicId] && !hits.some(h => h.id === topicId)) hits.unshift({ kind: 'Topik', id: topicId, raw: TOPIC_MAP[topicId], title: TOPIC_MAP[topicId].title });
  const blocks = hits.map(h => {
    if (h.kind === 'Topik') { const t = h.raw; return `## Topik: ${t.title}\nManajemen: ${t.management.join(' | ')}\nDosis: ${(t.doses || []).join(' | ')}\nHigh-yield: ${t.highYield.join(' | ')}\nRed flags: ${t.redFlags.join(' | ')}\nReferensi: ${t.refs.join(', ')}`; }
    const d = h.raw; return `## Obat: ${d.name}\nDewasa: ${d.adult}\nPediatrik: ${d.peds}\nMaks: ${d.max}\nKontraindikasi: ${d.contra.join(' | ')}`;
  });
  return { hits, text: blocks.join('\n\n') };
}

/**
 * Kirim percakapan ke Claude dengan streaming.
 * onText(delta) dipanggil untuk setiap potongan teks. Mengembalikan pesan final.
 */
export async function askClaude({ apiKey, model, effort, history, mode, context, onText, signal }) {
  const { default: Anthropic } = await loadSDK();
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const messages = history.map((m, i) => {
    if (i === history.length - 1 && m.role === 'user') {
      const ctx = context ? `<konteks_materi_aplikasi>\n${context}\n</konteks_materi_aplikasi>\n\n` : '';
      return { role: 'user', content: `${ctx}<mode>${MODE_INSTR[mode] || MODE_INSTR.free}</mode>\n\n${m.content}` };
    }
    return { role: m.role, content: m.content };
  });
  const params = {
    model,
    max_tokens: 16000,
    system: SYSTEM,
    thinking: { type: 'adaptive' },
    output_config: { effort },
    messages,
  };
  // Server-side refusal fallback (opt-in) untuk model yang mendukungnya.
  const supportsFallback = ['claude-opus-5-5', 'claude-sonnet-5-5'].includes(model);
  const stream = supportsFallback
    ? client.beta.messages.stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }, { signal })
    : client.messages.stream(params, { signal });
  for await (const ev of stream) {
    if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') onText(ev.delta.text);
  }
  const final = await stream.finalMessage();
  return final;
}

export async function errorMessage(e) {
  try {
    const { default: Anthropic } = await loadSDK();
    if (e instanceof Anthropic.AuthenticationError) return 'Kunci API tidak valid (401). Periksa di Pengaturan.';
    if (e instanceof Anthropic.PermissionDeniedError) return 'Akses ditolak (403) untuk model/fitur ini.';
    if (e instanceof Anthropic.NotFoundError) return 'Model tidak ditemukan (404). Pilih model lain di Pengaturan.';
    if (e instanceof Anthropic.RateLimitError) return 'Batas laju tercapai (429). Coba lagi sebentar.';
    if (e instanceof Anthropic.BadRequestError) return 'Permintaan ditolak (400): ' + (e.message || '');
    if (e instanceof Anthropic.APIConnectionError) return 'Tidak dapat terhubung ke API. Periksa koneksi internet.';
    if (e instanceof Anthropic.APIError) return `Kesalahan API (${e.status ?? '?'}): ${e.message}`;
  } catch {}
  if (e?.name === 'AbortError') return 'Dihentikan.';
  return 'Gagal memuat AI: ' + (e?.message || e);
}
