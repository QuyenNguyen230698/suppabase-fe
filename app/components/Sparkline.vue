<template>
  <div class="spark">
    <span v-if="label" class="spark-label">{{ label }}</span>
    <svg :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" :class="colorClass">
      <polyline :points="points" fill="none" stroke="currentColor" stroke-width="1.4" />
      <polygon :points="`0,${height} ${points} ${width},${height}`" :class="['spark-fill', colorClass]" />
    </svg>
    <span v-if="data.length" class="spark-last">{{ humanize(data[data.length - 1]) }}</span>
  </div>
</template>

<script setup>
const props = defineProps({
  data:       { type: Array, default: () => [] },
  max:        { type: Number, default: 1 },
  label:      { type: String, default: '' },
  colorClass: { type: String, default: '' }, // 'in' | 'out' | ''
})

const width  = 320
const height = 48

const points = computed(() => {
  if (!props.data.length) return ''
  const n = props.data.length
  return props.data.map((v, i) => {
    const x = (i / (n - 1 || 1)) * width
    const y = height - (v / props.max) * (height - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})

function humanize(n) {
  if (n == null) return '0'
  if (n < 1000)      return String(n)
  if (n < 1_000_000) return (n/1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return (n/1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
}
</script>

<style scoped>
.spark { display: flex; align-items: center; gap: 12px; }
.spark + .spark { margin-top: 8px; }
.spark-label {
  font-family: var(--font-mono); font-size: 10px;
  color: var(--fg-mute);
  width: 50px;
  flex-shrink: 0;
}
.spark svg {
  flex: 1; min-width: 0;
  height: 48px;
  color: var(--accent);
}
.spark svg.in  { color: var(--accent); }
.spark svg.out { color: var(--info); }

.spark-fill         { fill: color-mix(in oklab, var(--accent) 12%, transparent); }
.spark-fill.in      { fill: color-mix(in oklab, var(--accent) 12%, transparent); }
.spark-fill.out     { fill: color-mix(in oklab, var(--info) 12%, transparent); }

.spark-last {
  font-family: var(--font-mono); font-size: 11px;
  color: var(--fg);
  min-width: 48px; text-align: right;
}
</style>
