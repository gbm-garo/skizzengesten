// Skizzengesten — Erkennung handgezeichneter Symbole ($P Point-Cloud Recognizer, Vatavu/Anthony/Wobbrock 2012).
// Reine TypeScript-Datei ohne Abhaengigkeiten; wird 1:1 in die Montageskizze kopiert (src/utils/gesten.ts).
//
// Verwendung:
//   const g = new Gestenerkenner(vorlagen);
//   g.lernen("schieber", striche);                 // striche: Punkt[][] (ein Array pro Strich)
//   const treffer = g.erkennen(striche);           // bester Treffer zuerst, je Symbol einer
//   if (treffer[0] && treffer[0].score >= 0.5) ... // Score 0..1
//
// Die Striche sollen in einem gemeinsamen Bezugssystem liegen: Rohr waagrecht (in der Skizze vorher mit
// rohrAusrichten() in die Rohrrichtung drehen). Mit opts.drehungen kann zusaetzlich um feste Winkel gedreht werden.

export type Punkt = { x: number; y: number };
export type Vorlage = { symbol: string; striche: Punkt[][]; quelle?: string; zeit?: number };
export type Treffer = { symbol: string; score: number; abstand: number; drehung: number };

const N = 32; // Punkte nach dem Resampling

type CloudPunkt = { x: number; y: number; id: number };

export function strichLaenge(striche: Punkt[][]): number {
  let l = 0;
  for (const s of striche) for (let i = 1; i < s.length; i++) l += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
  return l;
}

export function schwerpunkt(striche: Punkt[][]): Punkt {
  let x = 0, y = 0, n = 0;
  for (const s of striche) for (const p of s) { x += p.x; y += p.y; n++; }
  return n ? { x: x / n, y: y / n } : { x: 0, y: 0 };
}

export function bounds(striche: Punkt[][]): { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of striche) for (const p of s) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 };
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/** Striche um `winkel` (rad) um ihren Schwerpunkt drehen — in der Skizze mit -Rohrwinkel aufrufen, damit das Rohr waagrecht liegt. */
export function drehen(striche: Punkt[][], winkel: number, zentrum?: Punkt): Punkt[][] {
  if (!winkel) return striche.map((s) => s.map((p) => ({ x: p.x, y: p.y })));
  const c = zentrum || schwerpunkt(striche);
  const cs = Math.cos(winkel), sn = Math.sin(winkel);
  return striche.map((s) => s.map((p) => {
    const dx = p.x - c.x, dy = p.y - c.y;
    return { x: c.x + dx * cs - dy * sn, y: c.y + dx * sn + dy * cs };
  }));
}

export function rohrAusrichten(striche: Punkt[][], rohrWinkel: number): Punkt[][] {
  return drehen(striche, -rohrWinkel);
}

function resample(striche: Punkt[][]): CloudPunkt[] {
  const gesamt = strichLaenge(striche);
  const I = gesamt / (N - 1);
  const out: CloudPunkt[] = [];
  if (I <= 0) {
    // Nur ein Punkt (Tipp): N-mal derselbe Punkt
    const p = striche.find((s) => s.length)?.[0] || { x: 0, y: 0 };
    for (let i = 0; i < N; i++) out.push({ x: p.x, y: p.y, id: 0 });
    return out;
  }
  let D = 0;
  striche.forEach((s, id) => {
    if (!s.length) return;
    out.push({ x: s[0].x, y: s[0].y, id });
    for (let i = 1; i < s.length; i++) {
      let a = s[i - 1], b = s[i];
      let d = Math.hypot(b.x - a.x, b.y - a.y);
      while (D + d >= I && d > 0) {
        const t = (I - D) / d;
        const q = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
        out.push({ x: q.x, y: q.y, id });
        a = q;
        d = Math.hypot(b.x - a.x, b.y - a.y);
        D = 0;
      }
      D += d;
    }
  });
  while (out.length < N) out.push({ ...out[out.length - 1] });
  return out.slice(0, N);
}

function normalisieren(striche: Punkt[][]): CloudPunkt[] {
  const pts = resample(striche);
  // Einheitliche Skalierung (Seitenverhaeltnis bleibt erhalten — Flansch bleibt schmal, Muffe bleibt breit)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  const s = Math.max(maxX - minX, maxY - minY) || 1;
  let cx = 0, cy = 0;
  const out = pts.map((p) => { const q = { x: (p.x - minX) / s, y: (p.y - minY) / s, id: p.id }; cx += q.x; cy += q.y; return q; });
  cx /= out.length; cy /= out.length;
  return out.map((p) => ({ x: p.x - cx, y: p.y - cy, id: p.id }));
}

