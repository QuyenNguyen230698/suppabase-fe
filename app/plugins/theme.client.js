// Client-only plugin that initializes theme/density/motion ASAP after hydration.
// We touch the composable once to trigger ensureInitialized().
export default defineNuxtPlugin(() => {
  useTheme()
})
