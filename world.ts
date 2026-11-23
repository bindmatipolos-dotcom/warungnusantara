import type { Phase } from "./data";
export const A = "/assets/";
export const VW = 1280, VH = 720;
export const GY = 618;        // kaki pemain / NPC di trotoar
export const WORLD = 7900;

export interface BDef {
  id: string; name: string; sprite: string; x: number; h: number; door: number; interior: string;
  kind: "rumah" | "dagang" | "umum"; flip?: boolean; windows?: [number, number][]; // posisi jendela relatif (0..1)
}
export const BUILDINGS: BDef[] = [
  { id: "r1", name: "Rumah Kecil", sprite: "buildings/rumah_kecil_A.png", x: 250, h: 270, door: 0.42, interior: "house1", kind: "rumah", windows: [[0.7, 0.55], [0.2, 0.55]] },
  { id: "r2", name: "Rumah Sederhana", sprite: "buildings/rumah_sedang.png", x: 760, h: 260, door: 0.30, interior: "house2", kind: "rumah", windows: [[0.62, 0.55]] },
  { id: "r3", name: "Rumah Modern", sprite: "buildings/rumah_modern.png", x: 1320, h: 330, door: 0.50, interior: "house3", kind: "rumah", windows: [[0.25, 0.3], [0.75, 0.3], [0.25, 0.62]] },
  { id: "r4", name: "Rumah Besar", sprite: "buildings/rumah_klasik_A.png", x: 1880, h: 290, door: 0.30, interior: "house4", kind: "rumah", windows: [[0.62, 0.55]] },
  { id: "r5", name: "Rumah Bertingkat", sprite: "buildings/rumah_sedang.png", x: 2400, h: 270, door: 0.30, interior: "house5", kind: "rumah", flip: true, windows: [[0.62, 0.55]] },
  { id: "warung", name: "Warung Nusantara", sprite: "buildings/warung.png", x: 2980, h: 270, door: 0.50, interior: "warung", kind: "dagang" },
  { id: "angk", name: "Angkringan", sprite: "buildings/angkringan.png", x: 3700, h: 280, door: 0.50, interior: "angkringan", kind: "dagang" },
  { id: "mini", name: "Minimarket", sprite: "buildings/minimarket.png", x: 4170, h: 262, door: 0.50, interior: "minimarket", kind: "dagang" },
  { id: "kop", name: "Koperasi Desa", sprite: "buildings/koperasi.png", x: 4780, h: 380, door: 0.50, interior: "koperasi", kind: "dagang" },
  { id: "balai", name: "Balai Desa", sprite: "buildings/balai_desa.png", x: 5850, h: 270, door: 0.50, interior: "balai", kind: "umum" },
  { id: "pos", name: "Pos Ronda", sprite: "buildings/pos_ronda.png", x: 6380, h: 220, door: 0.50, interior: "pos", kind: "umum" },
  { id: "masjid", name: "Masjid", sprite: "buildings/masjid.png", x: 6700, h: 330, door: 0.50, interior: "masjid", kind: "umum" },
];
export const PLAYGROUND = { x: 7200, h: 300, sprite: "environment/playground.png" };
export const PARKING = { x0: 5360, x1: 5720 };
export const HALTE_X = 5760;
export const AREAS = [
  { name: "Komplek Perumahan", x0: 0, x1: 2850 },
  { name: "Pusat Perdagangan", x0: 2850, x1: 5760 },
  { name: "Fasilitas Umum", x0: 5760, x1: WORLD },
];
export const BENCH_X = [1100, 1700, 2250, 3620, 4090, 5130, 6260, 6620, 7160];
export const LAMP_X = [500, 1050, 1620, 2200, 2850, 3600, 4100, 4700, 5300, 5800, 6330, 6900, 7500];
export const BIN_X = [640, 1230, 1800, 2330, 3560, 4600, 5600, 6280, 7090];

