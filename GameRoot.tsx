"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Engine } from "@/lib/engine";
import { loadSave, writeSave, SaveData } from "@/lib/save";
import { A } from "@/lib/world";
import { rp, xpNeed, phaseOf } from "@/lib/data";
import { dressed, SHIRTS, PANTS, SHOES, HATS, PALETTE, Outfit, Opt } from "@/lib/outfit";
import { Inventaris, Toko, Koperasi, Upgrade, Statistik, Misi, Peta, Pengaturan, Shell } from "./Panels";

type Imgs = Record<string, HTMLImageElement>;
type Screen = "loading" | "menu" | "select" | "dress" | "play";

function flatten(o: unknown, out: string[] = []): string[] {
  if (typeof o === "string") out.push(o); else if (Array.isArray(o)) o.forEach((x) => flatten(x, out)); else if (o && typeof o === "object") Object.values(o as object).forEach((x) => flatten(x, out));
  return out;
}

export default function GameRoot() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [prog, setProg] = useState(0);
  const [imgs, setImgs] = useState<Imgs>({});
  const [save, setSave] = useState<SaveData | null>(null);
  const [fromPlay, setFromPlay] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      const man = await (await fetch(A + "manifest.json")).json();
      const list = Array.from(new Set(flatten(man))).filter((p) => p.endsWith(".png"));
      const out: Imgs = {}; let n = 0;
      await Promise.all(list.map((rel) => new Promise<void>((res) => {
        const im = new Image(); im.onload = im.onerror = () => { n++; if (!dead) setProg(n / list.length); res(); };
        im.src = A + rel; out[A + rel] = im;
      })));
      if (dead) return; setImgs(out); setSave(loadSave()); setScreen("menu");
    })();
    return () => { dead = true; };
  }, []);

  const fullscreen = useCallback(async () => {
    const el = stageRef.current; if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        try { await (window.screen.orientation as unknown as { lock: (o: string) => Promise<void> }).lock("landscape"); } catch {}
      }
      else await document.exitFullscreen();
    } catch {}
  }, []);

  return (
    <div ref={stageRef} className="stage" style={{ fontSize: "calc(min(100vw, 100dvh * 16 / 9) / 64)" }}>
      {screen === "loading" && <Loading prog={prog} />}
      {save && screen === "menu" && <Menu save={save} go={setScreen} fullscreen={fullscreen} />}
      {save && screen === "select" && <Select save={save} imgs={imgs} done={(c) => { save.char = c; writeSave(save); setSave({ ...save }); setFromPlay(false); setScreen("dress"); }} back={() => setScreen("menu")} />}
      {save && screen === "dress" && <Dress save={save} imgs={imgs} done={() => { writeSave(save); setScreen("play"); }} back={() => setScreen(fromPlay ? "play" : "menu")} />}
      {save && screen === "play" && <Play key="play" save={save} imgs={imgs} fullscreen={fullscreen} toMenu={() => setScreen("menu")} toDress={() => { setFromPlay(true); setScreen("dress"); }} />}
    </div>
  );
}

function Loading({ prog }: { prog: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "linear-gradient(#1b3b6f,#0b1020)" }}>
      <div style={{ fontSize: "3em", fontWeight: 900, color: "#ffd27a" }}>WARUNG NUSANTARA</div>
      <div style={{ fontSize: "1.2em", margin: "1em 0" }}>Memuat aset HD… {Math.round(prog * 100)}%</div>
      <div style={{ width: "40%", height: "1em", background: "#fff3", borderRadius: 99 }}><div style={{ width: `${prog * 100}%`, height: "100%", background: "linear-gradient(#ff5a4d,#c4221a)", borderRadius: 99 }} /></div>
    </div>
  );
}

