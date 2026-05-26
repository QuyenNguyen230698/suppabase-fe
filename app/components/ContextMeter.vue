<template>
  <div class="ctx-meter" :title="tooltip">
    <!-- Tokens used vs context window -->
    <div class="meter-group">
      <div class="ctx-bar">
        <div class="ctx-fill" :class="tokenStatus" :style="{ width: tokenPct + '%' }"></div>
      </div>
      <span class="ctx-text">{{ tokens.toLocaleString() }} / {{ ctxWindow.toLocaleString() }} tok</span>
    </div>

    <span class="dot-sep">•</span>

    <!-- Neurons used vs rolling-24h limit -->
    <div class="meter-group">
      <div class="ctx-bar">
        <div class="ctx-fill" :class="neuronStatus" :style="{ width: neuronPct + '%' }"></div>
      </div>
      <span class="ctx-text" :class="{ over: isOverQuota }">
        {{ formatNeurons(neuronsUsed) }} / {{ neuronsLimit.toLocaleString() }} neurons
      </span>
      <!-- Inline reset countdown — text content is updated imperatively by
           the 15s ticker via the ref below so the surrounding meter doesn't
           re-render every tick. The initial value is set from props the
           first time it renders. -->
      <span v-if="showCountdown" ref="countdownEl" class="ctx-countdown" :class="{ over: isOverQuota }">
        · {{ buildCountdownLabel() }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  tokens:        { type: Number, default: 0 },
  ctxWindow:     { type: Number, default: 4096 },
  neuronsUsed:   { type: Number, default: 0 },
  neuronsLimit:  { type: Number, default: 10000 },

  // New rolling-window props from /api/admin/ai-usage. All optional so legacy
  // callers passing only the four above keep working.
  isOverQuota:           { type: Boolean, default: false },
  secondsToPartialReset: { type: [Number, null], default: null },
  secondsToFullReset:    { type: [Number, null], default: null },
  nextPartialResetAt:    { type: [String, null], default: null },  // ISO
  nextFullResetAt:       { type: [String, null], default: null },  // ISO
})

// Countdown is rendered via direct DOM update on a template ref instead of
// a reactive `now` value. Reason: the previous reactive tick caused the
// entire topbar to re-render every 15s, which made the hover tooltip jump
// and the meter bars subtly re-paint. With a template ref we only touch a
// single text node — Vue isn't involved, nothing else re-renders.
const countdownEl = ref(null)
let tickerId = null

const tokenPct = computed(() =>
  Math.min(100, Math.round((props.tokens / Math.max(1, props.ctxWindow)) * 100))
)
const neuronPct = computed(() =>
  Math.min(100, Math.round((props.neuronsUsed / Math.max(1, props.neuronsLimit)) * 100))
)

function statusFor(pct) {
  if (pct > 90) return 'danger'
  if (pct > 70) return 'warn'
  return ''
}
const tokenStatus  = computed(() => statusFor(tokenPct.value))
const neuronStatus = computed(() => statusFor(neuronPct.value))

function formatNeurons(n) {
  if (n == null) return '0'
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (n >= 10)   return n.toFixed(1)
  return n.toFixed(2)
}

// Live recompute from absolute timestamps so the countdown is correct even if
// the page sat idle for a while and the server-supplied "seconds_to_*" is stale.
function liveSecondsTo(iso, fallbackSeconds) {
  if (iso) {
    const ms = new Date(iso).getTime() - Date.now()
    return Math.max(0, Math.floor(ms / 1000))
  }
  return typeof fallbackSeconds === 'number' ? fallbackSeconds : null
}
function livePartial() { return liveSecondsTo(props.nextPartialResetAt, props.secondsToPartialReset) }
function liveFull()    { return liveSecondsTo(props.nextFullResetAt,    props.secondsToFullReset) }

function formatDuration(seconds) {
  if (seconds == null) return '—'
  if (seconds <= 0) return 'sắp xong'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m} phút`
  return `< 1 phút`
}

// Show inline countdown when we're at risk (>80% used) or already over quota.
const showCountdown = computed(() => props.isOverQuota || neuronPct.value > 80)

function buildCountdownLabel() {
  const secs = livePartial()
  if (props.isOverQuota) return `mở lại sau ${formatDuration(secs)}`
  return `reset sau ${formatDuration(secs)}`
}

// Tooltip is recomputed on hover (mouseenter) instead of every reactive tick,
// so it stays stable while the user is reading it.
const tooltip = ref('')
function recomputeTooltip() {
  const lines = [
    `Context: ${props.tokens.toLocaleString()} / ${props.ctxWindow.toLocaleString()} tokens`,
    `Neurons (24h trượt): ${formatNeurons(props.neuronsUsed)} / ${props.neuronsLimit.toLocaleString()}`,
  ]
  if (props.isOverQuota) {
    lines.push(`⚠ Đã vượt quota — request CF sẽ bị chặn.`)
    const p = livePartial(); if (p != null) lines.push(`Mở lại 1 phần sau: ${formatDuration(p)}`)
    const f = liveFull();    if (f != null) lines.push(`Reset hoàn toàn sau: ${formatDuration(f)}`)
  } else if (neuronPct.value > 70) {
    const p = livePartial(); if (p != null) lines.push(`Reset 1 phần sau: ${formatDuration(p)}`)
  }
  lines.push('', 'Cloudflare Workers AI dùng cửa sổ 24h trượt, không reset theo giờ cố định.')
  tooltip.value = lines.join('\n')
}

// Tick the inline countdown by directly mutating the text node every 15s —
// no Vue reactivity, no topbar re-render. Tooltip is refreshed alongside but
// since `title=""` only reads on hover, the user never sees it flicker.
onMounted(() => {
  recomputeTooltip()
  tickerId = setInterval(() => {
    if (countdownEl.value && showCountdown.value) {
      countdownEl.value.textContent = `· ${buildCountdownLabel()}`
    }
    recomputeTooltip()
  }, 15000)
})
onBeforeUnmount(() => { if (tickerId) clearInterval(tickerId) })
</script>

<style scoped>
.ctx-meter {
  display: inline-flex; align-items: center; gap: 8px;
}
.meter-group {
  display: inline-flex; align-items: center; gap: 6px;
}
.ctx-bar {
  width: 56px;
  height: 4px;
  background: rgba(255,255,255,0.07);
  border-radius: 2px;
  overflow: hidden;
}
.ctx-fill {
  height: 100%;
  background: var(--accent);
  transition: width .2s ease;
}
.ctx-fill.warn   { background: var(--warn); }
.ctx-fill.danger { background: var(--danger); }
.ctx-text {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-mute);
  white-space: nowrap;
}
.ctx-text.over { color: var(--danger, #ff6b6b); }

.ctx-countdown {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--warn, #ffb46b);
  white-space: nowrap;
}
.ctx-countdown.over { color: var(--danger, #ff6b6b); }

.dot-sep {
  color: var(--fg-mute);
  opacity: 0.5;
  font-size: 10px;
}

@media (max-width: 768px) {
  /* Hide neurons group and separator, keep only token bar */
  .dot-sep { display: none; }
  .meter-group:nth-child(3) { display: none; }
  .ctx-text { font-size: 9.5px; }
}
</style>
