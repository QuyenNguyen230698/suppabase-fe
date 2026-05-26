// Polls GET /api/admin/ai-usage every 30s while a consumer is mounted, so
// the topbar context meter can show "neurons_used / daily_limit" live.
//
// Shared state — multiple components calling useDailyNeurons() share one poller.

// Rolling 24h window (not UTC calendar day). The server computes
// next_partial_reset / next_full_reset based on the oldest/newest request still
// in the window; we keep both ISO timestamps + a derived seconds value so the
// UI can show a live countdown without recomputing on the server every tick.
const state = ref({
  used: 0,
  limit: 10000,
  remaining: 10000,
  percent: 0,
  is_over_quota: false,
  next_partial_reset_at: null,
  next_full_reset_at: null,
  seconds_to_partial_reset: null,
  seconds_to_full_reset: null,
})
let refCount = 0
let timer = null

export function useDailyNeurons() {
  const { apiFetch } = useApi()

  async function fetchOnce() {
    try {
      const data = await apiFetch('/api/admin/ai-usage', { _skipLoader: true })
      const t = data?.today
      if (t) {
        state.value = {
          used: t.neurons_used || 0,
          limit: t.neurons_limit || 10000,
          remaining: t.neurons_remaining || 0,
          percent: t.percent_used || 0,
          // is_over_quota is the new field; fall back to legacy should_fallback.
          is_over_quota: t.is_over_quota ?? t.should_fallback ?? false,
          next_partial_reset_at: t.next_partial_reset || null,
          next_full_reset_at: t.next_full_reset || null,
          seconds_to_partial_reset: t.seconds_to_partial_reset ?? null,
          seconds_to_full_reset: t.seconds_to_full_reset ?? null,
        }
      }
    } catch { /* ignore — keep last known */ }
  }

  function start() {
    refCount += 1
    if (refCount === 1) {
      fetchOnce()
      timer = setInterval(fetchOnce, 30000)
    }
  }

  function stop() {
    refCount = Math.max(0, refCount - 1)
    if (refCount === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onMounted(start)
  onUnmounted(stop)

  return { daily: state, refresh: fetchOnce }
}
