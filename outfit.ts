// Sistem pakaian berlapis: setiap bagian digambar sebagai layer di atas sprite karakter
// (dipotong mengikuti siluet karakter dengan 'source-atop'), sehingga bisa dipakai di semua frame animasi.
export interface Outfit {
  shirt: string; shirtColor: string;
  pants: string; pantsColor: string;
  shoes: string; shoeColor: string;
  hat: string; hatColor: string;
}
export const DEFAULT_OUTFIT: Outfit = {
  shirt: "asli", shirtColor: "#2b6cb0", pants: "asli", pantsColor: "#23304a",
  shoes: "asli", shoeColor: "#f2f2f2", hat: "none", hatColor: "#d33",
};
export interface Opt { id: string; name: string; color?: boolean }
export const SHIRTS: Opt[] = [
  { id: "asli", name: "Asli (default)" }, { id: "kaus", name: "Kaus polos", color: true },
  { id: "kemeja_putih", name: "Kemeja putih" }, { id: "kemeja_biru", name: "Kemeja biru" },
  { id: "jaket_hitam", name: "Jaket hitam" }, { id: "jaket_ojol", name: "Jaket ojek online" },
  { id: "seragam_kop", name: "Seragam koperasi" }, { id: "pedagang", name: "Baju pedagang", color: true },
  { id: "batik", name: "Baju batik", color: true }, { id: "santai", name: "Santai (warna bebas)", color: true },
];
export const PANTS: Opt[] = [
  { id: "asli", name: "Asli (default)" }, { id: "panjang", name: "Celana panjang", color: true },
  { id: "pendek", name: "Celana pendek", color: true }, { id: "jeans", name: "Jeans" },
];
export const SHOES: Opt[] = [
  { id: "asli", name: "Asli (default)" }, { id: "sneakers", name: "Sepatu sneakers", color: true },
  { id: "sandal", name: "Sandal" }, { id: "hitam", name: "Sepatu hitam" },
];
export const HATS: Opt[] = [
  { id: "none", name: "Tanpa topi" }, { id: "topi", name: "Topi baseball", color: true },
  { id: "peci", name: "Peci hitam" }, { id: "helm_ojol", name: "Helm ojol" },
  { id: "caping", name: "Caping petani" }, { id: "rambut_klimis", name: "Rambut klimis", color: true },
];
export const PALETTE = ["#d33", "#e67e22", "#f1c40f", "#27ae60", "#2b6cb0", "#6c3fb5", "#e84393", "#f5f5f5", "#444", "#111", "#8b5a2b", "#16a085"];

const bboxCache = new Map<string, [number, number, number, number]>();
const outCache = new Map<string, HTMLCanvasElement>();
const SKIN = "#e0a574";

