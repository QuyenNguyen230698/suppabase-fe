<template>
  <div class="chart" ref="wrap">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="chart-svg"
         @mousemove="onMove" @mouseleave="hover = null">
      <defs>
        <linearGradient v-for="s in series" :key="`g-${s.key}`" :id="`grad-${uid}-${s.key}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  :stop-color="s.color" stop-opacity="0.22" />
          <stop offset="100%" :stop-color="s.color" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- horizontal gridlines -->
      <line v-for="(gy, i) in gridYs" :key="`gl-${i}`"
            :x1="PAD_L" :x2="W - PAD_R" :y1="gy" :y2="gy" class="grid" />

      <!-- area + line per series -->
      <template v-for="s in series" :key="s.key">
        <path :d="areaPath(s)" :fill="`url(#grad-${uid}-${s.key})`" />
        <path :d="linePath(s)" fill="none" :stroke="s.color" stroke-width="2"
              stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
      </template>

      <!-- hover marker -->
      <template v-if="hover">
        <line :x1="hover.x" :x2="hover.x" :y1="PAD_T" :y2="H - PAD_B" class="cursor" />
        <circle v-for="s in series" :key="`pt-${s.key}`"
                :cx="hover.x" :cy="yOf(s.values[hover.i])" r="3.5"
                :fill="s.color" stroke="var(--bg-elev)" stroke-width="1.5" />
      </template>
    </svg>

    <!-- y-axis labels -->
    <div class="y-axis">
      <span v-for="(v, i) in yTicks" :key="`y-${i}`" :style="{ top: gridYsPct[i] + '%' }">{{ humanize(v) }}</span>
    </div>

    <!-- x-axis labels (first / mid / last) -->
    <div class="x-axis">
      <span v-for="(lbl, i) in xLabels" :key="`x-${i}`">{{ lbl }}</span>
    </div>

    <!-- tooltip -->
    <div v-if="hover" class="tip" :style="tipStyle">
      <div class="tip-date">{{ labels[hover.i] }}</div>
      <div v-for="s in series" :key="`t-${s.key}`" class="tip-row">
        <span class="tip-dot" :style="{ background: s.color }"></span>
        <span class="tip-name">{{ s.name }}</span>
        <span class="tip-val">{{ humanize(s.values[hover.i]) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
// Lightweight Google-Analytics-style area chart. No deps — pure SVG.
//   series: [{ key, name, color, values: number[] }]
//   labels: string[]  (x-axis category labels, same length as values)
const props = defineProps({
  series: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
})

const uid = Math.random().toString(36).slice(2, 8)
const W = 720, H = 240
const PAD_L = 8, PAD_R = 8, PAD_T = 14, PAD_B = 8   // inner padding within viewBox
const wrap = ref(null)
const hover = ref(null)   // { i, x }

const maxVal = computed(() => {
  let m = 1
  for (const s of props.series) for (const v of s.values) if (v > m) m = v
  // round up to a "nice" number so gridlines read cleanly
  return niceMax(m)
})

const n = computed(() => Math.max(1, props.labels.length))

function xOf(i) {
  const inner = W - PAD_L - PAD_R
  return PAD_L + (i / (n.value - 1 || 1)) * inner
}
function yOf(v) {
  const inner = H - PAD_T - PAD_B
  return PAD_T + inner - ((v || 0) / maxVal.value) * inner
}

function linePath(s) {
  if (!s.values.length) return ''
  return s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ')
}
function areaPath(s) {
  if (!s.values.length) return ''
  const line = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ')
  return `${line} L${xOf(s.values.length - 1).toFixed(1)},${(H - PAD_B).toFixed(1)} L${xOf(0).toFixed(1)},${(H - PAD_B).toFixed(1)} Z`
}

// 4 gridlines + baseline
const GRID = 4
const yTicks = computed(() => {
  const out = []
  for (let k = GRID; k >= 0; k--) out.push((maxVal.value / GRID) * k)
  return out
})
const gridYs   = computed(() => yTicks.value.map(v => yOf(v)))
const gridYsPct = computed(() => gridYs.value.map(y => (y / H) * 100))

const xLabels = computed(() => {
  const l = props.labels
  if (l.length <= 1) return l
  const mid = Math.floor((l.length - 1) / 2)
  return [l[0], l[mid], l[l.length - 1]]
})

function onMove(e) {
  const svg = e.currentTarget
  const rect = svg.getBoundingClientRect()
  const rel = (e.clientX - rect.left) / rect.width    // 0..1
  const i = Math.round(rel * (n.value - 1))
  const idx = Math.min(n.value - 1, Math.max(0, i))
  hover.value = { i: idx, x: xOf(idx) }
}

const tipStyle = computed(() => {
  if (!hover.value) return {}
  const leftPct = (hover.value.x / W) * 100
  // flip the tooltip to the left half once we pass the midpoint
  const flip = leftPct > 60
  return {
    left: leftPct + '%',
    transform: flip ? 'translate(-100%, 0)' : 'translate(0, 0)',
    marginLeft: flip ? '-10px' : '10px',
  }
})

function niceMax(m) {
  if (m <= 5) return 5
  const pow = Math.pow(10, Math.floor(Math.log10(m)))
  const norm = m / pow
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return step * pow
}

function humanize(v) {
  if (v == null) return '0'
  if (v < 1000) return String(Math.round(v))
  if (v < 1_000_000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
}
</script>

<style scoped>
.chart {
  position: relative;
  padding-left: 38px;   /* room for y-axis labels */
  padding-bottom: 20px; /* room for x-axis labels */
}
.chart-svg {
  display: block;
  width: 100%;
  height: 240px;
  overflow: visible;
}
.grid   { stroke: var(--line); stroke-width: 1; vector-effect: non-scaling-stroke; }
.cursor { stroke: var(--fg-faint); stroke-width: 1; stroke-dasharray: 3 3; vector-effect: non-scaling-stroke; }

.y-axis {
  position: absolute;
  left: 0; top: 0; bottom: 20px; width: 34px;
  pointer-events: none;
}
.y-axis span {
  position: absolute;
  right: 0;
  transform: translateY(-50%);
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--fg-faint);
}
.x-axis {
  position: absolute;
  left: 38px; right: 0; bottom: 0;
  display: flex; justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--fg-faint);
}

.tip {
  position: absolute;
  top: 6px;
  z-index: 5;
  pointer-events: none;
  background: var(--glass-bg-pop, var(--bg-elev));
  border: 1px solid var(--line-2);
  border-radius: 9px;
  padding: 8px 10px;
  box-shadow: var(--shadow-island);
  min-width: 128px;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}
.tip-date {
  font-family: var(--font-mono);
  font-size: 10px; color: var(--fg-mute);
  margin-bottom: 6px;
}
.tip-row { display: flex; align-items: center; gap: 7px; font-size: 11.5px; }
.tip-row + .tip-row { margin-top: 3px; }
.tip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.tip-name { color: var(--fg-dim); flex: 1; }
.tip-val { font-family: var(--font-mono); color: var(--fg); font-weight: 600; }
</style>
