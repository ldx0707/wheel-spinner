import { useRef, useEffect, useCallback } from 'react';
import { t } from '../i18n';
import type { SpinOption } from '../types';
import { playTick } from '../utils/sound';

interface WheelProps {
  options: SpinOption[];
  spinTargetId: string | null;
  showWeights: boolean;
  showPercentages: boolean;
  onSpinStart: () => void;
  onSpinEnd: (optionId: string) => void;
  onAngleChange: (angle: number) => void;
}

const MIN_SECTOR_DEG = 16;

function computeAngles(options: SpinOption[]): number[] {
  const n = options.length;
  if (n === 0) return [];
  const MIN = (MIN_SECTOR_DEG * Math.PI) / 180;
  const total = options.reduce((s, o) => s + o.weight, 0);
  if (total === 0) return options.map(() => (2 * Math.PI) / n);

  let angles = options.map((o) => Math.max((o.weight / total) * 2 * Math.PI, MIN));
  const sum = angles.reduce((s, a) => s + a, 0);
  if (sum > 2 * Math.PI) angles = angles.map((a) => (a / sum) * 2 * Math.PI);
  return angles;
}

function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1e293b' : '#ffffff';
}

/** Wrap text into lines that fit within maxWidth at given fontSize */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
): string[] {
  ctx.font = `bold ${fontSize}px "PingFang SC","Microsoft YaHei",sans-serif`;
  const chars = [...text];
  const lines: string[] = [];
  let cur = '';
  for (const ch of chars) {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxWidth && cur.length > 0) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length === 0) lines.push(text);
  return lines;
}

