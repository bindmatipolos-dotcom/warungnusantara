import { PRODUCTS, PRODUCT_BY_ID, DRINKS, SUPPLIERS, TIERS, MISSIONS, phaseOf, xpNeed, rp, Phase } from "./data";
import { SaveData, writeSave } from "./save";
import { dressed } from "./outfit";
import {
  A, VW, VH, GY, WORLD, BUILDINGS, BDef, PLAYGROUND, PARKING, HALTE_X, BENCH_X, LAMP_X, BIN_X,
  INTERIORS, ROOM_NPCS, ROOM_SPOT, NPC_DEFS, NpcDef, Act, AREAS,
} from "./world";

type Imgs = Record<string, HTMLImageElement>;
export interface Hooks { ui: () => void; toast: (m: string) => void; open: (p: string) => void; }
export interface Prompt { label: string; act: string; arg?: string; }

interface RB { def: BDef; x: number; w: number; h: number; doorX: number; sprite: string; }
interface Npc {
  def: NpcDef; x: number; dir: 1 | -1; act: Act; tx: number; timer: number; arrived: boolean; vis: boolean; inside: boolean;
  ph: number; amp: number; lane: number; carry: boolean; partner?: Npc; zzT: number; cd: number;
}
interface Veh {
  kind: string; sprite: string; empty?: string; overlay?: string; x: number; y: number; dir: 1 | -1; vmax: number; v: number; h: number;
  state: "drive" | "brake" | "parked" | "start"; timer: number; parkX: number; parker: boolean; shake: number; ph: number; rider?: Walker;
}
interface Walker { sprite: string; x: number; y: number; dir: 1 | -1; tx: number; stage: "go" | "inside" | "back" | "done"; timer: number; veh: Veh; ph: number; }
interface Cust { id: number; sprite: string; x: number; tx: number; state: "come" | "wait" | "leave"; ph: number; item: string; qty: number; ttl: number; slot: number; }
interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; c: string; g: number; }
interface Spot { x: number; kind: string; label: string; }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const CUST_SPRITES = ["student_boy", "kid_backpack", "hijab_grey", "hijab_peach", "man_blazer", "man_white", "girl_pink", "hijab_red", "kid2", "sheetA_00", "sheetA_01", "sheetA_02"];
const IH = 560, IY = 84, IFLOOR = IY + IH * 0.9;

export class Engine {
  ctx: CanvasRenderingContext2D;
  input = { left: false, right: false, jump: false };
  place = "outdoor";
  p = { x: 2900, h: 0, vy: 0, dir: 1 as 1 | -1, wt: 0, moving: false };
  cam = 0; t = 0;
  rb: RB[] = []; npcs: Npc[] = []; vehs: Veh[] = []; walkers: Walker[] = []; custs: Cust[] = []; parts: Part[] = [];
  doors: { x: number; t: number }[] = [];
  solids: { x: number; w: number; h: number }[] = [];
  trees: { x: number; h: number; k: number }[] = [];
  spots: Spot[] = []; intRooms: { name: string; x: number; w: number }[] = []; intW = 1280; intOff = 0;
  fade = { a: 0, dir: 0, cb: null as null | (() => void) };
  construct: null | { t: number; to: number; swapped: boolean; x: number } = null;
  orderT = 6; saveT = 0; uiT = 0; vehT = 2; cid = 1; running = false; raf = 0; last = 0; fps = 0;
  prompt: Prompt | null = null;

  constructor(public canvas: HTMLCanvasElement, public imgs: Imgs, public save: SaveData, public hooks: Hooks) {
    this.ctx = canvas.getContext("2d")!;
    canvas.width = VW; canvas.height = VH;
    this.layout();
    this.initNpcs();
    this.place = save.place === "outdoor" || INTERIORS[save.place] ? save.place : "outdoor";
    this.p.x = clamp(save.lastX, 80, WORLD - 80);
    if (this.place !== "outdoor") this.setupInterior(this.interiorId());
    this.dailyMissions();
  }

  // ---------- util ----------
  img(p: string) { return this.imgs[A + p]; }
  get hour() { return this.save.clock; }
  get phase(): Phase { return phaseOf(this.save.clock); }
  b(id: string) { return this.rb.find((r) => r.def.id === id)!; }

  layout() {
    this.rb = BUILDINGS.map((def) => {
      const sprite = def.id === "warung" ? TIERS[this.save?.tier ?? 0].sprite : def.sprite;
      const im = this.imgs[A + sprite];
      const h = def.id === "warung" ? TIERS[this.save?.tier ?? 0].h : def.h;
      const w = im ? (im.width / im.height) * h : 400;
      return { def, x: def.x, w, h, doorX: def.x + w * def.door, sprite };
    });
    this.solids = [];
    BIN_X.forEach((x) => this.solids.push({ x, w: 44, h: 62 }));
    BENCH_X.forEach((x) => this.solids.push({ x, w: 120, h: 44 }));
    this.trees = [];
    for (let x = 40, i = 0; x < WORLD; x += rnd(200, 300), i++) this.trees.push({ x, h: rnd(150, 210), k: i % 3 });
  }
  refreshBuildings() { const tier = this.save.tier; this.rb.forEach((r) => { if (r.def.id === "warung") { const im = this.imgs[A + TIERS[tier].sprite]; r.sprite = TIERS[tier].sprite; r.h = TIERS[tier].h; r.w = im ? (im.width / im.height) * r.h : 400; r.doorX = r.x + r.w * r.def.door; } }); }

  initNpcs() {
    const count = Math.round(NPC_DEFS.length * (this.save.settings.npc >= 1 ? 1 : 0.55));
    this.npcs = NPC_DEFS.slice(0, count).map((def, i) => {
      const home = this.homeX(def);
      const n: Npc = { def, x: home + rnd(-400, 400), dir: 1, act: "walk", tx: home, timer: 0, arrived: false, vis: true, inside: false, ph: rnd(0, 6), amp: rnd(0.7, 1.3), lane: (i % 5 - 2) * 5, carry: false, zzT: 0, cd: 0 };
      return n;
    });
    this.npcs.forEach((n) => this.setAct(n, pick(n.def.sched[this.phase])));
  }
  homeX(def: NpcDef) { return this.b(def.home)?.doorX ?? 3000; }