export interface IntDef { id: string; name: string; rooms: string[]; tint?: string; flip?: boolean; }
export const INTERIORS: Record<string, IntDef> = {
  house1: { id: "house1", name: "Rumah Kecil", rooms: ["ruang_tamu", "kamar", "dapur", "kamar_mandi"], tint: "rgba(255,190,120,.10)" },
  house2: { id: "house2", name: "Rumah Sederhana", rooms: ["ruang_tamu", "dapur", "kamar", "kamar_mandi"], tint: "rgba(120,200,255,.10)", flip: true },
  house3: { id: "house3", name: "Rumah Modern", rooms: ["kamar", "ruang_tamu", "dapur", "kamar_mandi"], tint: "rgba(200,255,200,.10)" },
  house4: { id: "house4", name: "Rumah Besar", rooms: ["ruang_tamu", "kamar", "kamar", "dapur", "kamar_mandi"], tint: "rgba(255,160,160,.10)" },
  house5: { id: "house5", name: "Rumah Bertingkat", rooms: ["dapur", "ruang_tamu", "kamar", "kamar_mandi"], tint: "rgba(220,200,255,.12)", flip: true },
  warung: { id: "warung", name: "Warung Nusantara", rooms: ["warung"] },
  minimarket: { id: "minimarket", name: "Minimarket", rooms: ["warung"], tint: "rgba(80,140,255,.16)", flip: true },
  angkringan: { id: "angkringan", name: "Angkringan", rooms: ["angkringan"] },
  koperasi: { id: "koperasi", name: "Koperasi Desa Merah Putih", rooms: ["koperasi", "kantor"] },
  balai: { id: "balai", name: "Balai Desa", rooms: ["kantor", "kantor"], tint: "rgba(255,230,160,.12)", flip: true },
  pos: { id: "pos", name: "Pos Ronda", rooms: ["angkringan"], tint: "rgba(60,60,90,.25)", flip: true },
  masjid: { id: "masjid", name: "Masjid", rooms: ["kantor"], tint: "rgba(60,180,120,.18)" },
};
// aktivitas ruangan (NPC dalam interior)
export const ROOM_NPCS: Record<string, { sprite: string; x: number; act: string; scale?: number }[]> = {
  ruang_tamu: [{ sprite: "sit_dark", x: 0.40, act: "tv" }, { sprite: "kid1", x: 0.62, act: "tv", scale: 0.8 }],
  kamar: [{ sprite: "kid_backpack", x: 0.70, act: "idle", scale: 0.85 }],
  dapur: [{ sprite: "hijab_pink", x: 0.45, act: "cook" }],
  kamar_mandi: [],
  warung: [{ sprite: "man_white", x: 0.74, act: "sell" }],
  angkringan: [{ sprite: "elder", x: 0.72, act: "cook" }, { sprite: "sit_blue", x: 0.30, act: "eat" }, { sprite: "sit_blue2", x: 0.46, act: "eat" }],
  koperasi: [{ sprite: "man_blazer", x: 0.62, act: "sell" }, { sprite: "sit_brown", x: 0.30, act: "idle" }],
  kantor: [{ sprite: "sit_dark", x: 0.5, act: "idle" }],
};
export const ROOM_SPOT: Record<string, { kind: string; label: string }> = {
  ruang_tamu: { kind: "tv", label: "TONTON TV" },
  kamar: { kind: "bed", label: "TIDUR" },
  dapur: { kind: "masak", label: "MASAK" },
  kamar_mandi: { kind: "mandi", label: "MANDI" },
};

