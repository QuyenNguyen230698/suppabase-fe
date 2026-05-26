<template>
  <div class="ps-wrap">
    <div class="ps-bar">
      <div v-for="i in 4" :key="i" class="ps-seg" :class="[segClass(i)]"></div>
    </div>
    <span class="ps-label" :class="strength.cls">{{ strength.label }}</span>
  </div>
</template>

<script setup>
const props = defineProps({ password: { type: String, default: '' } })

const strength = computed(() => {
  const p = props.password || ''
  if (!p)                    return { score: 0, label: '',         cls: '' }
  if (p.length < 8)          return { score: 1, label: 'Too short', cls: 'weak' }
  let score = 1
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++
  if (/\d/.test(p))           score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  if (p.length >= 14)         score = Math.min(4, score + 1)
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const cls    = ['',  'weak','fair','good','strong'][score]
  return { score, label: labels[score], cls }
})

function segClass(i) {
  return i <= strength.value.score ? strength.value.cls : ''
}
</script>

<style scoped>
.ps-wrap { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.ps-bar { display: flex; gap: 3px; flex: 1; }
.ps-seg {
  flex: 1;
  height: 3px;
  background: rgba(255,255,255,0.06);
  border-radius: 2px;
  transition: background .2s;
}
.ps-seg.weak   { background: #f87171; }
.ps-seg.fair   { background: #fbbf24; }
.ps-seg.good   { background: #4ade80; }
.ps-seg.strong { background: var(--accent); }
.ps-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  min-width: 50px;
  text-align: right;
}
.ps-label.weak   { color: #f87171; }
.ps-label.fair   { color: #fbbf24; }
.ps-label.good   { color: #4ade80; }
.ps-label.strong { color: var(--accent); }
</style>