  // ---------- NPC AI ----------
  setAct(n: Npc, a: Act) {
    n.act = a; n.arrived = false; n.carry = false; n.partner = undefined; n.cd = 0;
    const home = this.homeX(n.def);
    switch (a) {
      case "walk": n.tx = clamp(home + rnd(-700, 700), 80, WORLD - 80); n.timer = rnd(2, 6); break;
      case "sit": { const bs = BENCH_X.filter((x) => Math.abs(x - home) < 1500); n.tx = pick(bs.length ? bs : BENCH_X) + rnd(-25, 25); n.timer = rnd(12, 24); break; }
      case "chat": {
        const pt = n.def.chat ? this.npcs.find((m) => m.def.id === n.def.chat) : undefined;
        if (pt && pt.act !== "chat" && pt.vis && !pt.inside) {
          const mid = clamp((n.x + pt.x) / 2, 120, WORLD - 120);
          n.tx = mid - 34; pt.tx = mid + 34; pt.act = "chat"; pt.arrived = false; pt.partner = n; n.partner = pt; pt.timer = n.timer = rnd(14, 22);
        } else { this.setAct(n, "walk"); }
        break;
      }
      case "sweep": n.tx = home + rnd(-160, 160); n.timer = rnd(12, 20); break;
      case "water": n.tx = home + rnd(90, 180); n.timer = rnd(10, 16); break;
      case "cook": n.tx = this.b("angk").doorX + rnd(-110, -60); n.timer = rnd(20, 40); break;
      case "sell": n.tx = this.b("warung").doorX + 140; n.timer = rnd(16, 30); break;
      case "shop": n.tx = (Math.random() < 0.55 ? this.b("kop") : this.b("mini")).doorX; n.timer = rnd(5, 9); break;
      case "eat": n.tx = this.b("angk").doorX + rnd(-150, 150); n.timer = rnd(14, 26); break;
      case "play": n.tx = PLAYGROUND.x + rnd(60, 300); n.timer = rnd(12, 22); break;
      case "carry": n.carry = true; n.tx = Math.random() < 0.5 ? this.b("warung").doorX + 60 : this.b("kop").doorX - 60; n.timer = rnd(1, 3); break;
      case "work": n.tx = home + rnd(120, 280); n.timer = rnd(12, 22); break;
      case "sleep": case "tv": n.tx = home; n.timer = a === "sleep" ? rnd(45, 70) : rnd(18, 32); break;
    }
  }
  updateNpc(n: Npc, dt: number) {
    n.ph += dt * (4 + n.def.speed / 18) * n.amp;
    if (n.cd > 0) n.cd -= dt;
    if (n.inside) {
      n.timer -= dt; if (this.phase === "malam") n.zzT += dt;
      if (n.timer <= 0) { n.inside = false; n.vis = true; this.doors.push({ x: n.tx, t: 0 }); this.setAct(n, pick(n.def.sched[this.phase])); }
      return;
    }
    const dx = n.tx - n.x;
    if (!n.arrived && Math.abs(dx) > 5) { n.dir = dx > 0 ? 1 : -1; n.x += n.dir * n.def.speed * dt; return; }
    if (!n.arrived) {
      n.arrived = true; n.x = n.tx;
      if (n.act === "shop" || n.act === "sleep" || n.act === "tv") { n.inside = true; n.vis = false; this.doors.push({ x: n.tx, t: 0 }); }
      if (n.act === "chat" && n.partner) n.dir = n.partner.x > n.x ? 1 : -1;
      return;
    }
    n.timer -= dt;
    if (n.act === "sweep" && Math.random() < dt * 4) this.puff(n.x + n.dir * 40, GY + n.lane, "dust");
    if (n.act === "water" && Math.random() < dt * 14) this.parts.push({ x: n.x + n.dir * 50, y: GY - 60, vx: n.dir * rnd(30, 70), vy: rnd(-20, 10), life: 0.7, max: 0.7, r: 2.4, c: "#7ec8ff", g: 380 });
    if (n.act === "cook" && Math.random() < dt * 5) this.parts.push({ x: n.x + n.dir * 55, y: GY - 120, vx: rnd(-6, 6), vy: -30, life: 1.3, max: 1.3, r: 5, c: "rgba(255,255,255,.55)", g: -5 });
    if (n.timer <= 0) this.setAct(n, pick(n.def.sched[this.phase]));
  }
  puff(x: number, y: number, k: "dust" | "smoke") {
    for (let i = 0; i < 3; i++) this.parts.push({ x, y, vx: rnd(-25, 25), vy: rnd(-25, -5), life: 0.7, max: 0.7, r: rnd(3, 6), c: k === "dust" ? "rgba(190,170,130,.6)" : "rgba(220,220,220,.5)", g: 0 });
  }

  // ---------- vehicles ----------
  spawnVehicle() {
    if (!this.save.settings.vehicles || this.vehs.length >= 9) return;
    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const kinds = [
      { kind: "ojol", sprite: "characters/npc_ojol_green.png", empty: "vehicles/bottom_01.png", h: 124, v: [170, 230], parker: true },
      { kind: "matic", sprite: "characters/npc_rider_red.png", empty: "vehicles/bottom_00.png", h: 118, v: [130, 190], parker: true },
      { kind: "bebek", sprite: "vehicles/bottom_01.png", overlay: "characters/npc_sit_blue.png", empty: "vehicles/bottom_01.png", h: 98, v: [110, 160], parker: true },
      { kind: "mobil", sprite: pick(["vehicles/bottom_06.png", "vehicles/bottom_10.png", "vehicles/bottom_11.png", "vehicles/sheetA_02.png"]), h: 112, v: [100, 150], parker: false },
      { kind: "truk", sprite: "vehicles/bottom_07.png", h: 140, v: [80, 110], parker: false },
      { kind: "sepeda", sprite: "vehicles/sheetA_04.png", overlay: "characters/npc_kid2.png", h: 92, v: [55, 80], parker: false },
    ];
    const k = pick(kinds);
    const vmax = rnd(k.v[0], k.v[1]);
    this.vehs.push({
      kind: k.kind, sprite: k.sprite, empty: k.empty, overlay: k.overlay, x: dir > 0 ? -250 : WORLD + 250, y: dir > 0 ? 706 : 672, dir, vmax, v: vmax, h: k.h,
      state: "drive", timer: 0, parkX: rnd(PARKING.x0 + 30, PARKING.x1 - 30), parker: !!k.parker && Math.random() < 0.38, shake: 0, ph: rnd(0, 6),
    });
  }
  updateVeh(v: Veh, dt: number) {
    v.ph += dt * 12;
    if (v.state === "drive") {
      v.v = Math.min(v.vmax, v.v + 140 * dt); v.x += v.dir * v.v * dt;
      if (v.parker && Math.abs(v.x - v.parkX) < 340 && (v.x - v.parkX) * v.dir < 0) v.state = "brake";
      if (Math.random() < dt * 3 && v.kind !== "sepeda") this.parts.push({ x: v.x - v.dir * v.h * 0.6, y: v.y - 14, vx: -v.dir * 20, vy: -8, life: 0.6, max: 0.6, r: 3, c: "rgba(200,200,200,.4)", g: 0 });
    } else if (v.state === "brake") {
      const dist = (v.parkX - v.x) * v.dir;
      v.v = Math.max(28, Math.min(v.v, dist * 1.1)); v.x += v.dir * v.v * dt; v.y = lerp(v.y, 654, dt * 1.6);
      if (dist <= 4) {
        v.state = "parked"; v.v = 0; v.timer = rnd(7, 14);
        const w: Walker = { sprite: pick(["man_white", "student_boy", "man_blazer", "hijab_grey"]), x: v.x, y: GY + 20, dir: Math.random() < 0.5 ? 1 : -1, tx: this.b("kop").doorX + rnd(-40, 40), stage: "go", timer: 0, veh: v, ph: rnd(0, 6) };
        v.rider = w; this.walkers.push(w);
      }
    } else if (v.state === "parked") {
      v.timer -= dt; if (v.rider && v.rider.stage === "done") { v.state = "start"; v.timer = 1.3; v.rider = undefined; }
    } else if (v.state === "start") {
      v.timer -= dt; v.shake = Math.sin(this.t * 60) * 1.8;
      if (Math.random() < dt * 20) this.puff(v.x - v.dir * v.h * 0.55, v.y - 12, "smoke");
      if (v.timer <= 0) { v.state = "drive"; v.v = 0; v.parker = false; v.shake = 0; }
    }
    if (v.state === "drive") v.y = lerp(v.y, v.dir > 0 ? 706 : 672, dt * 1.5);
  }
  updateWalker(w: Walker, dt: number) {
    w.ph += dt * 9;
    if (w.stage === "go") { const d = w.tx - w.x; w.dir = d > 0 ? 1 : -1; w.x += w.dir * 75 * dt; if (Math.abs(d) < 6) { w.stage = "inside"; w.timer = rnd(5, 9); this.doors.push({ x: w.x, t: 0 }); } }
    else if (w.stage === "inside") { w.timer -= dt; if (w.timer <= 0) { w.stage = "back"; this.doors.push({ x: w.x, t: 0 }); } }
    else if (w.stage === "back") { const d = w.veh.x - w.x; w.dir = d > 0 ? 1 : -1; w.x += w.dir * 75 * dt; if (Math.abs(d) < 8) w.stage = "done"; }
  }

