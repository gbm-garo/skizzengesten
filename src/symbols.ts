export type Point = { x: number; y: number };

export function drawSymbolShape(
  ctx: CanvasRenderingContext2D,
  symbolId: string,
  size: number,
  strokeWidth: number,
  checkMuffe: boolean = false,
  isPreview: boolean = false,
  hideCenterDot: boolean = false,
  schieberKippLokal: number | null = null,
) {
  switch (symbolId) {
    case "steckmuffe":
      ctx.beginPath();
      ctx.arc(0, 0, size, Math.PI * 0.5, Math.PI * 1.5);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, size, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
      break;
    case "schieber": {
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      if (schieberKippLokal !== null) {
        // Iso-Kippung: Strich zeigt in die per Windrose gewaehlte Richtung
        const kx = Math.cos(schieberKippLokal) * size * 1.5;
        const ky = Math.sin(schieberKippLokal) * size * 1.5;
        ctx.moveTo(-kx, -ky);
        ctx.lineTo(kx, ky);
      } else {
        ctx.moveTo(0, -size * 1.5);
        ctx.lineTo(0, size * 1.5);
      }
      ctx.stroke();
      break;
    }
    case "ventil": {
      // Doppeldreieck / Bowtie (offener Umriss). Lange Achse VERTIKAL (lokal Y),
      // Basen waagrecht oben/unten. Hoehe +-1.5*size wie der Schieber-Strich.
      const vH = size * 1.5;   // halbe Laenge (vertikal)
      const vW = size * 0.8;   // halbe Basis-Breite (waagrecht)
      // Rohrlinie hinter dem Ventil ausblenden (gleiche Technik wie Flansch/Kupplung),
      // entlang der Laengsachse des Ventils (lokal Y):
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(0, -vH);
      ctx.lineTo(0, vH);
      ctx.lineWidth = strokeWidth + 2;
      ctx.lineCap = "butt";
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-vW, -vH);
      ctx.lineTo(0, 0);
      ctx.lineTo(-vW, vH);
      ctx.lineTo(vW, vH);
      ctx.lineTo(0, 0);
      ctx.lineTo(vW, -vH);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case "verkappung":
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.8);
      ctx.lineTo(0, size * 0.8);
      ctx.lineTo(-size * 0.5, size * 0.8);
      ctx.moveTo(0, -size * 0.8);
      ctx.lineTo(-size * 0.5, -size * 0.8);
      ctx.stroke();
      break;
    case "hauseinfuehrung": {
      const hw = size * 1.5; // 150% der bisherigen Länge (zuvor size * 1.0)
      const hh = size * 0.6; // 150% der bisherigen Höhe (zuvor size * 0.4)
      // Rohr unter dem Kästchen ausblenden (wie bei Kupplung/Flansch)
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(-hw, 0);
      ctx.lineTo(hw, 0);
      ctx.lineWidth = strokeWidth + 2;
      ctx.lineCap = "butt";
      ctx.stroke();
      ctx.restore();
      // Kästchen
      ctx.beginPath();
      ctx.rect(-hw, -hh, hw * 2, hh * 2);
      ctx.stroke();
      break;
    }
    case "hauseinfuehrung_pressring": {
      const hw = size * 1.5;
      const hh = size * 0.6;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(-hw, 0);
      ctx.lineTo(hw, 0);
      ctx.lineWidth = strokeWidth + 2;
      ctx.lineCap = "butt";
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.rect(-hw, -hh, hw * 2, hh * 2);
      ctx.stroke();
      
      const prW = size * 0.3;
      const prH = size * 1.0;
      
      // Oberer Teil des Pressrings
      ctx.beginPath();
      ctx.moveTo(-prW, -hh);
      ctx.lineTo(-prW, -prH);
      ctx.lineTo(prW, -prH);
      ctx.lineTo(prW, -hh);
      ctx.stroke();

      // Unterer Teil des Pressrings
      ctx.beginPath();
      ctx.moveTo(-prW, hh);
      ctx.lineTo(-prW, prH);
      ctx.lineTo(prW, prH);
      ctx.lineTo(prW, hh);
      ctx.stroke();
      break;
    }
    case "pressring": {
      const prW = size * 0.3;
      const prH = size * 1.0;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(-prW, 0);
      ctx.lineTo(prW, 0);
      ctx.lineWidth = strokeWidth + 2;
      ctx.lineCap = "butt";
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.rect(-prW, -prH, prW * 2, prH * 2);
      ctx.stroke();
      break;
    }
    case "schraubmuffe_srm": {
      const r = size * 0.75;
      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI * 0.5, Math.PI * 1.5);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(size * 0.2, -size * 1.05);
      ctx.lineTo(size * 0.4, -size * 0.5);
      ctx.lineTo(size * 0.6, -size * 1.05);
      ctx.lineTo(size * 0.8, -r);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, r);
      ctx.lineTo(size * 0.2, size * 1.05);
      ctx.lineTo(size * 0.4, size * 0.5);
      ctx.lineTo(size * 0.6, size * 1.05);
      ctx.lineTo(size * 0.8, r);
      ctx.stroke();
      break;
    }
    case "flansch_fl":
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(-size * 0.3, 0);
      ctx.lineTo(size * 0.3, 0);
      ctx.lineWidth = strokeWidth + 2;
      ctx.lineCap = "butt";
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-size * 0.3, -size);
      ctx.lineTo(-size * 0.3, size);
      ctx.moveTo(size * 0.3, -size);
      ctx.lineTo(size * 0.3, size);
      ctx.stroke();
      break;
    case "mehrbereichskupplung":
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(-size * 0.7, 0);
      ctx.lineTo(size * 0.7, 0);
      ctx.lineWidth = strokeWidth + 2;
      ctx.lineCap = "butt";
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-size, -size * 0.8);
      ctx.lineTo(size, -size * 0.8);
      ctx.moveTo(-size, size * 0.8);
      ctx.lineTo(size, size * 0.8);
      ctx.stroke();
      break;
    case "reduktion":
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, 0);
      ctx.lineTo(size * 0.6, 0);
      ctx.lineWidth = strokeWidth + 2;
      ctx.lineCap = "butt";
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-size, -size * 0.8);
      ctx.lineTo(size, -size * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size, size * 0.8);
      ctx.lineTo(size, size * 0.4);
      ctx.stroke();
      break;
    case "verkappung_kupplung": {
      // Clean up any pipe that shoots past our desired stop point
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(size * 0.325, 0); // Reduced from 0.65 to 0.325
      ctx.lineTo(size * 2, 0);
      ctx.lineWidth = strokeWidth + 2;
      ctx.lineCap = "butt";
      ctx.stroke();
      ctx.restore();
      
      // Extend the pipe deeply into the cap
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size * 0.325, 0); // Reduced from 0.65 to 0.325
      ctx.stroke();
      
      // Draw the cap symbol
      ctx.beginPath();
      ctx.moveTo(-size, -size * 0.8);
      ctx.lineTo(size, -size * 0.8);
      ctx.moveTo(-size, size * 0.8);
      ctx.lineTo(size, size * 0.8);
      
      ctx.moveTo(size, -size * 1.4);
      ctx.lineTo(size, size * 1.4);
      ctx.stroke();
      break;
    }
    case "verkappung_schweissmuffe": {
      // Halved axial length (w = size * 0.6) and precise height (size * 0.75) 
      // to exactly match stroke thickness of 26px when drawn.
      const h = size * 0.75;
      const w = size * 0.6;
      
      // We don't need destination-out because the box is filled white, 
      // which cleanly covers the underlying pipe without leaving a gap.
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(-w, -h);
      ctx.lineTo(w, -h);
      // Extend right side to form the cap (small flange)
      ctx.lineTo(w, -h - size * 0.25);
      ctx.lineTo(w + size * 0.25, -h - size * 0.25);
      ctx.lineTo(w + size * 0.25, h + size * 0.25);
      ctx.lineTo(w, h + size * 0.25);
      ctx.lineTo(w, h);
      ctx.lineTo(-w, h);
      ctx.closePath();
      
      ctx.fill();
      ctx.stroke();
      
      const bz = 14; 
      ctx.beginPath();
      ctx.moveTo(bz * 0.1, -bz * 0.5);
      ctx.lineTo(-bz * 0.3, bz * 0.1);
      ctx.lineTo(0, bz * 0.1);
      ctx.lineTo(-bz * 0.1, bz * 0.5);
      ctx.lineTo(bz * 0.3, -bz * 0.1);
      ctx.lineTo(0, -bz * 0.1);
      ctx.closePath();
      
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "zweifach_schweissreduktion": {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(-size * 1.1, 0);
      ctx.lineTo(size * 1.1, 0);
      ctx.lineWidth = strokeWidth + 2;
      ctx.lineCap = "butt";
      ctx.stroke();
      ctx.restore();

      const activeColor = ctx.strokeStyle;

      // Draw the single outer body (1 Körper ohne Abtrennung) filled with white
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      // Start at top-left of the left box
      ctx.moveTo(-size, -size * 0.8);
      // To top-right of the left box
      ctx.lineTo(-size * 0.4, -size * 0.8);
      // Diagonal transition down to top-left of the right box
      ctx.lineTo(size * 0.4, -size * 0.4);
      // To top-right of the right box
      ctx.lineTo(size, -size * 0.4);
      // Down the right side of the right box
      ctx.lineTo(size, size * 0.4);
      // To bottom-left of the right box
      ctx.lineTo(size * 0.4, size * 0.4);
      // Diagonal transition up to bottom-right of the left box
      ctx.lineTo(-size * 0.4, size * 0.8);
      // To bottom-left of the left box
      ctx.lineTo(-size, size * 0.8);
      // Back to top-left of the left box to close
      ctx.closePath();
      
      ctx.fill();
      ctx.stroke();

      // Draw exactly ONE lightning bolt in the middle of the whole body
      {
        const cxLocal = 0; // Exactly in the middle of the transition
        const cyLocal = 0;
        const bzLocal = 11; // Standard bolt size for high contrast and clear visibility
        ctx.save();
        ctx.translate(cxLocal, cyLocal);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(bzLocal * 0.1, -bzLocal * 0.5);
        ctx.lineTo(-bzLocal * 0.3, bzLocal * 0.1);
        ctx.lineTo(0, bzLocal * 0.1);
        ctx.lineTo(-bzLocal * 0.1, bzLocal * 0.5);
        ctx.lineTo(bzLocal * 0.3, -bzLocal * 0.1);
        ctx.lineTo(0, -bzLocal * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      break;
    }
    case "stumpfschweissnaht":
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.7);
      ctx.lineTo(0, size * 0.7);
      ctx.stroke();
      break;
    case "t_stk":
    case "bogen": {
      if (!checkMuffe && !hideCenterDot) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(5, strokeWidth * 1.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case "elektroschweissmuffe":
      if (isPreview) {
        ctx.beginPath();
        ctx.rect(-size * 1.2, -size * 0.8, size * 2.4, size * 1.6);
        ctx.moveTo(size * 0.2, -size * 0.4);
        ctx.lineTo(-size * 0.2, size * 0.1);
        ctx.lineTo(size * 0.2, size * 0.1);
        ctx.lineTo(-size * 0.2, size * 0.5);
        ctx.stroke();
      }
      break;
    case "schweiss_t_stk_2_muffig":
    case "schweiss_t_stk_3_muffig":
      break;
    case "ut_radial": {
      // Unterteil = gefuellter Kreis (wie im Oberteil), ~25% groesser, mittig am Leitungsende (0,0)
      const utR = size * 1.02 * 1.25;
      ctx.beginPath();
      ctx.arc(0, 0, utR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const utOldFill = ctx.fillStyle;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.4 * 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = utOldFill;
      break;
    }

    default:
      break;
  }
}