function bbox(img: HTMLImageElement): [number, number, number, number] {
  const k = img.src;
  const c = bboxCache.get(k); if (c) return c;
  const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
  const x = cv.getContext("2d")!; x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
  for (let y = 0; y < cv.height; y++) for (let xx = 0; xx < cv.width; xx++) {
    if (d[(y * cv.width + xx) * 4 + 3] > 40) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const r: [number, number, number, number] = [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
  bboxCache.set(k, r); return r;
}

export function outfitKey(o: Outfit) { return Object.values(o).join("|"); }

/** Mengembalikan canvas (dengan ruang ekstra di atas untuk topi) berisi karakter + pakaian. */
export function dressed(img: HTMLImageElement, o: Outfit): HTMLCanvasElement {
  const key = img.src + "#" + outfitKey(o);
  const hit = outCache.get(key); if (hit) return hit;
  const [bx, by, bw, bh] = bbox(img);
  const pad = Math.round(bh * 0.22);
  const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height + pad;
  const g = cv.getContext("2d")!;
  g.drawImage(img, 0, pad);
  const Y = (f: number) => by + pad + bh * f;
  const cx = bx + bw / 2;
  g.globalCompositeOperation = "source-atop";
  const shade = (y0: number, y1: number) => {
    const gr = g.createLinearGradient(bx, 0, bx + bw, 0);
    gr.addColorStop(0, "rgba(0,0,0,.28)"); gr.addColorStop(.35, "rgba(255,255,255,.10)"); gr.addColorStop(.7, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.30)");
    g.fillStyle = gr; g.fillRect(bx, y0, bw, y1 - y0);
  };
  // ---- celana
  const ty0 = Y(0.60), ty1 = Y(0.93);
  if (o.pants !== "asli") {
    const col = o.pants === "jeans" ? "#2f5d9e" : o.pantsColor;
    if (o.pants === "pendek") {
      g.fillStyle = col; g.fillRect(bx, ty0, bw, Y(0.76) - ty0);
      g.fillStyle = SKIN; g.fillRect(bx, Y(0.76), bw, ty1 - Y(0.76)); shade(Y(0.76), ty1);
      g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(bx, Y(0.76) - 2, bw, 3);
    } else { g.fillStyle = col; g.fillRect(bx, ty0, bw, ty1 - ty0); }
    shade(ty0, Y(0.76));
    if (o.pants === "jeans") { g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, ty0); g.lineTo(cx, ty1); g.stroke(); }
  }
  // ---- sepatu / sandal
  const sy0 = Y(0.925);
  if (o.shoes !== "asli") {
    if (o.shoes === "sandal") {
      g.fillStyle = SKIN; g.fillRect(bx, sy0, bw, bh * 0.08);
      g.fillStyle = "#6b4a2b"; g.fillRect(bx, Y(0.975), bw, bh * 0.03);
      g.fillStyle = "#c0392b"; g.fillRect(bx, Y(0.945), bw, bh * 0.015);
    } else {
      const c = o.shoes === "hitam" ? "#171717" : o.shoeColor;
      g.fillStyle = c; g.fillRect(bx, sy0, bw, bh * 0.08);
      g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(bx, Y(0.975), bw, bh * 0.03);
      shade(sy0, Y(1));
    }
  }
  // ---- baju
  const by0 = Y(0.34), by1 = Y(0.605);
  const S = o.shirt;
  if (S !== "asli") {
    const base: Record<string, string> = { kemeja_putih: "#f4f4f4", kemeja_biru: "#8ec5f5", jaket_hitam: "#1b1b1f", jaket_ojol: "#1faa3a", seragam_kop: "#d02a2a", pedagang: "#f2f2f2" };
    const col = base[S] ?? o.shirtColor;
    g.fillStyle = col; g.fillRect(bx, by0, bw, by1 - by0); shade(by0, by1);
    if (S === "kemeja_putih" || S === "kemeja_biru" || S === "seragam_kop") {
      g.fillStyle = S === "seragam_kop" ? "#fff" : "rgba(255,255,255,.95)";
      g.beginPath(); g.moveTo(cx - bw * .16, by0); g.lineTo(cx, by0 + bh * .07); g.lineTo(cx + bw * .16, by0); g.closePath(); g.fill();
      g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, by0 + bh * .07); g.lineTo(cx, by1); g.stroke();
      g.fillStyle = "rgba(0,0,0,.35)"; for (let i = 1; i < 4; i++) g.fillRect(cx - 1.5, by0 + (by1 - by0) * (i / 4), 3, 3);
      if (S === "seragam_kop") { g.fillStyle = "#fff"; g.fillRect(cx + bw * .1, by0 + bh * .1, bw * .12, bh * .035); g.fillStyle = "#c4161c"; g.fillRect(cx + bw * .11, by0 + bh * .105, bw * .05, bh * .025); }
    }
    if (S === "jaket_hitam" || S === "jaket_ojol") {
      g.strokeStyle = S === "jaket_ojol" ? "#fff" : "#888"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, by0); g.lineTo(cx, by1); g.stroke();
      g.fillStyle = S === "jaket_ojol" ? "#0e6e24" : "#2a2a2e"; g.fillRect(bx, by0, bw, bh * .035);
      if (S === "jaket_ojol") { g.fillStyle = "#fff"; g.fillRect(bx, by0 + (by1 - by0) * .55, bw, 4); }
    }
    if (S === "pedagang") {
      g.fillStyle = o.shirtColor; g.fillRect(cx - bw * .3, by0 + bh * .08, bw * .6, by1 - by0 - bh * .08);
      g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(cx - bw * .22, by0 + bh * .17, bw * .44, bh * .06);
    }
    if (S === "batik") {
      g.fillStyle = "rgba(255,210,120,.75)";
      for (let yy = by0 + 6; yy < by1; yy += 12) for (let xx = bx + ((yy / 12) % 2 ? 6 : 0); xx < bx + bw; xx += 12) { g.beginPath(); g.arc(xx, yy, 2.6, 0, 7); g.fill(); }
      g.strokeStyle = "rgba(255,210,120,.8)"; g.lineWidth = 2; g.strokeRect(bx + 3, by0 + 3, bw - 6, by1 - by0 - 6);
    }
    if (S === "kaus") { g.fillStyle = "rgba(255,255,255,.2)"; g.fillRect(bx, by0, bw, 3); }
  }
  g.globalCompositeOperation = "source-over";
  // ---- topi / rambut (digambar di atas kepala)
  if (o.hat !== "none") {
    const hx = cx, hy = Y(0.085), hw = bw * 0.62;
    g.fillStyle = o.hatColor;
    if (o.hat === "topi") {
      g.beginPath(); g.ellipse(hx, hy, hw / 2, bh * .085, 0, Math.PI, 0); g.fill();
      g.fillRect(hx - hw / 2, hy - 2, hw * 1.08, bh * .03); g.strokeStyle = "rgba(0,0,0,.5)"; g.lineWidth = 2; g.strokeRect(hx - hw / 2, hy - 2, hw * 1.08, bh * .03);
    } else if (o.hat === "peci") {
      g.fillStyle = "#101010"; g.beginPath(); g.moveTo(hx - hw / 2, hy + bh * .03); g.lineTo(hx - hw * .45, hy - bh * .1); g.lineTo(hx + hw * .45, hy - bh * .1); g.lineTo(hx + hw / 2, hy + bh * .03); g.closePath(); g.fill();
    } else if (o.hat === "helm_ojol") {
      g.fillStyle = "#1faa3a"; g.beginPath(); g.ellipse(hx, hy + bh * .02, hw * .56, bh * .11, 0, Math.PI, 0); g.fill();
      g.fillRect(hx - hw * .56, hy + bh * .015, hw * 1.12, bh * .035); g.fillStyle = "#fff"; g.fillRect(hx - hw * .5, hy - bh * .04, hw, 4);
    } else if (o.hat === "caping") {
      g.fillStyle = "#d8b25a"; g.beginPath(); g.moveTo(hx - hw * .95, hy + bh * .035); g.lineTo(hx, hy - bh * .13); g.lineTo(hx + hw * .95, hy + bh * .035); g.closePath(); g.fill();
      g.strokeStyle = "#8a6a1f"; g.lineWidth = 2; g.stroke();
    } else if (o.hat === "rambut_klimis") {
      g.beginPath(); g.ellipse(hx, hy + bh * .02, hw * .5, bh * .075, 0, Math.PI, 0); g.fill();
    }
  }
  outCache.set(key, cv);
  return cv;
}