  // ---------- pelanggan / pesanan ----------
  spawnOrder() {
    if (this.custs.filter((c) => c.state !== "leave").length >= 4) return;
    const stocked = PRODUCTS.filter((p) => this.save.stock[p.id] > 0);
    const pool = stocked.length && Math.random() < 0.85 ? stocked : PRODUCTS;
    const h = this.hour;
    const wantDrink = h >= 11 && h < 17 && Math.random() < 0.4;
    const list = wantDrink ? pool.filter((p) => DRINKS.includes(p.id)) : pool;
    const item = pick(list.length ? list : pool);
    const wb = this.b("warung");
    const side = Math.random() < 0.5 ? -1 : 1;
    const slot = this.custs.length;
    this.custs.push({ id: this.cid++, sprite: pick(CUST_SPRITES), x: wb.doorX + side * rnd(700, 1000), tx: wb.doorX + 70 + slot * 48, state: "come", ph: rnd(0, 6), item: item.id, qty: 1 + Math.floor(Math.random() * 3), ttl: rnd(75, 110), slot });
    this.hooks.ui();
  }
  get orders() { return this.custs.filter((c) => c.state !== "leave"); }
  serve(id: number): string {
    const c = this.custs.find((x) => x.id === id); if (!c || c.state === "leave") return "Pesanan tidak ada.";
    const p = PRODUCT_BY_ID[c.item]; const s = this.save;
    if (s.stock[c.item] < c.qty) return `Stok ${p.name} kurang!`;
    s.stock[c.item] -= c.qty; const gain = p.sell * c.qty; s.money += gain;
    s.stats.sold += c.qty; s.stats.earned += gain - p.buy * c.qty; s.stats.customers++;
    if (c.item === "mie_goreng") this.mission("sell_mie", c.qty);
    if (DRINKS.includes(c.item)) this.mission("sell_drink", c.qty);
    this.mission("serve", 1); this.addXp(6 * c.qty);
    c.state = "leave"; c.tx = c.x < this.b("warung").doorX ? -600 : WORLD + 600;
    for (let i = 0; i < 8; i++) this.parts.push({ x: c.x, y: GY - 150, vx: rnd(-40, 40), vy: rnd(-120, -60), life: 1, max: 1, r: 4, c: "#ffd34d", g: 300 });
    this.hooks.ui(); return `+${rp(gain)}`;
  }
  decline(id: number) { const c = this.custs.find((x) => x.id === id); if (c) { c.state = "leave"; this.save.stats.missed++; this.hooks.ui(); } }
  updateCust(c: Cust, dt: number) {
    c.ph += dt * 8;
    if (c.state === "come") { const wb = this.b("warung"); c.tx = wb.doorX + 70 + this.orders.indexOf(c) * 48; const d = c.tx - c.x; if (Math.abs(d) > 4) c.x += Math.sign(d) * 80 * dt; else c.state = "wait"; }
    else if (c.state === "wait") { c.ttl -= dt; const wb = this.b("warung"); c.tx = wb.doorX + 70 + this.orders.indexOf(c) * 48; c.x += Math.sign(c.tx - c.x) * Math.min(60 * dt, Math.abs(c.tx - c.x)); if (c.ttl <= 0) { c.state = "leave"; c.tx = WORLD + 600; this.save.stats.missed++; this.hooks.ui(); } }
    else { c.x += Math.sign(c.tx - c.x) * 90 * dt; }
  }

  // ---------- ekonomi ----------
  addXp(n: number) {
    const s = this.save; s.xp += n;
    while (s.xp >= xpNeed(s.level)) { s.xp -= xpNeed(s.level); s.level++; s.money += s.level * 10000; this.hooks.toast(`LEVEL UP! Lv.${s.level} (+${rp(s.level * 10000)})`); }
  }
  dailyMissions() {
    const d = new Date().toISOString().slice(0, 10); const s = this.save;
    if (s.missionDay !== d) { s.missionDay = d; s.missions = {}; }
    MISSIONS.forEach((m) => { if (!s.missions[m.id]) s.missions[m.id] = { p: 0, claimed: false }; });
  }
  mission(id: string, n: number) { const m = this.save.missions[id]; const d = MISSIONS.find((x) => x.id === id)!; if (m && !m.claimed) m.p = Math.min(d.target, m.p + n); }
  claim(id: string) { const m = this.save.missions[id]; const d = MISSIONS.find((x) => x.id === id)!; if (m && !m.claimed && m.p >= d.target) { m.claimed = true; this.save.money += d.reward; this.addXp(d.xp); this.hooks.toast(`Misi selesai! +${rp(d.reward)}`); this.hooks.ui(); } }
  buy(pid: string, qty: number, sup: string): string {
    const s = this.save; const su = SUPPLIERS.find((x) => x.id === sup)!; const p = PRODUCT_BY_ID[pid];
    if (s.level < su.minLevel) return `Pemasok terbuka di Lv.${su.minLevel}`;
    if (qty < su.minQty) return `Minimal beli ${su.minQty}`;
    const cost = Math.round(p.buy * su.mult) * qty; if (s.money < cost) return "Uang tidak cukup";
    s.money -= cost; s.stats.spent += cost; s.stock[pid] += qty; this.mission("buy_stock", qty); this.hooks.ui(); return `Beli ${qty} ${p.name} (${rp(cost)})`;
  }
  upgrade(): string {
    const s = this.save; const nx = TIERS[s.tier + 1]; if (!nx) return "Sudah level tertinggi!";
    if (this.construct) return "Sedang dibangun...";
    if (s.money < nx.cost) return "Uang belum cukup";
    s.money -= nx.cost; const wb = this.b("warung");
    this.construct = { t: 0, to: nx.id, swapped: false, x: wb.x }; this.addXp(60);
    if (this.place !== "outdoor") this.exitBuilding(true);
    this.hooks.ui(); return "Pembangunan dimulai!";
  }