function norm(a: number): number {
  return ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

function getIndexFromAngle(
  angle: number,
  angles: number[],
): number {
  const pointer = norm(-Math.PI / 2);
  let acc = norm(angle);
  for (let i = 0; i < angles.length; i++) {
    const start = acc;
    const end = norm(acc + angles[i]);
    if (start <= end) {
      if (pointer >= start && pointer < end) return i;
    } else {
      if (pointer >= start || pointer < end) return i;
    }
    acc = end;
  }
  return 0;
}

export function Wheel({
  options,
  spinTargetId,
  showWeights,
  showPercentages,
  onSpinStart,
  onSpinEnd,
  onAngleChange,
}: WheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const spinningRef = useRef(false);
  const animIdRef = useRef(0);
  const frozenRef = useRef<SpinOption[] | null>(null);

  const resultIndexRef = useRef<number>(-1);
  const resultIdRef = useRef<string | null>(null);

  const draw = useCallback(
    (angle: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2 - 8;

      const drawOptions = frozenRef.current || options;

      ctx.clearRect(0, 0, size, size);

      if (drawOptions.length === 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${size * 0.045}px "PingFang SC","Microsoft YaHei",sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t('wheelEmpty'), cx, cy);
        return;
      }

      // Wheel shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.restore();

      const angles = computeAngles(drawOptions);
      const totalWeight = drawOptions.reduce((s, o) => s + o.weight, 0);
      let start = angle;

      angles.forEach((a, i) => {
        const end = start + a;
        const opt = drawOptions[i];

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, start, end);
        ctx.closePath();
        ctx.fillStyle = opt.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        const mid = start + a / 2;
        const textR = r * 0.58;

        ctx.save();
        ctx.translate(cx + Math.cos(mid) * textR, cy + Math.sin(mid) * textR);
        ctx.rotate(mid + Math.PI / 2);
        ctx.fillStyle = contrastColor(opt.color);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Arc width at text radius = available width for text (tangential)
        const arcW = a * textR;
        // Radial space from textR inward toward center (minus hub area)
        const hubR = r * 0.11;
        const radialSpace = r - textR - hubR;
        const maxRadialH = radialSpace * 0.85;

        // Conservative initial font size based on both sector size and radial space
        const baseSz = Math.min(a * r * 0.3, radialSpace * 0.55, 15);

        let fontSize = Math.max(7, baseSz);
        let lines: string[] = [opt.name];
        let lineH = fontSize * 1.3;

        // Iteratively reduce font size until text fits
        for (let attempt = 0; attempt < 6; attempt++) {
          const maxTextW = arcW * 0.9;
          lines = wrapText(ctx, opt.name, maxTextW, fontSize);
          lineH = fontSize * 1.25;
          const weightLines = (showWeights ? 1 : 0) + (showPercentages ? 1 : 0);
          const totalH = (lines.length + weightLines) * lineH;

          if (totalH <= maxRadialH || fontSize <= 7) break;
          fontSize = Math.max(7, fontSize * 0.78);
        }

        // Final clamp
        fontSize = Math.max(7, Math.min(fontSize, 14));
        lineH = fontSize * 1.25;

        // Recompute lines with final font size
        const maxTextW = arcW * 0.9;
        lines = wrapText(ctx, opt.name, maxTextW, fontSize);

        const weightLines = (showWeights ? 1 : 0) + (showPercentages ? 1 : 0);
        const totalLines = lines.length + weightLines;
        const totalH = (totalLines - 1) * lineH;

        ctx.font = `bold ${fontSize}px "PingFang SC","Microsoft YaHei",sans-serif`;
        for (let li = 0; li < lines.length; li++) {
          const y = -totalH / 2 + li * lineH + lineH / 2;
          ctx.fillText(lines[li], 0, y);
        }

        if (showWeights) {
          const wSz = Math.max(7, fontSize * 0.7);
          ctx.font = `${wSz}px "PingFang SC","Microsoft YaHei",sans-serif`;
          const wy = -totalH / 2 + lines.length * lineH + lineH / 2;
          ctx.fillText(`${opt.weight}`, 0, wy);
        }

        if (showPercentages) {
          const pct = totalWeight > 0 ? (opt.weight / totalWeight * 100) : 0;
          const pctText = pct >= 10 ? pct.toFixed(1) + '%' : pct.toFixed(2) + '%';
          const pSz = Math.max(7, fontSize * 0.7);
          ctx.font = `${pSz}px "PingFang SC","Microsoft YaHei",sans-serif`;
          const prevLines = lines.length + (showWeights ? 1 : 0);
          const py = -totalH / 2 + prevLines * lineH + lineH / 2;
          ctx.fillText(pctText, 0, py);
        }

        ctx.restore();
        start = end;
      });

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Center hub
      const hubR2 = r * 0.09;
      const grad = ctx.createRadialGradient(
        cx - hubR2 * 0.3,
        cy - hubR2 * 0.3,
        hubR2 * 0.1,
        cx,
        cy,
        hubR2
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#cbd5e1');
      ctx.beginPath();
      ctx.arc(cx, cy, hubR2, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    },
    [options, showWeights, showPercentages]
  );

  useEffect(() => {
    if (!spinningRef.current) {
      draw(angleRef.current);
    }
  }, [options, showWeights, showPercentages, draw]);

  useEffect(() => {
    const onResize = () => {
      if (!spinningRef.current) draw(angleRef.current);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  // ===== SPIN ANIMATION =====
  useEffect(() => {
    if (spinTargetId === null || options.length === 0) return;

    const snapshot = options.map((o) => ({ ...o }));
    frozenRef.current = snapshot;

    const targetIdx = snapshot.findIndex((o) => o.id === spinTargetId);
    if (targetIdx < 0) {
      frozenRef.current = null;
      return;
    }

    resultIndexRef.current = targetIdx;
    resultIdRef.current = spinTargetId;

    const angles = computeAngles(snapshot);

    let acc = 0;
    for (let i = 0; i < targetIdx; i++) acc += angles[i];
    const sectorCenter = acc + angles[targetIdx] / 2;
    const desiredNorm = norm(-Math.PI / 2 - sectorCenter);

    const numRotations = 6 + Math.floor(Math.random() * 5);
    const fullRotations = 2 * Math.PI * numRotations;

    const startAngle = angleRef.current;
    const startNorm = norm(startAngle);
    const deltaMod = norm(desiredNorm - startNorm);
    const targetAngle = startAngle + fullRotations + deltaMod;

    const duration = 3500 + Math.random() * 2500;
    const startTime = performance.now();

    spinningRef.current = true;
    onSpinStart();

    let lastTick = 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      const angle = startAngle + (targetAngle - startAngle) * eased;
      angleRef.current = angle;
      onAngleChange(angle);
      draw(angle);

      // Tick sound: slower = more spaced out
      const speed = 1 - t;
      const tickGap = 190 - speed * 160;
      if (elapsed - lastTick > tickGap) {
        playTick();
        lastTick = elapsed;
      }

      if (t < 1) {
        animIdRef.current = requestAnimationFrame(animate);
      } else {
        spinningRef.current = false;
        frozenRef.current = null;
        angleRef.current = targetAngle;

        const finalNorm = norm(targetAngle);
        const visualIndex = getIndexFromAngle(finalNorm, angles);
        const logicalIndex = resultIndexRef.current;

        if (visualIndex !== logicalIndex) {
          let correctAcc = 0;
          for (let i = 0; i < logicalIndex; i++) correctAcc += angles[i];
          const correctSectorCenter = correctAcc + angles[logicalIndex] / 2;
          const correctedNorm = norm(-Math.PI / 2 - correctSectorCenter);
          const correctedAngle = startAngle + fullRotations + norm(correctedNorm - startNorm);
          angleRef.current = correctedAngle;
          draw(correctedAngle);
        }

        onAngleChange(angleRef.current);
        onSpinEnd(resultIdRef.current!);
      }
    };

    animIdRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      frozenRef.current = null;
    };
  }, [spinTargetId, options, draw, onSpinStart, onSpinEnd, onAngleChange]);

  return (
    <div className="wheel-wrapper">
      <div className="wheel-pointer" />
      <canvas ref={canvasRef} className="wheel-canvas" />
    </div>
  );
}

export { computeAngles };
