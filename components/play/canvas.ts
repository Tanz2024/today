// Small canvas helpers shared by the Play games. Drawn by hand rather than
// with ctx.roundRect so older mobile browsers render the same shapes.
export function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function fillRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

export const PLAY_COLORS = {
  paper: "#f6f4ef",
  ink: "#111111",
  inkSoft: "#5c5f66",
  line: "#d9d5cc",
  electric: "#2563eb",
  hazard: "#d6453d",
} as const;

// ---------------------------------------------------------------------------
// Story tokens: the collectible every game shares. A white disc with a blue
// ring and a hand-drawn glyph per theme, so each reads without colour alone.
// ---------------------------------------------------------------------------
export function drawStoryToken(ctx: CanvasRenderingContext2D, theme: string, cx: number, cy: number, radius = 11) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = PLAY_COLORS.electric;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.translate(cx, cy);
  const s = radius / 11;
  ctx.scale(s, s);
  ctx.strokeStyle = PLAY_COLORS.ink;
  ctx.fillStyle = PLAY_COLORS.ink;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  switch (theme) {
    case "cafe":
      ctx.rect(-5, -2, 8, 7);
      ctx.moveTo(3, 0); ctx.arc(3.5, 1.5, 2, -Math.PI / 2, Math.PI / 2);
      ctx.moveTo(-3, -4); ctx.lineTo(-2, -6.5); ctx.moveTo(0.5, -4); ctx.lineTo(1.5, -6.5);
      ctx.stroke();
      break;
    case "music":
      ctx.arc(-2.5, 3.5, 2.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-0.3, 3.5); ctx.lineTo(-0.3, -5.5); ctx.lineTo(4, -3.5); ctx.stroke();
      break;
    case "travel":
      ctx.moveTo(-6, 1); ctx.lineTo(6, -1); ctx.moveTo(1, -1); ctx.lineTo(-2, -6); ctx.moveTo(1, 0); ctx.lineTo(-2, 5.5); ctx.moveTo(-5, 1); ctx.lineTo(-6.5, -2);
      ctx.stroke();
      break;
    case "heart":
      ctx.moveTo(0, 5.5); ctx.bezierCurveTo(-7, 0, -4.5, -6.5, 0, -2.5); ctx.bezierCurveTo(4.5, -6.5, 7, 0, 0, 5.5); ctx.fill();
      break;
    case "style":
      ctx.moveTo(0, -6.5); ctx.quadraticCurveTo(0.8, -0.8, 6.5, 0); ctx.quadraticCurveTo(0.8, 0.8, 0, 6.5); ctx.quadraticCurveTo(-0.8, 0.8, -6.5, 0); ctx.quadraticCurveTo(-0.8, -0.8, 0, -6.5); ctx.fill();
      break;
    case "money":
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.stroke();
      ctx.font = "700 8px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("$", 0, 0.5);
      break;
    case "campus":
      ctx.moveTo(0, -3.5); ctx.lineTo(-6, -5); ctx.lineTo(-6, 4); ctx.lineTo(0, 5.5); ctx.lineTo(6, 4); ctx.lineTo(6, -5); ctx.lineTo(0, -3.5); ctx.lineTo(0, 5.5);
      ctx.stroke();
      break;
    default: // games
      roundedRectPath(ctx, -6.5, -3.5, 13, 8, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, 0.5); ctx.lineTo(-1.5, 0.5); ctx.moveTo(-2.75, -0.75); ctx.lineTo(-2.75, 1.75); ctx.stroke();
      ctx.beginPath(); ctx.arc(3, 0.5, 1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// "Brisa": the Play character — a blue story tile with a bold B monogram and a
// folded page corner. Drawn at its hitbox size; `lift` raises it off the ground.
export function drawBrisa(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const fold = Math.min(w, h) * 0.32;
  ctx.save();
  ctx.fillStyle = PLAY_COLORS.electric;
  ctx.beginPath();
  ctx.moveTo(x + 4, y);
  ctx.lineTo(x + w - fold, y);
  ctx.lineTo(x + w, y + fold);
  ctx.lineTo(x + w, y + h - 4);
  ctx.arcTo(x + w, y + h, x + w - 4, y + h, 4);
  ctx.lineTo(x + 4, y + h);
  ctx.arcTo(x, y + h, x, y + h - 4, 4);
  ctx.lineTo(x, y + 4);
  ctx.arcTo(x, y, x + 4, y, 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#9fbaf7";
  ctx.beginPath();
  ctx.moveTo(x + w - fold, y);
  ctx.lineTo(x + w - fold, y + fold);
  ctx.lineTo(x + w, y + fold);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${Math.round(h * 0.62)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("B", x + w * 0.44, y + h * 0.56);
  ctx.restore();
}
