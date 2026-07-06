import { useRef, useEffect, useCallback } from 'react';
import { t } from '../i18n';
import type { SpinOption } from '../types';
import { playTick } from '../utils/sound';

interface WheelProps {
  options: SpinOption[];
  spinTargetId: string | null;
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

function truncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number
): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '...').width > maxW) t = t.slice(0, -1);
  return t + '...';
}

function norm(a: number): number {
  return ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

/** LOCK POINT 4 helper: which sector is under the pointer (top, -PI/2) at a given angle? */
function getIndexFromAngle(
  angle: number,
  angles: number[],
  options: SpinOption[]
): number {
  // Pointer is at -PI/2 (12 o'clock). The sector at this position:
  // Sector i spans [angle + sum(angles[0..i-1]), angle + sum(angles[0..i]))
  // Check which sector contains -PI/2
  const pointer = norm(-Math.PI / 2);
  let acc = norm(angle);
  for (let i = 0; i < angles.length; i++) {
    const start = acc;
    const end = norm(acc + angles[i]);
    // Handle wrap-around
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
  onSpinStart,
  onSpinEnd,
  onAngleChange,
}: WheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const spinningRef = useRef(false);
  const animIdRef = useRef(0);
  const frozenRef = useRef<SpinOption[] | null>(null);

  // LOCK POINT 1: pre-computed target index, set before rAF, never mutated during animation
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
      const r = size / 2 - 6;

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
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const mid = start + a / 2;
        const textR = r * 0.62;
        const tx = cx + Math.cos(mid) * textR;
        const ty = cy + Math.sin(mid) * textR;

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(mid + Math.PI / 2);

        const fontSize = Math.max(10, Math.min(a * r * 0.28, 16));
        ctx.font = `bold ${fontSize}px "PingFang SC","Microsoft YaHei",sans-serif`;
        ctx.fillStyle = contrastColor(opt.color);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const nameMax = textR * 0.55;
        ctx.fillText(truncate(ctx, opt.name, nameMax), 0, -fontSize * 0.45);
        ctx.font = `${fontSize * 0.72}px "PingFang SC","Microsoft YaHei",sans-serif`;
        ctx.fillText(`${t('wheelWeight')}:${opt.weight}`, 0, fontSize * 0.65);
        ctx.restore();

        start = end;
      });

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const hubR = r * 0.1;
      const grad = ctx.createRadialGradient(
        cx - hubR * 0.3,
        cy - hubR * 0.3,
        hubR * 0.1,
        cx,
        cy,
        hubR
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#cbd5e1');
      ctx.beginPath();
      ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    },
    [options]
  );

  useEffect(() => {
    if (!spinningRef.current) {
      draw(angleRef.current);
    }
  }, [options, draw]);

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

    // ---- LOCK POINT 1: freeze everything BEFORE rAF ----
    const snapshot = options.map((o) => ({ ...o }));
    frozenRef.current = snapshot;

    const targetIdx = snapshot.findIndex((o) => o.id === spinTargetId);
    if (targetIdx < 0) {
      frozenRef.current = null;
      return;
    }

    // Store pre-computed result in refs (never modified during animation)
    resultIndexRef.current = targetIdx;
    resultIdRef.current = spinTargetId;

    const angles = computeAngles(snapshot);

    console.log(
      '[LOCK1] Pre-computed | targetIdx:', targetIdx,
      '| option:', snapshot[targetIdx].name,
      '| options:', snapshot.map(o => o.name).join(', ')
    );

    // ---- LOCK POINT 2: angle math ----
    // Pointer is at -PI/2 (12 o'clock). Sector i spans [angle+sum(angles[0..i-1]), angle+sum(angles[0..i]))
    // We want sector targetIdx center = pointer at -PI/2
    let acc = 0;
    for (let i = 0; i < targetIdx; i++) acc += angles[i];
    const sectorCenter = acc + angles[targetIdx] / 2;
    const desiredNorm = norm(-Math.PI / 2 - sectorCenter);

    console.log(
      '[LOCK2] Angle calc | sectorCenter:', (sectorCenter * 180 / Math.PI).toFixed(1) + ' deg',
      '| desiredNorm:', (desiredNorm * 180 / Math.PI).toFixed(1) + ' deg'
    );

    // FIX: integer number of FULL rotations (2PI each)
    const numRotations = 6 + Math.floor(Math.random() * 5); // 6..10
    const fullRotations = 2 * Math.PI * numRotations;

    const startAngle = angleRef.current;
    const startNorm = norm(startAngle);
    const deltaMod = norm(desiredNorm - startNorm);
    const targetAngle = startAngle + fullRotations + deltaMod;

    console.log(
      '[LOCK2] Target | startAngle:', (startNorm * 180 / Math.PI).toFixed(1) + ' deg',
      '| rotations:', numRotations,
      '| delta:', (deltaMod * 180 / Math.PI).toFixed(1) + ' deg',
      '| targetAngle:', (norm(targetAngle) * 180 / Math.PI).toFixed(1) + ' deg (norm)'
    );

    const duration = 3500 + Math.random() * 2500;
    const startTime = performance.now();

    // ---- LOCK POINT 3: all animation values via refs/closure constants ----
    spinningRef.current = true;
    onSpinStart();

    let lastTick = 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      // Uses only closure constants (startAngle, targetAngle) + ref (angleRef)
      const angle = startAngle + (targetAngle - startAngle) * eased;
      angleRef.current = angle;
      onAngleChange(angle);
      draw(angle);

      const speed = 1 - t;
      // speed 1→0: tickGap 30→190, fast=密集 slow=稀疏
      const tickGap = 190 - speed * 160;
      if (elapsed - lastTick > tickGap) {
        playTick();
        lastTick = elapsed;
      }

      if (t < 1) {
        animIdRef.current = requestAnimationFrame(animate);
      } else {
        // ---- LOCK POINT 4: brake check ----
        spinningRef.current = false;
        frozenRef.current = null;
        angleRef.current = targetAngle;

        const finalNorm = norm(targetAngle);
        const visualIndex = getIndexFromAngle(finalNorm, angles, snapshot);
        const logicalIndex = resultIndexRef.current;

        console.log(
          '[LOCK4] Brake check | finalAngle:', (finalNorm * 180 / Math.PI).toFixed(1) + ' deg',
          '| visualIndex:', visualIndex, '(' + snapshot[visualIndex]?.name + ')',
          '| logicalIndex:', logicalIndex, '(' + snapshot[logicalIndex]?.name + ')',
          visualIndex === logicalIndex ? '| MATCH' : '| MISMATCH — CORRECTING'
        );

        if (visualIndex !== logicalIndex) {
          // Force-correct: recompute the correct angle and redraw
          let correctAcc = 0;
          for (let i = 0; i < logicalIndex; i++) correctAcc += angles[i];
          const correctSectorCenter = correctAcc + angles[logicalIndex] / 2;
          const correctedNorm = norm(-Math.PI / 2 - correctSectorCenter);
          const correctedAngle = startAngle + fullRotations + norm(correctedNorm - startNorm);
          angleRef.current = correctedAngle;
          draw(correctedAngle);
          console.log('[LOCK4] Force-corrected to:', (norm(correctedAngle) * 180 / Math.PI).toFixed(1) + ' deg');
        }

        onAngleChange(angleRef.current);
        // Pass the ID from the ref — never from closure
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