export type Act = "walk" | "sit" | "chat" | "sweep" | "water" | "cook" | "sell" | "shop" | "eat" | "play" | "carry" | "sleep" | "tv" | "work";
export interface NpcDef { id: string; sprite: string; sit?: string; crouch?: string; scale: number; home: string; speed: number; sched: Record<Phase, Act[]>; chat?: string; }
export const NPC_DEFS: NpcDef[] = [
  { id: "ibu_sari", sprite: "girl_pink", scale: 0.92, home: "r1", speed: 55, sched: { pagi: ["sweep", "water"], siang: ["shop", "walk"], sore: ["chat", "sit"], malam: ["tv", "sleep"] }, chat: "ibu_dewi", crouch: "crouch_green" },
  { id: "ibu_dewi", sprite: "hijab_pink", scale: 0.95, home: "r2", speed: 50, sched: { pagi: ["walk", "water"], siang: ["shop", "walk"], sore: ["chat", "sit"], malam: ["tv", "sleep"] }, crouch: "crouch_red" },
  { id: "pak_budi", sprite: "man_white", scale: 1.0, home: "r3", speed: 70, sched: { pagi: ["walk", "carry"], siang: ["work", "shop"], sore: ["sit", "walk"], malam: ["eat", "tv"] }, sit: "sit_dark" },
  { id: "pak_haji", sprite: "elder", scale: 0.98, home: "r4", speed: 38, sched: { pagi: ["sweep", "walk"], siang: ["sit", "walk"], sore: ["sit", "chat"], malam: ["eat", "sleep"] }, sit: "sit_brown", chat: "pak_rt" },
  { id: "pak_rt", sprite: "man_blazer", scale: 1.0, home: "r5", speed: 60, sched: { pagi: ["walk", "work"], siang: ["work", "shop"], sore: ["chat", "sit"], malam: ["eat", "sleep"] }, sit: "sit_dark" },
  { id: "mbak_ani", sprite: "hijab_grey", scale: 0.93, home: "r5", speed: 62, sched: { pagi: ["walk"], siang: ["shop", "carry"], sore: ["walk", "sit"], malam: ["tv", "sleep"] }, sit: "sit_blue2" },
  { id: "tukang_sapu", sprite: "sweeper_green", scale: 1.0, home: "r2", speed: 45, sched: { pagi: ["sweep"], siang: ["sweep", "walk"], sore: ["sweep", "sit"], malam: ["sleep"] } },
  { id: "petugas_oranye", sprite: "sheetA_06", scale: 1.0, home: "r3", speed: 50, sched: { pagi: ["sweep", "walk"], siang: ["work"], sore: ["walk"], malam: ["sleep"] } },
  { id: "kakek", sprite: "sheetA_05", scale: 0.98, home: "r1", speed: 34, sched: { pagi: ["walk", "sit"], siang: ["sit"], sore: ["chat", "sit"], malam: ["eat", "sleep"] }, sit: "sit_brown", chat: "pak_haji" },
  { id: "penjual_warung", sprite: "man_white", scale: 1.0, home: "warung", speed: 50, sched: { pagi: ["sell"], siang: ["sell"], sore: ["sell", "carry"], malam: ["sell"] } },
  { id: "tukang_angkringan", sprite: "elder", scale: 0.98, home: "angk", speed: 40, sched: { pagi: ["sleep"], siang: ["sleep"], sore: ["cook"], malam: ["cook"] } },
  { id: "pelanggan_malam1", sprite: "man_blazer", scale: 1.0, home: "angk", speed: 62, sched: { pagi: ["walk"], siang: ["shop"], sore: ["walk", "sit"], malam: ["eat"] }, sit: "sit_dark" },
  { id: "pelanggan_malam2", sprite: "man_white", scale: 1.0, home: "angk", speed: 66, sched: { pagi: ["work"], siang: ["shop"], sore: ["walk"], malam: ["eat", "chat"] }, sit: "sit_blue", chat: "pelanggan_malam1" },
  { id: "kasir_kop", sprite: "hijab_peach", scale: 0.95, home: "kop", speed: 40, sched: { pagi: ["work"], siang: ["work"], sore: ["work", "carry"], malam: ["sleep"] } },
  { id: "pelajar1", sprite: "student_boy", scale: 0.85, home: "r1", speed: 90, sched: { pagi: ["walk"], siang: ["play", "walk"], sore: ["play"], malam: ["tv", "sleep"] } },
  { id: "pelajar2", sprite: "kid_backpack", scale: 0.85, home: "r2", speed: 85, sched: { pagi: ["walk"], siang: ["walk", "play"], sore: ["play"], malam: ["tv", "sleep"] } },
  { id: "pelajar3", sprite: "hijab_w1", scale: 0.88, home: "r3", speed: 80, sched: { pagi: ["walk"], siang: ["shop", "walk"], sore: ["play", "sit"], malam: ["tv", "sleep"] }, sit: "sit_blue2" },
  { id: "pelajar4", sprite: "hijab_w2", scale: 0.88, home: "r4", speed: 78, sched: { pagi: ["walk"], siang: ["shop", "walk"], sore: ["play", "chat"], malam: ["tv", "sleep"] }, chat: "pelajar3" },
  { id: "anak1", sprite: "kid1", scale: 0.78, home: "r5", speed: 100, sched: { pagi: ["walk"], siang: ["play"], sore: ["play"], malam: ["tv", "sleep"] } },
  { id: "anak2", sprite: "kid2", scale: 0.78, home: "r1", speed: 105, sched: { pagi: ["walk"], siang: ["play"], sore: ["play"], malam: ["tv", "sleep"] } },
  { id: "anak3", sprite: "hijab_small", scale: 0.75, home: "r2", speed: 95, sched: { pagi: ["walk"], siang: ["play"], sore: ["play"], malam: ["tv", "sleep"] } },
  { id: "kuli", sprite: "worker_hardhat", scale: 0.95, home: "kop", speed: 58, sched: { pagi: ["carry", "work"], siang: ["carry"], sore: ["carry", "sit"], malam: ["sleep"] } },
  { id: "ibu_lina", sprite: "hijab_red", scale: 0.92, home: "r4", speed: 56, sched: { pagi: ["walk", "shop"], siang: ["shop"], sore: ["chat", "walk"], malam: ["tv", "sleep"] }, chat: "ibu_sari" },
  { id: "anak_motor", sprite: "student_boy", scale: 0.85, home: "pos", speed: 88, sched: { pagi: ["walk"], siang: ["walk", "sit"], sore: ["sit", "play"], malam: ["eat", "sleep"] }, sit: "sit_blue" },
];
