/**
 * 验证转盘动画落点正确性的独立脚本。
 * 运行: node verify_spin.js
 */

const PI = Math.PI;
const TAU = 2 * PI;
const POINTER = -PI / 2; // pointer at top

function norm(a) {
  return ((a % TAU) + TAU) % TAU;
}

// 模拟 computeAngles（与 Wheel.tsx 逻辑一致）
function computeAngles(options) {
  const MIN = (16 * PI) / 180;
  const n = options.length;
  const total = options.reduce((s, o) => s + o.weight, 0);
  let angles = options.map((o) => Math.max((o.weight / total) * TAU, MIN));
  const sum = angles.reduce((s, a) => s + a, 0);
  if (sum > TAU) angles = angles.map((a) => (a / sum) * TAU);
  return angles;
}

// 模拟一次转动：给定 startAngle 和 targetIndex，返回 endAngle 和
// 检测指针实际落在了哪个扇形上
function simulateSpin(options, startAngle, targetIndex) {
  const angles = computeAngles(options);

  // 计算目标扇形中心
  let acc = 0;
  for (let i = 0; i < targetIndex; i++) acc += angles[i];
  const sectorCenter = acc + angles[targetIndex] / 2;
  const desiredNorm = norm(POINTER - sectorCenter);

  const startNorm = norm(startAngle);
  let deltaMod = (desiredNorm - startNorm + TAU) % TAU;
  if (deltaMod < 0) deltaMod += TAU;

  const endAngle = startAngle + TAU * 10 + deltaMod; // 10 full rotations + delta
  const endNorm = norm(endAngle);

  // 检测指针（POINTER）落在哪个扇形
  // 扇形 i 的世界坐标范围: [endAngle + accum[i], endAngle + accum[i+1])
  let sectorAcc = 0;
  for (let i = 0; i < options.length; i++) {
    const start = norm(endAngle + sectorAcc);
    const end = norm(endAngle + sectorAcc + angles[i]);
    sectorAcc += angles[i];

    // 判断 POINTER 是否在这个扇形区间内
    const p = norm(POINTER);
    if (start <= end) {
      if (p >= start && p < end) return { endAngle, landed: i };
    } else {
      // 跨越 0 的扇形
      if (p >= start || p < end) return { endAngle, landed: i };
    }
  }

  return { endAngle, landed: -1 };
}

// 测试
const options = [
  { weight: 95, color: '#f00' },
  { weight: 3, color: '#0f0' },
  { weight: 2, color: '#00f' },
];

console.log('=== 转盘落点验证 ===\n');
console.log('选项:', options.map((o, i) => `#${i}(权重${o.weight})`).join(', '));

let angle = 0;
let mismatches = 0;
const ITERATIONS = 50;

for (let i = 0; i < ITERATIONS; i++) {
  // 随机选目标
  const targetIdx = Math.floor(Math.random() * options.length);
  const { endAngle, landed } = simulateSpin(options, angle, targetIdx);

  const ok = landed === targetIdx;
  if (!ok) mismatches++;

  console.log(
    `  第${String(i + 1).padStart(2)}次: 目标=#${targetIdx}, 落点=#${landed}  ${ok ? '✓' : '✗ 不一致!'}`
  );

  angle = endAngle;
}

console.log(`\n结果: ${ITERATIONS - mismatches}/${ITERATIONS} 一致, ${mismatches} 不一致`);
console.log(mismatches === 0 ? '✅ 全部通过' : '❌ 存在不一致');
