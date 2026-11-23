"use client";
import { useState } from "react";
import type { Engine } from "@/lib/engine";
import { PRODUCTS, PRODUCT_BY_ID, SUPPLIERS, TIERS, MISSIONS, rp, xpNeed } from "@/lib/data";
import { BUILDINGS, WORLD, AREAS, A } from "@/lib/world";

type P = { e: Engine; toast: (m: string) => void; close: () => void; go: (p: string) => void; tick: number };

export function Shell({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55" onPointerDown={(e) => e.stopPropagation()}>
      <div className="panel flex flex-col" style={{ width: "86%", height: "86%", padding: "1.2%" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "1%" }}>
          <div style={{ fontSize: "1.9em", fontWeight: 900, color: "#ffd27a" }}>{title}</div>
          <button className="btn" style={{ fontSize: "1.2em" }} onClick={close}>✕ Tutup</button>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ fontSize: "1.05em" }}>{children}</div>
      </div>
    </div>
  );
}
const Img = ({ src, s = 48 }: { src: string; s?: number }) => <img src={src} alt="" style={{ height: s, width: "auto", maxWidth: s * 2, objectFit: "contain" }} />;

export function Inventaris({ e, close }: P) {
  return (
    <Shell title="🎒 Inventaris" close={close}>
      <div className="grid grid-cols-4 gap-[1%]">
        {PRODUCTS.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-xl bg-white/10" style={{ padding: "0.5em" }}>
            <Img src={p.img} s={46} />
            <div><div style={{ fontWeight: 800 }}>{p.name}</div><div style={{ color: e.save.stock[p.id] > 0 ? "#8dff9d" : "#ff8d8d" }}>Stok: {e.save.stock[p.id]}</div></div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function Toko({ e, toast, close }: P & { tab0?: string }) {
  const [tab, setTab] = useState<"pesanan" | "pasok" | "harga">("pesanan");
  const [sup, setSup] = useState("pasar");
  const orders = e.orders;
  const su = SUPPLIERS.find((s) => s.id === sup)!;
  return (
    <Shell title="🏪 Toko — Warung Nusantara" close={close}>
      <div className="flex gap-2" style={{ marginBottom: "1%" }}>
        {(["pesanan", "pasok", "harga"] as const).map((t) => <button key={t} className={"btn " + (tab === t ? "btn-gold" : "")} onClick={() => setTab(t)}>{t === "pesanan" ? `Pesanan (${orders.length})` : t === "pasok" ? "Pemasok" : "Harga & Untung"}</button>)}
      </div>
      {tab === "pesanan" && (orders.length === 0 ? <div style={{ opacity: 0.8 }}>Belum ada pelanggan. Tunggu sebentar...</div> :
        <div className="grid grid-cols-2 gap-[1%]">
          {orders.map((c) => { const p = PRODUCT_BY_ID[c.item]; const ok = e.save.stock[c.item] >= c.qty; return (
            <div key={c.id} className="flex items-center gap-3 rounded-xl bg-white/10" style={{ padding: "0.6em" }}>
              <Img src={p.img} s={54} />
              <div className="flex-1"><div style={{ fontWeight: 800 }}>{c.qty}× {p.name}</div><div>{rp(p.sell * c.qty)} · sabar {Math.max(0, Math.ceil(c.ttl))}s</div><div style={{ color: ok ? "#8dff9d" : "#ff8d8d" }}>Stok {e.save.stock[c.item]}</div></div>
              <button className="btn btn-green" onClick={() => toast(e.serve(c.id))}>Layani</button>
              <button className="btn" onClick={() => e.decline(c.id)}>Tolak</button>
            </div>); })}
        </div>)}
      {tab === "pasok" && (<>
        <div className="flex gap-2 flex-wrap" style={{ marginBottom: "1%" }}>
          {SUPPLIERS.map((s) => <button key={s.id} className={"btn " + (sup === s.id ? "btn-gold" : "")} style={{ opacity: e.save.level >= s.minLevel ? 1 : 0.5 }} onClick={() => setSup(s.id)}>{s.name}{e.save.level < s.minLevel ? ` 🔒Lv${s.minLevel}` : ""}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-[1%]">
          {PRODUCTS.map((p) => { const price = Math.round(p.buy * su.mult); return (
            <div key={p.id} className="flex items-center gap-2 rounded-xl bg-white/10" style={{ padding: "0.5em" }}>
              <Img src={p.img} s={40} />
              <div className="flex-1"><div style={{ fontWeight: 800 }}>{p.name} <span style={{ opacity: 0.7 }}>(stok {e.save.stock[p.id]})</span></div><div>{rp(price)} / pcs</div></div>
              {[1, 5, 10].map((q) => <button key={q} className="btn btn-gold" style={{ padding: "2px 8px" }} onClick={() => toast(e.buy(p.id, Math.max(q, su.minQty), sup))}>+{Math.max(q, su.minQty)}</button>)}
            </div>); })}
        </div></>)}
      {tab === "harga" && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ textAlign: "left", color: "#ffd27a" }}><th>Barang</th><th>Beli</th><th>Jual</th><th>Untung</th><th>Stok</th></tr></thead>
          <tbody>{PRODUCTS.map((p) => <tr key={p.id} style={{ borderTop: "1px solid #fff2" }}><td>{p.name}</td><td>{rp(p.buy)}</td><td>{rp(p.sell)}</td><td style={{ color: "#8dff9d" }}>{rp(p.sell - p.buy)}</td><td>{e.save.stock[p.id]}</td></tr>)}</tbody>
        </table>)}
    </Shell>
  );
}

export function Koperasi({ e, toast, close, go }: P) {
  const kop = SUPPLIERS[2];
  return (
    <Shell title="🇮🇩 Koperasi Desa Merah Putih" close={close}>
      <p style={{ marginBottom: "1%" }}>Koperasi menyediakan barang dengan harga pemasok terbaik (diskon 15%, min. 25 pcs, terbuka di Lv.{kop.minLevel}). Saat ini kamu Lv.{e.save.level}.</p>
      <div className="grid grid-cols-2 gap-[1%]">
        {PRODUCTS.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-xl bg-white/10" style={{ padding: "0.5em" }}>
            <Img src={p.img} s={40} />
            <div className="flex-1"><div style={{ fontWeight: 800 }}>{p.name}</div><div>{rp(Math.round(p.buy * kop.mult))} / pcs</div></div>
            <button className="btn btn-gold" onClick={() => toast(e.buy(p.id, 25, "kop"))}>Beli 25</button>
          </div>))}
      </div>
      <div style={{ marginTop: "1.5%" }}><button className="btn btn-green" onClick={() => go("upgrade")}>Lihat Upgrade Usaha →</button></div>
    </Shell>
  );
}