  // ---------- interior ----------
  interiorId(): string { if (this.place === "warung") return TIERS[this.save.tier].interior === "minimarket" ? "minimarket" : TIERS[this.save.tier].interior === "koperasi" ? "koperasi" : "warung"; return this.place; }
  setupInterior(id: string) {
    const def = INTERIORS[id]; this.intRooms = []; this.spots = []; let x = 0;
    def.rooms.forEach((r) => { const im = this.img(`interiors/${r}.png`); const w = im ? (im.width / im.height) * IH : 1100; this.intRooms.push({ name: r, x, w }); x += w; });
    this.intW = x; this.intOff = x < VW ? (VW - x) / 2 : 0;
    this.intRooms.forEach((r, i) => {
      const sp = ROOM_SPOT[r.name]; if (sp) this.spots.push({ x: r.x + r.w * 0.5, kind: sp.kind, label: sp.label });
      if (id === "warung" || id === "minimarket") this.spots.push({ x: r.x + r.w * 0.6, kind: "kasir", label: "KASIR / TOKO" });
      if (id === "angkringan") this.spots.push({ x: r.x + r.w * 0.38, kind: "makan", label: "MAKAN (Rp12.000)" });
      if (id === "koperasi" && i === 0) this.spots.push({ x: r.x + r.w * 0.55, kind: "koperasi", label: "MEJA KOPERASI" });
      if (id === "koperasi" && i === 1) this.spots.push({ x: r.x + r.w * 0.5, kind: "komputer", label: "KOMPUTER (STATISTIK)" });
      if (id === "balai") this.spots.push({ x: r.x + r.w * 0.5, kind: "info", label: i === 0 ? "PAPAN PENGUMUMAN" : "MEJA PAK LURAH" });
      if (id === "pos") this.spots.push({ x: r.x + r.w * 0.5, kind: "ronda", label: "RONDA MALAM" });
      if (id === "masjid") this.spots.push({ x: r.x + r.w * 0.5, kind: "sholat", label: "BERDOA" });
    });
  }
  enter(bid: string) {
    const r = this.b(bid); this.startFade(() => {
      this.save.place = this.place = bid === "warung" ? "warung" : r.def.interior; this.setupInterior(this.interiorId());
      this.p.x = this.intRooms[0].x + 150; this.p.h = 0; this.cam = 0; this.hooks.ui();
    });
  }
  exitBuilding(instant = false) {
    const id = this.save.place; const bd = BUILDINGS.find((b) => b.interior === id || b.id === id) ?? BUILDINGS[5];
    const go = () => { this.save.place = this.place = "outdoor"; this.p.x = this.b(bd.id).doorX; this.p.h = 0; this.hooks.ui(); };
    if (instant) go(); else this.startFade(go);
  }
  startFade(cb: () => void) { if (this.fade.dir) return; this.fade = { a: 0, dir: 1, cb }; }
  curBuildingId(): string | null { if (this.place === "outdoor") return null; return (BUILDINGS.find((b) => b.interior === this.place) ?? BUILDINGS[5]).id; }

  nearestDoor(): RB | null {
    let best: RB | null = null, bd = 90;
    this.rb.forEach((r) => { const d = Math.abs(r.doorX - this.p.x); if (d < bd) { bd = d; best = r; } }); return best;
  }
  computePrompt(): Prompt | null {
    if (this.fade.dir || this.construct) return null;
    if (this.place === "outdoor") { const d = this.nearestDoor(); return d ? { label: `MASUK · ${d.def.id === "warung" ? TIERS[this.save.tier].name : d.def.name}`, act: "enter", arg: d.def.id } : null; }
    if (this.p.x < this.intRooms[0].x + 130) return { label: "KELUAR", act: "exit" };
    const sp = this.spots.find((s) => Math.abs(s.x - this.p.x) < 95); return sp ? { label: sp.label, act: sp.kind } : null;
  }
  interact() {
    const pr = this.prompt; if (!pr) return;
    const s = this.save;
    switch (pr.act) {
      case "enter": this.enter(pr.arg!); break;
      case "exit": this.exitBuilding(); break;
      case "kasir": this.hooks.open("toko"); break;
      case "koperasi": this.hooks.open("koperasi"); break;
      case "komputer": this.hooks.open("statistik"); break;
      case "tv": this.startFade(() => { s.clock = (s.clock + 0.5) % 24; this.addXp(2); this.hooks.toast("Nonton TV sebentar... seru!"); }); break;
      case "bed": this.startFade(() => { const h = s.clock; s.clock = h >= 18 || h < 5 ? 6 : (h + 3) % 24; this.hooks.toast("Zzz... kamu beristirahat."); this.addXp(3); }); break;
      case "masak": this.addXp(3); this.hooks.toast("Kamu memasak di dapur. +3 XP"); break;
      case "mandi": this.hooks.toast("Segar! Habis mandi."); break;
      case "makan": if (s.money >= 12000) { s.money -= 12000; this.mission("eat", 1); this.addXp(10); this.hooks.toast("Nasi kucing + es teh. Nikmat! +10 XP"); } else this.hooks.toast("Uang tidak cukup"); break;
      case "info": this.hooks.toast("Pengumuman: Kerja bakti Minggu pagi, ayo ramaikan!"); break;
      case "ronda": this.hooks.toast(this.phase === "malam" ? "Ronda malam: aman terkendali." : "Pos ronda ramai di malam hari."); break;
      case "sholat": this.hooks.toast("Kamu berdoa dengan tenang."); break;
    }
    this.hooks.ui();
  }
  setClock(h: number) { this.save.clock = h; }