function cloudDistance(a: CloudPunkt[], b: CloudPunkt[], start: number): number {
  const n = a.length;
  const matched = new Array(n).fill(false);
  let sum = 0;
  let i = start;
  do {
    let index = -1, min = Infinity;
    for (let j = 0; j < n; j++) {
      if (matched[j]) continue;
      const d = Math.hypot(a[i].x - b[j].x, a[i].y - b[j].y);
      if (d < min) { min = d; index = j; }
    }
    matched[index] = true;
    const weight = 1 - ((i - start + n) % n) / n;
    sum += weight * min;
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

function greedyCloudMatch(a: CloudPunkt[], b: CloudPunkt[]): number {
  const n = a.length;
  const step = Math.max(1, Math.floor(Math.pow(n, 0.5)));
  let min = Infinity;
  for (let i = 0; i < n; i += step) {
    min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
  }
  return min;
}

/** Abstand (Summe ueber 32 gewichtete Punktpaare) -> Score 0..1. Empirisch: identisch ~0.1, saubere Treffer 0.2-0.5, Fremdes > 1.5. */
export function scoreAusAbstand(abstand: number): number {
  return Math.max(0, Math.min(1, 1 - abstand / 1.6));
}

export class Gestenerkenner {
  private vorlagen: Vorlage[] = [];
  private clouds: { symbol: string; cloud: CloudPunkt[]; striche: number }[] = [];

  constructor(vorlagen?: Vorlage[]) {
    if (vorlagen) for (const v of vorlagen) this.hinzufuegen(v);
  }

  private hinzufuegen(v: Vorlage) {
    if (!v.striche.some((s) => s.length)) return;
    this.vorlagen.push(v);
    this.clouds.push({ symbol: v.symbol, cloud: normalisieren(v.striche), striche: v.striche.length });
  }

  lernen(symbol: string, striche: Punkt[][], quelle?: string): Vorlage {
    const v: Vorlage = { symbol, striche: striche.map((s) => s.map((p) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }))), quelle, zeit: Date.now() };
    this.hinzufuegen(v);
    return v;
  }

  vergessen(symbol: string, index?: number) {
    if (index === undefined) {
      this.vorlagen = this.vorlagen.filter((v) => v.symbol !== symbol);
      this.clouds = this.clouds.filter((c) => c.symbol !== symbol);
      return;
    }
    let k = -1;
    for (let i = 0; i < this.vorlagen.length; i++) {
      if (this.vorlagen[i].symbol !== symbol) continue;
      k++;
      if (k === index) { this.vorlagen.splice(i, 1); this.clouds.splice(i, 1); return; }
    }
  }

  alle(): Vorlage[] { return this.vorlagen.slice(); }
  anzahl(symbol?: string): number { return symbol ? this.vorlagen.filter((v) => v.symbol === symbol).length : this.vorlagen.length; }
  symbole(): string[] { return Array.from(new Set(this.vorlagen.map((v) => v.symbol))); }

  /**
   * Erkennen: liefert je Symbol den besten Treffer, sortiert nach Score (bester zuerst).
   * opts.drehungen: zusaetzliche Drehungen der Eingabe in rad (z.B. [0, Math.PI/2, Math.PI, -Math.PI/2]), Standard [0].
   * opts.strichMalus: Abzug je abweichendem Strich (Standard 0.03) — Hand-Kuerzel schwanken, deshalb klein.
   */
  erkennen(striche: Punkt[][], opts?: { drehungen?: number[]; strichMalus?: number }): Treffer[] {
    const eingabe = striche.filter((s) => s.length);
    if (!eingabe.length || !this.clouds.length) return [];
    const drehungen = opts?.drehungen && opts.drehungen.length ? opts.drehungen : [0];
    const malus = opts?.strichMalus ?? 0.03;
    const beste = new Map<string, Treffer>();
    for (const w of drehungen) {
      const cloud = normalisieren(drehen(eingabe, w));
      for (const c of this.clouds) {
        const d = greedyCloudMatch(cloud, c.cloud);
        const score = Math.max(0, scoreAusAbstand(d) - malus * Math.abs(c.striche - eingabe.length));
        const alt = beste.get(c.symbol);
        if (!alt || score > alt.score) beste.set(c.symbol, { symbol: c.symbol, score, abstand: d, drehung: w });
      }
    }
    return Array.from(beste.values()).sort((a, b) => b.score - a.score);
  }
}