export function Upgrade({ e, toast, close }: P) {
  const s = e.save; const nx = TIERS[s.tier + 1];
  return (
    <Shell title="⬆ Upgrade Usaha" close={close}>
      <div className="grid grid-cols-4 gap-[1%]">
        {TIERS.map((t) => (
          <div key={t.id} className="rounded-xl bg-white/10 text-center" style={{ padding: "0.6em", outline: t.id === s.tier ? "3px solid #ffd27a" : "none", opacity: t.id > s.tier + 1 ? 0.55 : 1 }}>
            <div style={{ height: "9em", display: "flex", alignItems: "flex-end", justifyContent: "center" }}><img src={A + t.sprite} alt="" style={{ maxHeight: "100%", maxWidth: "100%" }} /></div>
            <div style={{ fontWeight: 900, marginTop: 6 }}>{t.name}</div><div style={{ fontSize: ".85em", opacity: 0.85 }}>{t.desc}</div>
            <div style={{ color: "#ffd27a", fontWeight: 800 }}>{t.id === s.tier ? "✔ Sekarang" : t.id < s.tier ? "✔ Selesai" : rp(t.cost)}</div>
          </div>))}
      </div>
      <div style={{ marginTop: "2%" }}>
        {nx ? <button className="btn btn-gold" style={{ fontSize: "1.3em" }} disabled={!!e.construct} onClick={() => { toast(e.upgrade()); close(); }}>Bangun {nx.name} — {rp(nx.cost)}</button> : <b>🎉 Usahamu sudah menjadi Koperasi Desa Merah Putih!</b>}
        <div style={{ marginTop: 8, opacity: 0.85 }}>Uangmu: {rp(s.money)}. Bangunan di dunia akan benar-benar berubah tampilan setelah dibangun.</div>
      </div>
    </Shell>
  );
}

export function Statistik({ e, close }: P) {
  const s = e.save, st = s.stats; const rows: [string, string][] = [
    ["Level", `${s.level} (XP ${s.xp}/${xpNeed(s.level)})`], ["Uang", rp(s.money)], ["Tingkat usaha", TIERS[s.tier].name], ["Barang terjual", `${st.sold}`], ["Pelanggan dilayani", `${st.customers}`],
    ["Pelanggan kecewa", `${st.missed}`], ["Total keuntungan", rp(st.earned)], ["Total belanja stok", rp(st.spent)], ["Langkah", `${Math.round(st.steps)}`], ["Waktu bermain", `${Math.floor(st.playSec / 60)} menit`],
  ];
  return <Shell title="📊 Statistik" close={close}><div className="grid grid-cols-2 gap-[1%]">{rows.map(([a, b]) => <div key={a} className="rounded-xl bg-white/10 flex justify-between" style={{ padding: "0.6em 1em" }}><span>{a}</span><b>{b}</b></div>)}</div></Shell>;
}