  // ---------- loop ----------
  start() { this.running = true; this.last = performance.now(); const f = (n: number) => { if (!this.running) return; const dt = Math.min(0.05, (n - this.last) / 1000); this.last = n; this.fps = lerp(this.fps, 1 / Math.max(dt, 0.001), 0.05); this.update(dt); this.draw(); this.raf = requestAnimationFrame(f); }; this.raf = requestAnimationFrame(f); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); this.persist(); }
  persist() { this.save.lastX = this.p.x; this.save.place = this.place; writeSave(this.save); }

  update(dt: number) {
    this.t += dt; const s = this.save;
    s.clock += dt / 30; if (s.clock >= 24) { s.clock -= 24; this.dailyMissions(); }
    s.stats.playSec += dt;
    // pemain
    const inp = this.input, p = this.p;
    const mx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const sp = this.place === "outdoor" ? 270 : 240;
    p.moving = mx !== 0 && !this.fade.dir;
    if (p.moving) {
      p.dir = mx as 1 | -1; let nx = p.x + mx * sp * dt;
      if (this.place === "outdoor") {
        for (const o of this.solids) { if (p.h < o.h - 8 && Math.abs(nx - o.x) < o.w / 2 + 24 && Math.abs(p.x - o.x) >= o.w / 2 + 24 - 1) nx = p.x; }
        nx = clamp(nx, 60, WORLD - 60);
      } else nx = clamp(nx, this.intRooms[0].x + 70, this.intW - 70);
      s.stats.steps += Math.abs(nx - p.x) / 40; p.wt += dt * 9; p.x = nx;
    }
    if (inp.jump && p.h === 0) { p.vy = 640; }
    if (p.vy !== 0 || p.h > 0) { p.vy -= 1800 * dt; p.h += p.vy * dt; if (p.h <= 0) { p.h = 0; p.vy = 0; } }
    // kamera
    if (this.place === "outdoor") this.cam = clamp(lerp(this.cam, p.x - VW / 2, 1 - Math.pow(0.0005, dt)), 0, WORLD - VW);
    else this.cam = this.intW > VW ? clamp(lerp(this.cam, p.x - VW / 2, 1 - Math.pow(0.0005, dt)), 0, this.intW - VW) : 0;
    // dunia
    {
      this.npcs.forEach((n) => this.updateNpc(n, dt));
      this.vehs.forEach((v) => this.updateVeh(v, dt)); this.vehs = this.vehs.filter((v) => v.x > -400 && v.x < WORLD + 400);
      this.walkers.forEach((w) => this.updateWalker(w, dt)); this.walkers = this.walkers.filter((w) => w.stage !== "done");
      this.vehT -= dt; if (this.vehT <= 0) { this.spawnVehicle(); this.vehT = rnd(2.5, 6); }
    }
    this.custs.forEach((c) => this.updateCust(c, dt)); this.custs = this.custs.filter((c) => !(c.state === "leave" && (c.x < -300 || c.x > WORLD + 300)));
    this.orderT -= dt; if (this.orderT <= 0) { this.spawnOrder(); const rush = this.phase === "siang" ? 0.55 : this.phase === "malam" ? 1.5 : 1; this.orderT = rnd(9, 18) * rush; }
    this.doors.forEach((d) => (d.t += dt)); this.doors = this.doors.filter((d) => d.t < 0.9);
    this.parts.forEach((q) => { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; }); this.parts = this.parts.filter((q) => q.life > 0);
    // konstruksi
    if (this.construct) {
      const c = this.construct; c.t += dt;
      if (Math.random() < dt * 30) { const wb = this.b("warung"); this.puff(wb.x + rnd(0, wb.w), GY - rnd(0, 120), "dust"); }
      if (!c.swapped && c.t > 1.7) { c.swapped = true; s.tier = c.to; this.refreshBuildings(); this.hooks.toast(`Naik jadi ${TIERS[c.to].name}!`); this.hooks.ui(); }
      if (c.t > 3.4) { this.construct = null; this.hooks.ui(); }
    }
    // transisi
    if (this.fade.dir) { this.fade.a += this.fade.dir * dt * 3.2; if (this.fade.dir > 0 && this.fade.a >= 1) { this.fade.dir = -1; this.fade.cb?.(); this.fade.cb = null; } else if (this.fade.dir < 0 && this.fade.a <= 0) { this.fade.a = 0; this.fade.dir = 0; } }
    this.prompt = this.computePrompt();
    this.saveT += dt; if (this.saveT > 4) { this.saveT = 0; this.persist(); }
    this.uiT += dt; if (this.uiT > 0.25) { this.uiT = 0; this.hooks.ui(); }
  }

  // ---------- gambar ----------
  spr(path: string, x: number, fy: number, h: number, o: { flip?: boolean; rot?: number; sx?: number; sy?: number; a?: number } = {}) {
    const im = this.imgs[A + path]; if (!im || !im.width) return;
    const w = (im.width / im.height) * h, c = this.ctx;
    c.save(); c.translate(x, fy); if (o.rot) c.rotate(o.rot); c.scale((o.flip ? -1 : 1) * (o.sx ?? 1), o.sy ?? 1); if (o.a !== undefined) c.globalAlpha = o.a;
    c.drawImage(im, -w / 2, -h, w, h); c.restore();
  }
  shadow(x: number, y: number, w: number) { const c = this.ctx; c.fillStyle = "rgba(0,0,0,.28)"; c.beginPath(); c.ellipse(x, y, w, w * 0.18, 0, 0, 7); c.fill(); }
  darkness(): number { const h = this.hour; if (h < 5) return 0.58; if (h < 6.8) return lerp(0.58, 0, (h - 5) / 1.8); if (h < 17) return 0; if (h < 19) return lerp(0, 0.58, (h - 17) / 2); return 0.58; }

  drawSky() {
    const c = this.ctx, h = this.hour, d = this.darkness();
    const day = ["#5db6f2", "#d6efff"], dusk = ["#f58b54", "#ffd6a0"], night = ["#0b1233", "#233a73"];
    const mix = (a: string, b: string, t: number) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const r = lerp(pa >> 16, pb >> 16, t), g = lerp((pa >> 8) & 255, (pb >> 8) & 255, t), bl = lerp(pa & 255, pb & 255, t); return `rgb(${r | 0},${g | 0},${bl | 0})`; };
    let top = day[0], bot = day[1];
    const isDusk = (h >= 16.5 && h < 19.5) || (h >= 5 && h < 7);
    if (d > 0.01 && isDusk) { const t = d / 0.58; top = mix(dusk[0], night[0], t); bot = mix(dusk[1], night[1], t); const k = Math.min(1, d / 0.3); top = mix(day[0], top, k); bot = mix(day[1], bot, k); }
    else if (d > 0.3) { top = night[0]; bot = night[1]; }
    const g = c.createLinearGradient(0, 0, 0, 600); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    if (d > 0.3) { c.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 40; i++) { c.fillRect((i * 331) % VW, (i * 97) % 300, 2, 2); } c.fillStyle = "#f4f1d0"; c.beginPath(); c.arc(1050, 110, 32, 0, 7); c.fill(); }
    else { c.fillStyle = "rgba(255,255,255,.85)"; for (let i = 0; i < 6; i++) { const x = ((i * 340 + this.t * 8 - this.cam * 0.08) % (VW + 300)) - 150, y = 70 + (i % 3) * 55; c.beginPath(); c.ellipse(x, y, 80, 22, 0, 0, 7); c.ellipse(x + 50, y - 12, 55, 24, 0, 0, 7); c.ellipse(x - 50, y + 4, 50, 18, 0, 0, 7); c.fill(); } }
    c.fillStyle = d > 0.3 ? "#1a2b4a" : "#7fb3a4"; c.beginPath(); c.moveTo(0, 450);
    for (let x = 0; x <= VW; x += 40) c.lineTo(x, 400 - 60 * Math.sin((x + this.cam * 0.2) / 260) - 25 * Math.sin((x + this.cam * 0.2) / 90)); c.lineTo(VW, 620); c.lineTo(0, 620); c.fill();
  }
  drawGround() {
    const c = this.ctx;
    c.fillStyle = "#6fa857"; c.fillRect(0, 560, VW, 60);
    c.fillStyle = "#c9c4b6"; c.fillRect(0, 585, VW, 58);
    c.fillStyle = "#b3ad9d"; for (let x = -((this.cam) % 80); x < VW; x += 80) c.fillRect(x, 585, 3, 58);
    c.fillStyle = "#8d8f94"; c.fillRect(0, 643, VW, 6);
    c.fillStyle = "#3d4047"; c.fillRect(0, 649, VW, 71);
    c.fillStyle = "#f0e9c8"; for (let x = -((this.cam) % 120); x < VW; x += 120) c.fillRect(x, 689, 64, 4);
    // parkir
    const px = PARKING.x0 - this.cam; c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 3;
    for (let x = PARKING.x0; x <= PARKING.x1; x += 60) { c.beginPath(); c.moveTo(x - this.cam, 643); c.lineTo(x - this.cam, 672); c.stroke(); }
    c.fillStyle = "#2f6fd6"; c.fillRect(px + 150, 606, 42, 26); c.fillStyle = "#fff"; c.font = "bold 20px sans-serif"; c.textAlign = "center"; c.fillText("P", px + 171, 627);
    c.fillStyle = "#222"; c.fillRect(px + 169, 632, 4, 12);
  }
  drawBuilding(r: RB) {
    const c = this.ctx, im = this.imgs[A + r.sprite]; if (!im) return;
    const x = r.x - this.cam, fy = GY - 8;
    if (x > VW + 50 || x + r.w < -50) return;
    c.save();
    if (this.construct && r.def.id === "warung") { const k = this.construct.t; c.globalAlpha = k > 1.5 && k < 1.9 ? 0.2 : 1; }
    if (r.def.flip) { c.translate(x + r.w, fy - r.h); c.scale(-1, 1); c.drawImage(im, 0, 0, r.w, r.h); } else c.drawImage(im, x, fy - r.h, r.w, r.h);
    c.restore();
    c.font = "bold 18px sans-serif"; c.textAlign = "center";
    if (r.def.kind === "rumah" && this.darkness() > 0.2 && r.def.windows) {
      r.def.windows.forEach(([wx, wy]) => { const g = c.createRadialGradient(x + r.w * wx, fy - r.h * (1 - wy), 2, x + r.w * wx, fy - r.h * (1 - wy), 46); g.addColorStop(0, "rgba(255,225,130,.95)"); g.addColorStop(1, "rgba(255,200,80,0)"); c.fillStyle = g; c.fillRect(x + r.w * wx - 46, fy - r.h * (1 - wy) - 46, 92, 92); });
    }
    const hasSleeper = this.npcs.some((n) => n.inside && n.act === "sleep" && n.def.home === r.def.id && this.phase === "malam");
    if (hasSleeper) { c.fillStyle = "#fff"; c.font = "bold 22px sans-serif"; c.fillText("Z" + (Math.floor(this.t * 2) % 2 ? "z" : "Z") + "z", x + r.w * 0.5, fy - r.h * 0.7 + Math.sin(this.t * 2) * 4); }
    // pintu
    const dd = this.doors.find((d) => Math.abs(d.x - r.doorX) < 80);
    if (dd) { const k = Math.sin((dd.t / 0.9) * Math.PI); c.fillStyle = `rgba(30,18,10,${0.85 * k})`; c.fillRect(r.doorX - this.cam - 16, fy - 74, 32, 72); c.fillStyle = `rgba(255,220,130,${0.4 * k})`; c.fillRect(r.doorX - this.cam - 26, fy - 70, 12, 66); }
    if (this.construct && r.def.id === "warung") this.drawScaffold(r, x, fy);
  }
  drawScaffold(r: RB, x: number, fy: number) {
    const c = this.ctx, k = this.construct!.t; c.strokeStyle = "#e2a93b"; c.lineWidth = 4;
    const w = r.w + 40, h = 300;
    for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(x - 20 + (w / 4) * i, fy); c.lineTo(x - 20 + (w / 4) * i, fy - h); c.stroke(); }
    for (let j = 1; j <= 3; j++) { c.beginPath(); c.moveTo(x - 20, fy - j * 85); c.lineTo(x - 20 + w, fy - j * 85); c.stroke(); }
    c.fillStyle = "rgba(0,0,0,.65)"; c.fillRect(x + r.w / 2 - 150, fy - h - 40, 300, 34); c.fillStyle = "#ffd34d"; c.font = "bold 20px sans-serif"; c.textAlign = "center"; c.fillText("🔨 SEDANG DIBANGUN...", x + r.w / 2, fy - h - 16);
    if (Math.abs(k - 1.7) < 0.12) { c.fillStyle = "rgba(255,255,255,.85)"; c.fillRect(0, 0, VW, VH); }
  }
  drawNpc(n: Npc) {
    if (!n.vis) return; const x = n.x - this.cam; if (x < -150 || x > VW + 150) return;
    const c = this.ctx, d = n.def, fy = GY + n.lane, H = 205 * d.scale, ph = n.ph, flip = n.dir < 0;
    const moving = !n.arrived && Math.abs(n.tx - n.x) > 5;
    this.shadow(x, fy, 34 * d.scale);
    const sp = (path: string, o: { rot?: number; sx?: number; sy?: number; dy?: number; h?: number } = {}) => this.spr(path, x, fy - (o.dy ?? 0), o.h ?? H, { flip, rot: o.rot, sx: o.sx, sy: o.sy });
    const body = `characters/npc_${d.sprite}.png`;
    if (moving) {
      const bob = Math.abs(Math.sin(ph)) * 7 * n.amp; sp(body, { dy: bob, rot: Math.sin(ph) * 0.055 * n.amp, sy: 1 + Math.sin(ph * 2) * 0.015 });
      if (n.carry) this.box(x, fy - H - bob + 30, n.dir);
      return;
    }
    switch (n.act) {
      case "sit": case "eat": {
        const sit = `characters/npc_${d.sit ?? "sit_blue"}.png`; const lean = n.act === "eat" ? Math.sin(ph * 0.8) * 0.06 : 0;
        this.spr(sit, x, fy + 2, H * 0.78, { flip, rot: lean, sy: 1 + Math.sin(ph * 0.5) * 0.01 });
        if (n.act === "eat") { this.spr("food/B_00.png", x + n.dir * 32, fy - 40 - Math.abs(Math.sin(ph * 0.8)) * 6, 24); }
        break;
      }
      case "chat": {
        const talk = Math.floor(ph * 0.35 + (n.partner ? (n.x < n.partner.x ? 0 : 1) : 0)) % 2 === 0;
        sp(body, { dy: talk ? Math.abs(Math.sin(ph * 1.6)) * 6 : 0, rot: talk ? Math.sin(ph * 1.6) * 0.04 : 0 });
        if (talk) this.bubble(x, fy - H - 14, "…", Math.floor(ph * 2) % 3);
        break;
      }
      case "sweep": {
        const sw = Math.sin(ph * 0.9); sp(body, { rot: sw * 0.05, dy: Math.abs(sw) * 2 });
        if (d.sprite !== "sweeper_green" && d.sprite !== "sheetA_06") { c.save(); c.translate(x + n.dir * 38, fy - H * 0.42); c.rotate(n.dir * (0.35 + sw * 0.35)); c.strokeStyle = "#8b5a2b"; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, H * 0.44); c.stroke(); c.fillStyle = "#c9a227"; c.fillRect(-14, H * 0.42, 28, 14); c.restore(); }
        break;
      }
      case "water": {
        const cr = `characters/npc_${d.crouch ?? "crouch_green"}.png`; sp(cr, { h: H * 0.66, dy: Math.abs(Math.sin(ph * 0.7)) * 2 });
        c.save(); c.translate(x + n.dir * 54, fy - 48); c.rotate(n.dir * (0.5 + Math.sin(ph * 0.7) * 0.15)); c.fillStyle = "#2d9cdb"; c.fillRect(-14, -10, 28, 20); c.fillRect(n.dir * 14, -4, n.dir * 20, 4); c.restore();
        this.spr("environment/props_01.png", x + n.dir * 96, fy, 54);
        break;
      }
      case "cook": { this.spr("environment/furniture_04.png", x + n.dir * 80, fy + 4, 140); sp(body, { rot: Math.sin(ph * 2.2) * 0.035, dy: Math.abs(Math.sin(ph * 2.2)) * 3 }); break; }
      case "sell": { this.spr("environment/furniture_01.png", x + n.dir * 70, fy + 4, 130); sp(body, { rot: Math.sin(ph * 0.9) * 0.04 }); if (Math.sin(ph * 0.25) > 0.85) this.bubble(x, fy - H - 10, "Mari!", 0, true); break; }
      case "play": { const j = Math.abs(Math.sin(ph * 1.3)) * 34 * n.amp; sp(body, { dy: j, rot: Math.sin(ph * 1.3) * 0.12, sy: 1 + (j < 4 ? -0.04 : 0.02) }); break; }
      case "work": { const k = Math.sin(ph * 1.1); sp(body, { rot: k * 0.1, dy: Math.abs(k) * 3 }); this.box(x + n.dir * 36, fy - 40, n.dir); break; }
      case "carry": { sp(body, { dy: Math.abs(Math.sin(ph * 0.5)) * 2 }); this.box(x, fy - H + 30, n.dir); break; }
      default: sp(body, { dy: Math.abs(Math.sin(ph * 0.5)) * 2, sy: 1 + Math.sin(ph * 0.5) * 0.012 });
    }
  }
  box(x: number, y: number, dir: number) { const c = this.ctx; c.fillStyle = "#b9824a"; c.fillRect(x - 24 + dir * 4, y - 30, 48, 34); c.fillStyle = "#d9a468"; c.fillRect(x - 24 + dir * 4, y - 30, 48, 8); c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(x - 3 + dir * 4, y - 30, 6, 34); }
  bubble(x: number, y: number, txt: string, dots = 0, solid = false) {
    const c = this.ctx; c.save(); c.font = "bold 20px sans-serif"; const w = Math.max(40, c.measureText(txt).width + 18);
    c.fillStyle = "#fff"; c.strokeStyle = "#333"; c.lineWidth = 2; c.beginPath(); c.roundRect(x - w / 2, y - 30, w, 30, 10); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x, y + 9); c.lineTo(x + 6, y); c.fill();
    c.fillStyle = "#222"; c.textAlign = "center"; c.fillText(solid ? txt : "•".repeat(dots + 1), x, y - 9); c.restore();
  }
  drawVeh(v: Veh) {
    const x = v.x - this.cam; if (x < -300 || x > VW + 300) return; const flip = v.dir < 0 ? false : true;
    // sprite motor/mobil menghadap kiri di sheet -> flip bila bergerak ke kanan
    const parked = v.state === "parked" || (v.state === "start");
    const sprite = parked && v.empty ? v.empty : v.sprite;
    this.shadow(x, v.y, v.h * 0.55);
    const bob = v.state === "drive" ? Math.sin(v.ph) * 1.2 : v.shake;
    this.spr(sprite, x + v.shake, v.y - bob, v.h, { flip, rot: v.state === "brake" ? -v.dir * 0.015 : 0 });
    if (v.overlay && !parked) this.spr(v.overlay, x + (flip ? -1 : 1) * -4, v.y - v.h * 0.22 - bob, v.h * 0.78, { flip });
    if (v.kind === "sepeda" && !parked) { /* kayuh */ }
    if (v.state === "parked" && v.rider && v.rider.stage === "go") { /* turun dari motor */ }
  }
  drawWalker(w: Walker) { const x = w.x - this.cam; if (w.stage === "inside" || x < -100 || x > VW + 100) return; const b = Math.abs(Math.sin(w.ph)) * 6; this.shadow(x, w.y, 28); this.spr(`characters/npc_${w.sprite}.png`, x, w.y - b, 190, { flip: w.dir < 0, rot: Math.sin(w.ph) * 0.05 }); }
  drawCust(cu: Cust) {
    const x = cu.x - this.cam; if (x < -100 || x > VW + 100) return; const moving = Math.abs(cu.tx - cu.x) > 5 || cu.state === "leave"; const b = moving ? Math.abs(Math.sin(cu.ph)) * 6 : Math.abs(Math.sin(cu.ph * 0.2)) * 2;
    this.shadow(x, GY + 14, 28); this.spr(`characters/npc_${cu.sprite}.png`, x, GY + 14 - b, 190, { flip: cu.state === "leave" ? cu.tx < cu.x : (this.b("warung").doorX < cu.x ? false : true), rot: moving ? Math.sin(cu.ph) * 0.05 : 0 });
    if (cu.state === "wait") { const c = this.ctx; c.fillStyle = "#fff"; c.strokeStyle = "#333"; c.lineWidth = 2; c.beginPath(); c.roundRect(x - 34, GY - 270, 68, 50, 12); c.fill(); c.stroke(); this.ctx.drawImage(this.imgs[A + PRODUCT_BY_ID[cu.item].img.slice(8)] ?? new Image(), x - 30, GY - 266, 36, 36); c.fillStyle = "#222"; c.font = "bold 16px sans-serif"; c.textAlign = "left"; c.fillText("x" + cu.qty, x + 8, GY - 241); }
  }
  drawPlayer(x: number, fy: number) {
    const p = this.p, s = this.save, ch = s.char ?? "A"; const frames = ch === "A" ? 7 : 3;
    const f = p.moving ? Math.floor(p.wt) % frames : 0; const im = this.imgs[A + `characters/animations/char${ch}_walk_${f}.png`]; if (!im) return;
    const cv = dressed(im, s.outfit); const H = 238, sc = H / im.height, w = cv.width * sc, h = cv.height * sc;
    this.shadow(x, fy, 36 * (1 - Math.min(0.4, p.h / 300)));
    const c = this.ctx; c.save(); c.translate(x, fy - p.h); if (p.dir < 0) c.scale(-1, 1); const idle = p.moving ? 0 : Math.sin(this.t * 2.4) * 2; c.drawImage(cv, -w / 2, -h - idle, w, h + idle); c.restore();
  }
  drawOutdoor() {
    const c = this.ctx; this.drawSky();
    // pohon latar
    this.trees.forEach((t) => { const x = t.x - this.cam * 1.0; if (x < -200 || x > VW + 200) return; this.spr(t.k === 1 ? "environment/plants_06.png" : "environment/furniture_24.png", x, GY - 40, t.h, { a: 1 }); });
    this.rb.forEach((r) => this.drawBuilding(r));
    // taman bermain, halte
    this.spr(PLAYGROUND.sprite, PLAYGROUND.x - this.cam + 200, GY - 8, PLAYGROUND.h);
    this.drawHalte(HALTE_X - this.cam);
    this.drawGround();
    // pagar + tanaman depan rumah
    this.rb.filter((r) => r.def.kind === "rumah").forEach((r) => {
      const x0 = r.x - 80 - this.cam, x1 = r.x + r.w + 80 - this.cam; if (x1 < -50 || x0 > VW + 50) return;
      const fw = 70; for (let x = x0; x < x1; x += fw) { if (Math.abs(x + fw / 2 - (r.doorX - this.cam)) < 80) continue; this.spr("environment/props_12.png", x + fw / 2, GY - 2, 62); }
      this.spr("environment/plants_01.png", r.x + 40 - this.cam, GY - 2, 58); this.spr("environment/props_01.png", r.x + r.w - 40 - this.cam, GY, 56);
    });
    this.rb.filter((r) => r.def.kind === "dagang").forEach((r) => { this.spr("environment/props_20.png", r.x - 14 - this.cam, GY + 4, 62); this.spr("environment/props_20.png", r.x + r.w + 14 - this.cam, GY + 4, 62); });
    this.spr("environment/furniture_01.png", this.b("warung").x - 80 - this.cam, GY + 6, 125); this.spr("environment/furniture_04.png", this.b("angk").x - 90 - this.cam, GY + 6, 138);
    LAMP_X.forEach((lx) => { const x = lx - this.cam; if (x > -60 && x < VW + 60) this.spr("environment/props_10.png", x, GY + 2, 190); });
    BIN_X.forEach((bx, i) => this.spr(i % 2 ? "environment/props_08.png" : "environment/props_07.png", bx - this.cam, GY + 4, 66));
    BENCH_X.forEach((bx) => this.spr("environment/props_09.png", bx - this.cam, GY + 4, 52));
    // NPC + pemain berdasar kedalaman
    this.npcs.forEach((n) => this.drawNpc(n)); this.custs.forEach((cu) => this.drawCust(cu));
    this.drawPlayer(this.p.x - this.cam, GY + 8);
    this.walkers.forEach((w) => this.drawWalker(w));
    this.vehs.slice().sort((a, b2) => a.y - b2.y).forEach((v) => this.drawVeh(v));
    this.parts.forEach((q) => { c.globalAlpha = Math.max(0, q.life / q.max); c.fillStyle = q.c; c.beginPath(); c.arc(q.x - this.cam, q.y, q.r, 0, 7); c.fill(); }); c.globalAlpha = 1;
    // malam
    const d = this.darkness();
    if (d > 0) {
      c.fillStyle = `rgba(8,14,48,${d})`; c.fillRect(0, 0, VW, VH);
      c.globalCompositeOperation = "lighter";
      LAMP_X.forEach((lx) => { const x = lx - this.cam; if (x < -150 || x > VW + 150) return; const g = c.createRadialGradient(x, GY - 170, 4, x, GY - 120, 170); g.addColorStop(0, `rgba(255,210,120,${d * 0.9})`); g.addColorStop(1, "rgba(255,200,100,0)"); c.fillStyle = g; c.fillRect(x - 170, GY - 340, 340, 400); });
      this.rb.filter((r) => r.def.kind !== "rumah").forEach((r) => { const x = r.doorX - this.cam; const g = c.createRadialGradient(x, GY - 90, 4, x, GY - 90, 200); g.addColorStop(0, `rgba(255,190,100,${d * 0.7})`); g.addColorStop(1, "rgba(255,190,100,0)"); c.fillStyle = g; c.fillRect(x - 200, GY - 290, 400, 380); });
      c.globalCompositeOperation = "source-over";
    }
  }
  drawHalte(x: number) {
    if (x < -200 || x > VW + 200) return; const c = this.ctx;
    c.fillStyle = "#2f6fd6"; c.fillRect(x - 10, GY - 150, 150, 18); c.fillStyle = "#1c4a99"; c.fillRect(x - 10, GY - 134, 150, 5);
    c.fillStyle = "#555"; c.fillRect(x, GY - 132, 5, 130); c.fillRect(x + 125, GY - 132, 5, 130);
    c.fillStyle = "#fff"; c.font = "bold 16px sans-serif"; c.textAlign = "center"; c.fillText("HALTE", x + 65, GY - 135);
    c.fillStyle = "#8b5a2b"; c.fillRect(x + 12, GY - 38, 105, 9); c.fillRect(x + 18, GY - 29, 6, 28); c.fillRect(x + 104, GY - 29, 6, 28);
  }
  drawInterior() {
    const c = this.ctx; const id = this.interiorId(); const def = INTERIORS[id];
    c.fillStyle = "#17121e"; c.fillRect(0, 0, VW, VH);
    const off = this.intOff - this.cam;
    this.intRooms.forEach((r) => {
      const im = this.img(`interiors/${r.name}.png`); if (!im) return; const x = off + r.x;
      c.save(); if (def.flip) { c.translate(x + r.w, IY); c.scale(-1, 1); c.drawImage(im, 0, 0, r.w, IH); } else c.drawImage(im, x, IY, r.w, IH); c.restore();
      if (def.tint) { c.fillStyle = def.tint; c.fillRect(x, IY, r.w, IH); }
      (ROOM_NPCS[r.name] ?? []).forEach((n, i) => this.drawRoomNpc(n, x + r.w * n.x, i));
    });
    c.fillStyle = "rgba(0,0,0,.5)"; c.fillRect(0, IY + IH, VW, VH);
    // pintu keluar
    const ex = off + this.intRooms[0].x + 40; c.fillStyle = "#ffd34d"; c.font = "bold 22px sans-serif"; c.textAlign = "center"; c.fillText("⬅ KELUAR", ex + 30, IFLOOR - 250 + Math.sin(this.t * 4) * 3);
    this.spots.forEach((s) => { const x = off + s.x; c.fillStyle = "rgba(255,211,77,.9)"; const y = IFLOOR - 20 + Math.sin(this.t * 4 + s.x) * 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 10, y - 14); c.lineTo(x + 10, y - 14); c.fill(); });
    // pelanggan di warung
    if (id === "warung" || id === "minimarket") this.orders.slice(0, 4).forEach((cu, i) => { const x = off + this.intRooms[0].x + 260 + i * 70; this.shadow(x, IFLOOR + 8, 30); this.spr(`characters/npc_${cu.sprite}.png`, x, IFLOOR + 8 - Math.abs(Math.sin(this.t * 2 + i)) * 2, 200, { flip: true }); const im = this.imgs[A + PRODUCT_BY_ID[cu.item].img.slice(8)]; c.fillStyle = "#fff"; c.beginPath(); c.roundRect(x - 30, IFLOOR - 260, 60, 44, 10); c.fill(); if (im) c.drawImage(im, x - 26, IFLOOR - 256, 34, 34); c.fillStyle = "#222"; c.font = "bold 15px sans-serif"; c.textAlign = "left"; c.fillText("x" + cu.qty, x + 8, IFLOOR - 232); });
    this.drawPlayer(this.p.x + off, IFLOOR + 10);
    this.parts.forEach((q) => { c.globalAlpha = Math.max(0, q.life / q.max); c.fillStyle = q.c; c.beginPath(); c.arc(q.x + off, q.y, q.r, 0, 7); c.fill(); }); c.globalAlpha = 1;
    const d = this.darkness(); if (d > 0) { c.fillStyle = `rgba(10,15,50,${d * 0.35})`; c.fillRect(0, 0, VW, VH); }
    c.fillStyle = "rgba(255,255,255,.9)"; c.font = "bold 26px sans-serif"; c.textAlign = "center"; c.fillText(this.place === "warung" ? TIERS[this.save.tier].name : def.name, VW / 2, 60);
  }
  drawRoomNpc(n: { sprite: string; x: number; act: string; scale?: number }, x: number, i: number) {
    const ph = this.t * (2 + i * 0.4) + i * 1.7, S = (n.scale ?? 1) * 196, c = this.ctx; const fy = IFLOOR + 8;
    this.shadow(x, fy, 30);
    const path = `characters/npc_${n.sprite}.png`;
    if (n.act === "cook") { this.spr(path, x, fy - Math.abs(Math.sin(ph * 2)) * 3, S, { rot: Math.sin(ph * 2) * 0.03 }); if (Math.random() < 0.15) this.parts.push({ x: x - this.intOff + this.cam + 40, y: fy - 150, vx: rnd(-5, 5), vy: -28, life: 1.2, max: 1.2, r: 5, c: "rgba(255,255,255,.5)", g: -5 }); }
    else if (n.act === "tv") { this.spr(path, x, fy, S * 0.8, { sy: 1 + Math.sin(ph * 0.6) * 0.01 }); }
    else if (n.act === "eat") { this.spr(path, x, fy, S * 0.8, { rot: Math.sin(ph * 0.9) * 0.05 }); }
    else if (n.act === "sell") { this.spr(path, x, fy - Math.abs(Math.sin(ph)) * 2, S, { rot: Math.sin(ph * 0.8) * 0.03, flip: true }); if (Math.sin(ph * 0.3) > 0.8) this.bubble(x, fy - S - 8, "Silakan!", 0, true); }
    else this.spr(path, x, fy - Math.abs(Math.sin(ph * 0.5)) * 2, S * 0.9);
    void c;
  }
  draw() {
    const c = this.ctx; c.save(); c.clearRect(0, 0, VW, VH);
    if (this.place === "outdoor") this.drawOutdoor(); else this.drawInterior();
    if (this.fade.a > 0) { c.fillStyle = `rgba(0,0,0,${Math.min(1, this.fade.a)})`; c.fillRect(0, 0, VW, VH); }
    c.restore();
  }

  // ---------- data UI ----------
  areaName(): string { if (this.place !== "outdoor") return INTERIORS[this.interiorId()].name; return AREAS.find((a) => this.p.x >= a.x0 && this.p.x < a.x1)?.name ?? ""; }
  clockText() { const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }
}
