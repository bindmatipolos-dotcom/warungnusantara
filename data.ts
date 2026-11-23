export type Phase = "pagi" | "siang" | "sore" | "malam";
const A = "/assets/";

export interface Product { id: string; name: string; buy: number; sell: number; img: string; }
export const PRODUCTS: Product[] = [
  { id: "mie_goreng", name: "Mie Goreng", buy: 8000, sell: 15000, img: A + "food/B_00.png" },
  { id: "nasi_goreng", name: "Nasi Goreng", buy: 9000, sell: 17000, img: A + "food/B_01.png" },
  { id: "bakso", name: "Bakso", buy: 8000, sell: 15000, img: A + "food/B_10.png" },
  { id: "seblak", name: "Seblak", buy: 7000, sell: 13000, img: A + "food/B_11.png" },
  { id: "soto", name: "Soto Ayam", buy: 9000, sell: 16000, img: A + "food/B_05.png" },
  { id: "sate", name: "Sate Ayam", buy: 10000, sell: 18000, img: A + "food/B_12.png" },
  { id: "gorengan", name: "Gorengan", buy: 3000, sell: 6000, img: A + "food/A_18.png" },
  { id: "es_teh", name: "Es Teh", buy: 1500, sell: 4000, img: A + "food/B_15.png" },
  { id: "es_jeruk", name: "Es Jeruk", buy: 2500, sell: 6000, img: A + "food/B_13.png" },
  { id: "kopi", name: "Kopi Sachet", buy: 1000, sell: 3500, img: A + "food/A_14.png" },
  { id: "indomie", name: "Indomie Rebus", buy: 3000, sell: 8000, img: A + "food/A_10.png" },
  { id: "kerupuk", name: "Kerupuk", buy: 1500, sell: 3000, img: A + "food/A_17.png" },
  { id: "rokok", name: "Rokok", buy: 24000, sell: 28000, img: A + "food/B_21.png" },
  { id: "air", name: "Air Mineral", buy: 2000, sell: 4000, img: A + "food/A_16.png" },
  { id: "susu", name: "Susu Sachet", buy: 1500, sell: 3500, img: A + "food/A_12.png" },
  { id: "jajanan", name: "Jajanan", buy: 1000, sell: 2500, img: A + "food/B_06.png" },
];
export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
export const DRINKS = ["es_teh", "es_jeruk", "air", "kopi", "susu"];

export interface Supplier { id: string; name: string; mult: number; minQty: number; minLevel: number; }
export const SUPPLIERS: Supplier[] = [
  { id: "pasar", name: "Pasar Induk", mult: 1.0, minQty: 1, minLevel: 1 },
  { id: "grosir", name: "Grosir Makmur (min 10)", mult: 0.92, minQty: 10, minLevel: 2 },
  { id: "kop", name: "Pemasok Koperasi (min 25)", mult: 0.85, minQty: 25, minLevel: 4 },
];

export interface Tier { id: number; name: string; sprite: string; h: number; cost: number; interior: string; desc: string; }
export const TIERS: Tier[] = [
  { id: 0, name: "Warung Kecil", sprite: "buildings/warung.png", h: 270, cost: 0, interior: "warung", desc: "Warung sederhana beratap merah." },
  { id: 1, name: "Warung Besar", sprite: "buildings/warung_A.png", h: 340, cost: 400000, interior: "warung", desc: "Lebih luas, lebih banyak etalase." },
  { id: 2, name: "Toko Modern", sprite: "buildings/minimarket_A.png", h: 340, cost: 2000000, interior: "minimarket", desc: "Minimarket modern berpendingin." },
  { id: 3, name: "Koperasi Desa Merah Putih", sprite: "buildings/koperasi_A.png", h: 400, cost: 8000000, interior: "koperasi", desc: "Puncak usaha: Koperasi Desa Merah Putih!" },
];

export interface MissionDef { id: string; title: string; target: number; reward: number; xp: number; }
export const MISSIONS: MissionDef[] = [
  { id: "sell_mie", title: "Jual 5 Mie Goreng", target: 5, reward: 25000, xp: 30 },
  { id: "sell_drink", title: "Jual 10 Minuman", target: 10, reward: 30000, xp: 30 },
  { id: "buy_stock", title: "Beli stok 20 barang", target: 20, reward: 20000, xp: 25 },
  { id: "serve", title: "Layani 8 pelanggan", target: 8, reward: 40000, xp: 40 },
  { id: "eat", title: "Makan di angkringan", target: 1, reward: 10000, xp: 15 },
];

export function phaseOf(h: number): Phase {
  if (h >= 5 && h < 11) return "pagi";
  if (h >= 11 && h < 15) return "siang";
  if (h >= 15 && h < 18) return "sore";
  return "malam";
}
export const rp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
export const xpNeed = (lv: number) => 100 + (lv - 1) * 80;