export function Misi({ e, toast, close }: P) {
  const s = e.save;
  return (
    <Shell title="📋 Misi Harian" close={close}>
      <div className="grid gap-[1%]">
        {MISSIONS.map((m) => { const st = s.missions[m.id] ?? { p: 0, claimed: false }; const done = st.p >= m.target; return (
          <div key={m.id} className="flex items-center gap-3 rounded-xl bg-white/10" style={{ padding: "0.6em 1em" }}>
            <div style={{ fontSize: "1.5em" }}>{st.claimed ? "✅" : done ? "🎁" : "⏳"}</div>
            <div className="flex-1"><div style={{ fontWeight: 800 }}>{m.title}</div>
              <div style={{ background: "#0006", borderRadius: 8, height: 10, marginTop: 4 }}><div style={{ width: `${(st.p / m.target) * 100}%`, height: "100%", background: "#52d66b", borderRadius: 8 }} /></div>
              <div style={{ fontSize: ".85em", opacity: 0.85 }}>{st.p}/{m.target} · Hadiah {rp(m.reward)} + {m.xp} XP</div></div>
            <button className="btn btn-gold" disabled={!done || st.claimed} style={{ opacity: done && !st.claimed ? 1 : 0.4 }} onClick={() => { e.claim(m.id); toast("Hadiah diambil!"); }}>Ambil</button>
          </div>); })}
      </div>
    </Shell>
  );
}

export function Peta({ e, close }: P) {
  const sc = 1000 / WORLD;
  return (
    <Shell title="🗺 Peta Komplek" close={close}>
      <svg viewBox="0 0 1000 220" style={{ width: "100%", background: "#173" , borderRadius: 12 }}>
        {AREAS.map((a, i) => <g key={a.name}><rect x={a.x0 * sc} y={0} width={(a.x1 - a.x0) * sc} height={220} fill={["#3d7a45", "#6a6a4a", "#3a6a7a"][i]} opacity=".55" /><text x={(a.x0 + 80) * sc} y={20} fill="#fff" fontSize="13" fontWeight="700">{a.name}</text></g>)}
        <rect x={0} y={150} width={1000} height={36} fill="#444" /><rect x={0} y={140} width={1000} height={10} fill="#bbb" />
        {BUILDINGS.map((b) => { const r = e.b(b.id); return <g key={b.id}><rect x={r.x * sc} y={70} width={r.w * sc} height={60} fill={b.kind === "rumah" ? "#c97" : b.kind === "dagang" ? "#e44" : "#59c"} stroke="#fff" /><text x={(r.x + r.w / 2) * sc} y={64} fill="#fff" fontSize="9" textAnchor="middle">{b.id === "warung" ? TIERS[e.save.tier].name : b.name}</text></g>; })}
        {e.npcs.map((n, i) => <circle key={i} cx={n.x * sc} cy={138} r={2.5} fill="#ffe66d" />)}
        {e.place === "outdoor" && <><circle cx={e.p.x * sc} cy={138} r={7} fill="#ff3b30" stroke="#fff" strokeWidth={2} /><text x={e.p.x * sc} y={165} fill="#fff" fontSize="10" textAnchor="middle" fontWeight="800">KAMU</text></>}
      </svg>
      <div style={{ marginTop: 8, opacity: 0.9 }}>Titik kuning = warga. Lokasi: {e.areaName()}.</div>
    </Shell>
  );
}

export function Pengaturan({ e, close, toast }: P) {
  const [, force] = useState(0); const st = e.save.settings;
  const tog = (k: "vehicles" | "hints") => { st[k] = !st[k]; e.persist(); force((x) => x + 1); };
  return (
    <Shell title="⚙ Pengaturan" close={close}>
      <div className="grid gap-[1.2%]" style={{ maxWidth: "60%" }}>
        <button className="btn" onClick={() => tog("vehicles")}>Kendaraan: {st.vehicles ? "AKTIF" : "MATI"}</button>
        <button className="btn" onClick={() => { st.npc = st.npc >= 1 ? 0.5 : 1; e.initNpcs(); e.persist(); force((x) => x + 1); }}>Jumlah warga: {st.npc >= 1 ? "PENUH" : "RINGAN (HP lemah)"}</button>
        <button className="btn" onClick={() => tog("hints")}>Petunjuk tombol: {st.hints ? "TAMPIL" : "SEMBUNYI"}</button>
        <button className="btn btn-gold" onClick={() => { e.setClock(7); toast("Waktu diset 07:00 (pagi)"); }}>Lompat ke Pagi</button>
        <button className="btn btn-gold" onClick={() => { e.setClock(12); toast("Waktu diset 12:00 (siang)"); }}>Lompat ke Siang</button>
        <button className="btn btn-gold" onClick={() => { e.setClock(16); toast("Waktu diset 16:00 (sore)"); }}>Lompat ke Sore</button>
        <button className="btn btn-gold" onClick={() => { e.setClock(20); toast("Waktu diset 20:00 (malam)"); }}>Lompat ke Malam</button>
        <button className="btn" style={{ background: "#800" }} onClick={() => { if (confirm("Hapus semua data game?")) { localStorage.removeItem("warung-nusantara-save-v1"); location.reload(); } }}>Hapus Data & Mulai Ulang</button>
        <div style={{ opacity: 0.8, fontSize: ".9em" }}>Kontrol: ← → / A D jalan · Spasi lompat · E / Enter masuk & interaksi · M peta · Esc tutup.</div>
      </div>
    </Shell>
  );
}