function Menu({ save, go, fullscreen }: { save: SaveData; go: (s: Screen) => void; fullscreen: () => void }) {
  return (
    <div className="absolute inset-0 flex" style={{ background: "linear-gradient(180deg,#5db6f2 0%,#d6efff 55%,#6fa857 55%,#3d6e3a 100%)" }}>
      <img src={A + "buildings/warung_A.png"} alt="" style={{ position: "absolute", left: "4%", bottom: "13%", height: "46%" }} />
      <img src={A + "buildings/koperasi_A.png"} alt="" style={{ position: "absolute", right: "3%", bottom: "13%", height: "52%" }} />
      <div className="relative m-auto text-center" style={{ zIndex: 2 }}>
        <div style={{ fontSize: "3.6em", fontWeight: 900, color: "#fff", textShadow: "0 .08em 0 #c4221a,0 0 .4em #0008", lineHeight: 1 }}>WARUNG<br />NUSANTARA</div>
        <div style={{ fontSize: "1.1em", color: "#fff", textShadow: "0 1px 4px #000", margin: ".5em 0 1em" }}>Open World Life Simulator 2D</div>
        <div className="flex flex-col gap-[.6em]" style={{ width: "16em", margin: "0 auto", fontSize: "1.25em" }}>
          <button className="btn btn-gold" onClick={() => go(save.char ? "play" : "select")}>{save.char ? "▶ LANJUT MAIN" : "▶ MULAI"}</button>
          <button className="btn" onClick={() => go("select")}>👤 Pilih Karakter</button>
          <button className="btn" disabled={!save.char} style={{ opacity: save.char ? 1 : 0.5 }} onClick={() => go("dress")}>👕 Ganti Penampilan</button>
          <button className="btn btn-green" onClick={fullscreen}>⛶ Layar Penuh</button>
        </div>
      </div>
    </div>
  );
}

function Select({ save, imgs, done, back }: { save: SaveData; imgs: Imgs; done: (c: "A" | "B") => void; back: () => void }) {
  const cards: { c: "A" | "B"; name: string; desc: string }[] = [
    { c: "A", name: "Karakter A", desc: "Pria berjas hitam & dasi biru. Badan normal." },
    { c: "B", name: "Karakter B", desc: "Pria berkemeja biru muda. Tubuh lebih berisi." },
  ];
  return (
    <div className="absolute inset-0 flex flex-col items-center" style={{ background: "linear-gradient(#1b3b6f,#0b1020)", padding: "2%" }}>
      <div style={{ fontSize: "2.4em", fontWeight: 900, color: "#ffd27a" }}>PILIH KARAKTER</div>
      <div className="flex gap-[4%] flex-1 items-center justify-center w-full">
        {cards.map((k) => (
          <div key={k.c} className="panel text-center" style={{ width: "30%", padding: "1.2%", outline: save.char === k.c ? "4px solid #52d66b" : "none" }}>
            <img src={`${A}characters/portrait_char${k.c}.png`} alt={k.name} style={{ height: "17em", margin: "0 auto", objectFit: "contain" }} />
            <div style={{ fontSize: "1.6em", fontWeight: 900 }}>{k.name}</div>
            <div style={{ opacity: 0.85, margin: ".3em 0 .6em" }}>{k.desc}</div>
            <button className="btn btn-gold" style={{ fontSize: "1.3em" }} onClick={() => done(k.c)}>PILIH</button>
          </div>))}
      </div>
      <button className="btn" onClick={back}>← Kembali</button>
      <div style={{ opacity: 0.6, fontSize: ".8em", marginTop: ".4em" }}>{imgs ? "" : ""}</div>
    </div>
  );
}

