import { Gestenerkenner, Punkt, Vorlage, Treffer, bounds, istZeichen, textLesen, textDeuten, ZEICHEN_PREFIX } from "./gesten";
import { drawSymbolShape } from "./symbols";

// Symbole der Montageskizze (Bibliothek), die per Hand gezeichnet werden sollen
const SYMBOLE: { id: string; label: string }[] = [
  { id: "steckmuffe", label: "Steckmuffe" },
  { id: "schraubmuffe_srm", label: "Schraubmuffe" },
  { id: "flansch_fl", label: "Flansch" },
  { id: "elektroschweissmuffe", label: "Schweissmuffe" },
  { id: "stumpfschweissnaht", label: "Schweissnaht" },
  { id: "mehrbereichskupplung", label: "Kupplung" },
  { id: "reduktion", label: "Reduktion" },
  { id: "verkappung", label: "Rohrverschluss" },
  { id: "hauseinfuehrung", label: "Hauseinführung" },
  { id: "schieber", label: "Schieber" },
  { id: "ventil", label: "Ventil" },
  { id: "ut_radial", label: "Hydrant" },
  // Schriftzeichen fuer Bemassung/Dimension (z_<zeichen>)
  ...["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "D", "N", "d", "-"].map((z) => ({ id: ZEICHEN_PREFIX + z, label: z })),
];
const labelVon = (id: string) => SYMBOLE.find((s) => s.id === id)?.label || id;

const SPEICHER = "skizzengesten_vorlagen";
const PAUSE_MS = 650;      // Pause nach dem letzten Strich, bis erkannt/gespeichert werden kann
const SCHWELLE = 0.45;     // ab diesem Score gilt ein Treffer als sicher

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pad = $<HTMLCanvasElement>("pad");
const ctx = pad.getContext("2d")!;

let erkenner = new Gestenerkenner(laden());
let modus: "erkennen" | "anlernen" = "erkennen";
let ziel = SYMBOLE[0].id;
let striche: Punkt[][] = [];
let aktiv: { id: number; punkte: Punkt[] } | null = null;
let timer: number | null = null;
let ergebnis: Treffer[] | null = null;
let abgeschlossen = false; // nach der Pause: naechster Strich beginnt eine neue Zeichnung
let stat = { richtig: 0, falsch: 0 };

function laden(): Vorlage[] {
  try { const v = JSON.parse(localStorage.getItem(SPEICHER) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function speichern() {
  try { localStorage.setItem(SPEICHER, JSON.stringify(erkenner.alle())); } catch {}
  $("anzahl").textContent = `${erkenner.anzahl()} Vorlagen`;
}

function toast(text: string) {
  const t = $("toast"); t.textContent = text; t.hidden = false;
  window.clearTimeout((t as any)._t); (t as any)._t = window.setTimeout(() => (t.hidden = true), 1400);
}

// ---------- Symbol-Icons (wie die Vorschau in der Montageskizze) ----------
function iconCanvas(symbolId: string, px: number, farbe = "#1f2937"): HTMLCanvasElement {
  const c = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  c.width = px * dpr; c.height = px * dpr; c.style.width = `${px}px`; c.style.height = `${px}px`;
  const g = c.getContext("2d")!;
  g.scale(dpr, dpr);
  if (istZeichen(symbolId)) {
    g.fillStyle = farbe; g.font = `600 ${Math.round(px * 0.7)}px Inter, system-ui, sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(symbolId.slice(ZEICHEN_PREFIX.length), px / 2, px / 2 + 1);
    return c;
  }
  zeichneSymbol(g, symbolId, px / 2, px / 2, px, farbe);
  return c;
}
function zeichneSymbol(g: CanvasRenderingContext2D, symbolId: string, cx: number, cy: number, px: number, farbe: string) {
  const k = px / 20;
  let size = 6;
  if (symbolId === "ut_radial") size = 4;
  else if (symbolId === "reduktion" || symbolId === "zweifach_schweissreduktion") size = 5;
  g.save();
  g.translate(cx, cy);
  g.lineWidth = 1.5 * k;
  g.strokeStyle = farbe;
  g.fillStyle = "transparent";
  g.lineCap = "round"; g.lineJoin = "round";
  if (symbolId === "hauseinfuehrung") {
    size = 4.5;
    g.beginPath(); g.moveTo(-9.5 * k, 0); g.lineTo(9.5 * k, 0); g.stroke();
  }
  drawSymbolShape(g, symbolId, size * k, 1.5 * k, false, true);
  g.restore();
}

// ---------- Zeichenflaeche ----------
function groesse() {
  const r = pad.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  pad.width = Math.round(r.width * dpr); pad.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  malen();
}
function rohrY() { return pad.getBoundingClientRect().height * 0.55; }

function malen() {
  const r = pad.getBoundingClientRect();
  ctx.clearRect(0, 0, r.width, r.height);
  if ($<HTMLInputElement>("chk-rohr").checked) {
    ctx.save();
    ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(24, rohrY()); ctx.lineTo(r.width - 24, rohrY()); ctx.stroke();
    ctx.restore();
  }
  // Erkanntes Symbol als blauer Schatten ueber der Zeichnung
  if (modus === "erkennen" && ergebnis && ergebnis[0] && ergebnis[0].score >= SCHWELLE && striche.length) {
    const b = bounds(striche);
    const px = Math.max(b.w, b.h) * 1.35;
    ctx.save(); ctx.globalAlpha = 0.45;
    zeichneSymbol(ctx, ergebnis[0].symbol, b.minX + b.w / 2, b.minY + b.h / 2, px, "#2563eb");
    ctx.restore();
  }
  ctx.save();
  ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const alle = aktiv ? [...striche, aktiv.punkte] : striche;
  for (const s of alle) {
    if (!s.length) continue;
    ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y);
    for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
    if (s.length === 1) ctx.lineTo(s[0].x + 0.1, s[0].y);
    ctx.stroke();
  }
  ctx.restore();
}

function pos(e: PointerEvent): Punkt {
  const r = pad.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

pad.addEventListener("pointerdown", (e) => {
  if (aktiv) return; // zweiter Finger/Stift: ignorieren
  e.preventDefault();
  if (timer) { window.clearTimeout(timer); timer = null; }
  if (abgeschlossen) neu();
  aktiv = { id: e.pointerId, punkte: [pos(e)] };
  try { pad.setPointerCapture(e.pointerId); } catch {}
  malen();
});
pad.addEventListener("pointermove", (e) => {
  if (!aktiv || aktiv.id !== e.pointerId) return;
  const p = pos(e);
  const l = aktiv.punkte[aktiv.punkte.length - 1];
  if (Math.hypot(p.x - l.x, p.y - l.y) >= 1.5) { aktiv.punkte.push(p); malen(); }
});
function ende(e: PointerEvent) {
  if (!aktiv || aktiv.id !== e.pointerId) return;
  striche.push(aktiv.punkte);
  aktiv = null;
  malen();
  timer = window.setTimeout(pause, PAUSE_MS);
}
pad.addEventListener("pointerup", ende);
pad.addEventListener("pointercancel", ende);

function neu() {
  striche = []; ergebnis = null; abgeschlossen = false;
  $("bewertung").hidden = true;
  $<HTMLButtonElement>("btn-speichern").disabled = true;
  malen();
}

function pause() {
  timer = null;
  abgeschlossen = true;
  if (modus === "erkennen") {
    const egal = $<HTMLInputElement>("chk-drehung").checked;
    ergebnis = erkenner.erkennen(striche, { drehungen: egal ? [0, Math.PI / 2, Math.PI, -Math.PI / 2] : [0], nur: (sy) => !istZeichen(sy) });
    zeigeErgebnis();
    zeigeText();
    malen();
  } else {
    $<HTMLButtonElement>("btn-speichern").disabled = false;
  }
}

// ---------- Erkennen ----------
function zeigeErgebnis() {
  const box = $("ergebnis"), icon = $("erg-icon"), label = $("erg-label"), score = $("erg-score"), liste = $("erg-liste");
  icon.innerHTML = ""; liste.innerHTML = "";
  box.classList.remove("gut", "leer");
  if (!erkenner.anzahl()) {
    label.textContent = "Keine Vorlagen"; score.textContent = "Zuerst unter «Anlernen» Symbole zeichnen"; box.classList.add("leer");
    $("bewertung").hidden = true; return;
  }
  const best = ergebnis && ergebnis[0];
  if (!best) { label.textContent = "–"; score.textContent = "Nichts erkannt"; box.classList.add("leer"); return; }
  const sicher = best.score >= SCHWELLE;
  icon.appendChild(iconCanvas(best.symbol, 44, sicher ? "#1d4ed8" : "#9ca3af"));
  label.textContent = sicher ? labelVon(best.symbol) : `Unsicher: ${labelVon(best.symbol)}?`;
  score.textContent = `${Math.round(best.score * 100)} %` + (best.drehung ? ` · gedreht ${Math.round((best.drehung * 180) / Math.PI)}°` : "");
  if (sicher) box.classList.add("gut");
  for (const t of ergebnis!.slice(0, 4)) {
    const z = document.createElement("div"); z.className = "erg-zeile";
    z.innerHTML = `<span class="nm">${labelVon(t.symbol)}</span><span class="bar"><i style="width:${Math.round(t.score * 100)}%"></i></span><span class="pct">${Math.round(t.score * 100)} %</span>`;
    liste.appendChild(z);
  }
  $("bewertung").hidden = false;
}
function zeigeText() {
  const alt = document.getElementById("erg-text-zeile"); if (alt) alt.remove();
  if (!erkenner.symbole().some(istZeichen) || striche.length < 1) return;
  const t = textLesen(erkenner, striche);
  const d = textDeuten(t.text);
  const bedeutung = d.dimension ? `Dimension ${d.dimension}` : d.laenge ? `Länge ${d.laenge}` : "";
  const z = document.createElement("div"); z.id = "erg-text-zeile"; z.className = "erg-zeile";
  z.innerHTML = `<span class="nm">Text</span><span style="flex:1;color:var(--ink);font-weight:600">${t.text}${bedeutung ? ` · ${bedeutung}` : ""}</span><span class="pct">${Math.round(t.score * 100)} %</span>`;
  $("erg-liste").appendChild(z);
}
function bewerten(ok: boolean) {
  if (ok) stat.richtig++; else stat.falsch++;
  const n = stat.richtig + stat.falsch;
  $("stat").textContent = `Trefferquote ${stat.richtig}/${n} (${Math.round((stat.richtig / n) * 100)} %)`;
  $("bewertung").hidden = true;
  // Falsch erkannt und ein Ziel bekannt? Als Vorlage nachlernen ist unter «Anlernen» moeglich.
  toast(ok ? "Richtig" : "Notiert");
}
$("btn-richtig").addEventListener("click", () => bewerten(true));
$("btn-falsch").addEventListener("click", () => bewerten(false));

// ---------- Anlernen ----------
function baueGrid() {
  const grid = $("symbol-grid"); grid.innerHTML = "";
  for (const s of SYMBOLE) {
    if (s.id === ZEICHEN_PREFIX + "0") {
      const h = document.createElement("div"); h.className = "grid-trenner"; h.textContent = "Zeichen für Bemassung"; grid.appendChild(h);
    }
    const t = document.createElement("button");
    t.className = "tile" + (s.id === ziel ? " active" : "");
    t.title = s.label;
    t.appendChild(iconCanvas(s.id, 26, s.id === ziel ? "#1d4ed8" : "#1f2937"));
    const l = document.createElement("span"); l.className = "lbl"; l.textContent = s.label; t.appendChild(l);
    const c = document.createElement("span"); c.className = "cnt"; c.textContent = String(erkenner.anzahl(s.id)); t.appendChild(c);
    const d = document.createElement("span"); d.className = "del"; d.textContent = "×"; d.title = "Vorlagen dieses Symbols löschen";
    d.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (!erkenner.anzahl(s.id)) return;
      if (!confirm(`Alle ${erkenner.anzahl(s.id)} Vorlagen für «${s.label}» löschen?`)) return;
      erkenner.vergessen(s.id); speichern(); baueGrid(); toast("Gelöscht");
    });
    t.appendChild(d);
    t.addEventListener("click", () => { ziel = s.id; baueGrid(); $("hint").textContent = `${s.label} zeichnen`; });
    grid.appendChild(t);
  }
}
$("btn-speichern").addEventListener("click", () => {
  if (!striche.length) return;
  erkenner.lernen(ziel, striche, navigator.userAgent.includes("iPad") ? "ipad" : "web");
  speichern(); baueGrid();
  toast(`${labelVon(ziel)}: ${erkenner.anzahl(ziel)} Vorlagen`);
  neu();
});

// ---------- Tabs, Werkzeuge, Export/Import ----------
function setzeModus(m: "erkennen" | "anlernen") {
  modus = m;
  $("tab-erkennen").classList.toggle("active", m === "erkennen");
  $("tab-anlernen").classList.toggle("active", m === "anlernen");
  $("view-erkennen").hidden = m !== "erkennen";
  $("view-anlernen").hidden = m !== "anlernen";
  $("hint").textContent = m === "erkennen" ? "Symbol aufs Rohr zeichnen" : `${labelVon(ziel)} zeichnen`;
  neu();
}
$("tab-erkennen").addEventListener("click", () => setzeModus("erkennen"));
$("tab-anlernen").addEventListener("click", () => setzeModus("anlernen"));
$("btn-clear").addEventListener("click", neu);
$("chk-rohr").addEventListener("change", malen);

$("btn-export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(erkenner.alle(), null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "vorlagen.json"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
$("btn-import").addEventListener("click", () => $<HTMLInputElement>("file-import").click());
$<HTMLInputElement>("file-import").addEventListener("change", async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
  try {
    const v = JSON.parse(await f.text());
    if (!Array.isArray(v)) throw new Error("kein Array");
    const vorher = erkenner.anzahl();
    erkenner = new Gestenerkenner([...erkenner.alle(), ...v.filter((x: any) => x && typeof x.symbol === "string" && Array.isArray(x.striche))]);
    speichern(); baueGrid(); toast(`${erkenner.anzahl() - vorher} Vorlagen importiert`);
  } catch { toast("Datei nicht lesbar"); }
  (e.target as HTMLInputElement).value = "";
});
$("btn-reset").addEventListener("click", () => {
  if (!erkenner.anzahl() || !confirm(`Alle ${erkenner.anzahl()} Vorlagen löschen?`)) return;
  erkenner = new Gestenerkenner([]); speichern(); baueGrid(); neu(); toast("Geleert");
});

window.addEventListener("resize", groesse);
groesse();
baueGrid();
speichern();