function Dress({ save, imgs, done, back }: { save: SaveData; imgs: Imgs; done: () => void; back: () => void }) {
  const [, force] = useState(0); const [cat, setCat] = useState<"shirt" | "pants" | "shoes" | "hat">("shirt");
  const cv = useRef<HTMLCanvasElement>(null); const o = save.outfit; const ch = save.char ?? "A";
  useEffect(() => {
    let raf = 0; const t0 = performance.now(); const frames = ch === "A" ? 7 : 3;
    const f = (n: number) => {
      const c = cv.current; if (!c) return; const g = c.getContext("2d")!; g.clearRect(0, 0, c.width, c.height);
      const t = (n - t0) / 1000; const idx = Math.floor(t * 8) % frames; const im = imgs[`${A}characters/animations/char${ch}_walk_${idx}.png`];
      if (im) { const d = dressed(im, o); const H = c.height * 0.9, sc = H / im.height; g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(c.width / 2, c.height - 14, 110, 16, 0, 0, 7); g.fill(); g.drawImage(d, c.width / 2 - (d.width * sc) / 2, c.height - 18 - d.height * sc, d.width * sc, d.height * sc); }
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf);
  }, [imgs, ch, o]);
  const lists: Record<typeof cat, { opts: Opt[]; key: keyof Outfit; col: keyof Outfit | null; label: string }> = {
    shirt: { opts: SHIRTS, key: "shirt", col: "shirtColor", label: "Baju / Jaket" }, pants: { opts: PANTS, key: "pants", col: "pantsColor", label: "Celana" },
    shoes: { opts: SHOES, key: "shoes", col: "shoeColor", label: "Sepatu / Sandal" }, hat: { opts: HATS, key: "hat", col: "hatColor", label: "Topi / Rambut" },
  };
  const L = lists[cat]; const cur = L.opts.find((x) => x.id === o[L.key]);
  const set = (k: keyof Outfit, v: string) => { o[k] = v; writeSave(save); force((x) => x + 1); };
  const presets: { n: string; v: Partial<Outfit> }[] = [
    { n: "Santai", v: { shirt: "kaus", shirtColor: "#2b6cb0", pants: "pendek", pantsColor: "#2f3a56", shoes: "sandal", hat: "none" } },
    { n: "Pedagang", v: { shirt: "pedagang", shirtColor: "#e67e22", pants: "panjang", pantsColor: "#333", shoes: "sandal", hat: "topi", hatColor: "#d33" } },
    { n: "Ojol", v: { shirt: "jaket_ojol", pants: "jeans", shoes: "sneakers", shoeColor: "#222", hat: "helm_ojol" } },
    { n: "Koperasi", v: { shirt: "seragam_kop", pants: "panjang", pantsColor: "#222", shoes: "hitam", hat: "none" } },
    { n: "Batik", v: { shirt: "batik", shirtColor: "#8b5a2b", pants: "panjang", pantsColor: "#222", shoes: "hitam", hat: "peci" } },
    { n: "Asli", v: { shirt: "asli", pants: "asli", shoes: "asli", hat: "none" } },
  ];
  return (
    <div className="absolute inset-0 flex" style={{ background: "linear-gradient(#1b3b6f,#0b1020)", padding: "1.5%", gap: "1.5%" }}>
      <div className="panel flex flex-col items-center" style={{ width: "34%", padding: "1%" }}>
        <div style={{ fontSize: "1.6em", fontWeight: 900, color: "#ffd27a" }}>GANTI PENAMPILAN</div>
        <canvas ref={cv} width={420} height={560} style={{ width: "100%", flex: 1, minHeight: 0, objectFit: "contain" }} />
        <div style={{ opacity: 0.8 }}>Karakter {ch} — pratinjau langsung</div>
      </div>
      <div className="panel flex flex-col flex-1" style={{ padding: "1.2%" }}>
        <div className="flex gap-2 flex-wrap" style={{ marginBottom: ".5em" }}>
          {(Object.keys(lists) as (typeof cat)[]).map((k) => <button key={k} className={"btn " + (cat === k ? "btn-gold" : "")} onClick={() => setCat(k)}>{lists[k].label}</button>)}
        </div>
        <div className="grid grid-cols-3 gap-[.5em]" style={{ overflowY: "auto" }}>
          {L.opts.map((x) => <button key={x.id} className={"btn " + (o[L.key] === x.id ? "btn-green" : "")} style={{ fontSize: ".95em" }} onClick={() => set(L.key, x.id)}>{x.name}</button>)}
        </div>
        {L.col && cur?.color && (
          <div style={{ marginTop: ".6em" }}><div style={{ marginBottom: 4 }}>Warna:</div>
            <div className="flex gap-2 flex-wrap">{PALETTE.map((c) => <button key={c} onClick={() => set(L.col as keyof Outfit, c)} style={{ width: "2em", height: "2em", borderRadius: 99, background: c, border: o[L.col as keyof Outfit] === c ? "3px solid #fff" : "2px solid #0008" }} />)}</div></div>)}
        <div style={{ marginTop: ".8em" }}><div style={{ marginBottom: 4 }}>Gaya cepat:</div><div className="flex gap-2 flex-wrap">{presets.map((p) => <button key={p.n} className="btn" onClick={() => { Object.assign(o, p.v); writeSave(save); force((x) => x + 1); }}>{p.n}</button>)}</div></div>
        <div className="flex gap-2" style={{ marginTop: "auto" }}><button className="btn" onClick={back}>← Kembali</button><button className="btn btn-gold flex-1" style={{ fontSize: "1.2em" }} onClick={done}>SIMPAN & MAIN ▶</button></div>
      </div>
    </div>
  );
}

function Play({ save, imgs, fullscreen, toMenu, toDress }: { save: SaveData; imgs: Imgs; fullscreen: () => void; toMenu: () => void; toDress: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null); const eng = useRef<Engine | null>(null);
  const [tick, setTick] = useState(0); const [panel, setPanel] = useState<string | null>(null); const [toastMsg, setToast] = useState(""); const [portrait, setPortrait] = useState(false);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((m: string) => { setToast(m); if (toastT.current) clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(""), 2600); }, []);

  useEffect(() => {
    const e = new Engine(cv.current!, imgs, save, { ui: () => setTick((x) => x + 1), toast, open: (p) => setPanel(p) });
    eng.current = e; e.start();
    const kd = (ev: KeyboardEvent, v: boolean) => {
      const k = ev.key.toLowerCase();
      if (k === "arrowleft" || k === "a") e.input.left = v; else if (k === "arrowright" || k === "d") e.input.right = v; else if (k === " " || k === "arrowup" || k === "w") { e.input.jump = v; ev.preventDefault(); }
      else if (v && (k === "e" || k === "enter")) e.interact(); else if (v && k === "m") setPanel((p) => (p ? null : "peta")); else if (v && k === "escape") setPanel(null);
    };
    const d = (ev: KeyboardEvent) => kd(ev, true), u = (ev: KeyboardEvent) => kd(ev, false);
    window.addEventListener("keydown", d); window.addEventListener("keyup", u);
    const chk = () => setPortrait(window.innerHeight > window.innerWidth); chk(); window.addEventListener("resize", chk);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); window.removeEventListener("resize", chk); e.stop(); };
  }, [imgs, save, toast]);

  const e = eng.current; const s = save; void tick;
  const hold = (k: "left" | "right" | "jump") => ({
    onPointerDown: (ev: React.PointerEvent) => { ev.preventDefault(); (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId); if (eng.current) eng.current.input[k] = true; },
    onPointerUp: () => { if (eng.current) eng.current.input[k] = false; }, onPointerCancel: () => { if (eng.current) eng.current.input[k] = false; }, onPointerLeave: () => { if (eng.current) eng.current.input[k] = false; },
  });
  const pr = e?.prompt ?? null; const orders = e?.orders.length ?? 0; const ph = phaseOf(s.clock);
  const P = { e: e!, toast, close: () => setPanel(null), go: (p: string) => setPanel(p), tick };
  const menuItems: [string, string, string][] = [
    ["🏠", "Menu Utama", "menu"], ["🎒", "Inventaris", "inventaris"], ["🏪", "Toko", "toko"], ["🇮🇩", "Koperasi", "koperasi"], ["⬆", "Upgrade", "upgrade"],
    ["📊", "Statistik", "statistik"], ["📋", "Misi", "misi"], ["🗺", "Peta", "peta"], ["👕", "Ganti Pakaian", "dress"], ["⚙", "Pengaturan", "pengaturan"],
  ];
  return (
    <>
      <canvas ref={cv} />
      {/* HUD */}
      <div className="absolute left-0 top-0 flex items-start" style={{ padding: ".6%", gap: ".6em", pointerEvents: "none" }}>
        <div className="panel flex items-center" style={{ padding: ".3em .7em", gap: ".6em" }}>
          <img src={`${A}characters/portrait_char${s.char ?? "A"}.png`} alt="" style={{ height: "3.2em" }} />
          <div><div style={{ fontWeight: 900 }}>Lv.{s.level} <span style={{ fontWeight: 600, opacity: 0.8 }}>XP {s.xp}/{xpNeed(s.level)}</span></div>
            <div style={{ background: "#0008", height: ".5em", width: "9em", borderRadius: 9 }}><div style={{ width: `${(s.xp / xpNeed(s.level)) * 100}%`, height: "100%", background: "#52d66b", borderRadius: 9 }} /></div>
            <div style={{ color: "#ffd34d", fontWeight: 900, fontSize: "1.1em" }}>🪙 {rp(s.money)}</div></div>
        </div>
        <div className="panel" style={{ padding: ".3em .8em", textAlign: "center" }}><div style={{ fontWeight: 900, fontSize: "1.2em" }}>{ph === "pagi" ? "🌅" : ph === "siang" ? "☀️" : ph === "sore" ? "🌇" : "🌙"} {e?.clockText()}</div><div style={{ fontSize: ".8em", textTransform: "capitalize" }}>{ph}</div></div>
        <div className="panel" style={{ padding: ".3em .8em" }}><div style={{ fontSize: ".75em", opacity: 0.8 }}>Lokasi</div><div style={{ fontWeight: 800 }}>{e?.areaName()}</div></div>
      </div>
      <div className="absolute right-0 top-0 flex" style={{ padding: ".6%", gap: ".4em" }}>
        {orders > 0 && <button className="btn btn-gold" style={{ fontSize: "1.05em" }} onClick={() => setPanel("toko")}>🛒 {orders}</button>}
        <button className="btn" style={{ fontSize: "1.05em" }} onClick={fullscreen}>⛶</button>
        <button className="btn btn-gold" style={{ fontSize: "1.05em" }} onClick={() => setPanel(panel === "menu" ? null : "menu")}>☰ Menu</button>
      </div>
      {/* tombol interaksi */}
      {pr && !panel && <button className="btn btn-gold absolute" style={{ left: "50%", bottom: "20%", transform: "translateX(-50%)", fontSize: "1.5em", padding: ".35em 1.1em", animation: "none" }} onPointerDown={(ev) => { ev.stopPropagation(); e!.interact(); }}>{pr.act === "exit" ? "⬅ " : ""}{pr.label}{pr.act === "enter" ? " ▶" : ""}<div style={{ fontSize: ".5em", opacity: 0.7 }}>{s.settings.hints ? "tekan E / Enter" : ""}</div></button>}
      {toastMsg && <div className="panel absolute" style={{ left: "50%", top: "14%", transform: "translateX(-50%)", padding: ".5em 1.2em", fontWeight: 800, fontSize: "1.2em", zIndex: 40 }}>{toastMsg}</div>}
      {/* kontrol sentuh */}
      {!panel && <>
        <div className="absolute flex" style={{ left: "2%", bottom: "4%", gap: ".8em" }}>
          <button className="btn" style={{ width: "4.6em", height: "4.6em", fontSize: "1.5em", opacity: 0.85, touchAction: "none" }} {...hold("left")}>◀</button>
          <button className="btn" style={{ width: "4.6em", height: "4.6em", fontSize: "1.5em", opacity: 0.85, touchAction: "none" }} {...hold("right")}>▶</button>
        </div>
        <div className="absolute flex" style={{ right: "2%", bottom: "4%", gap: ".8em" }}>
          <button className="btn btn-gold" style={{ width: "4.6em", height: "4.6em", fontSize: "1.2em", opacity: 0.9, touchAction: "none" }} {...hold("jump")}>⤒<br />LONCAT</button>
        </div></>}
      {portrait && <div className="absolute top-0 left-0 w-full" style={{ background: "#000c", padding: ".4em", textAlign: "center", fontSize: "1em", zIndex: 50 }}>📱 Putar HP ke mode LANDSCAPE & tekan ⛶ untuk layar penuh</div>}
      {/* panel */}
      {panel === "menu" && <Shell title="☰ Menu" close={() => setPanel(null)}><div className="grid grid-cols-5 gap-[1.5%]">{menuItems.map(([ic, n, k]) => <button key={k} className="btn" style={{ padding: "1em .3em", fontSize: "1.1em" }} onClick={() => { if (k === "menu") { e!.persist(); toMenu(); } else if (k === "dress") { e!.persist(); toDress(); } else setPanel(k); }}><div style={{ fontSize: "2em" }}>{ic}</div>{n}</button>)}</div></Shell>}
      {e && panel === "inventaris" && <Inventaris {...P} />}
      {e && panel === "toko" && <Toko {...P} />}
      {e && panel === "koperasi" && <Koperasi {...P} />}
      {e && panel === "upgrade" && <Upgrade {...P} />}
      {e && panel === "statistik" && <Statistik {...P} />}
      {e && panel === "misi" && <Misi {...P} />}
      {e && panel === "peta" && <Peta {...P} />}
      {e && panel === "pengaturan" && <Pengaturan {...P} />}
    </>
  );
}
