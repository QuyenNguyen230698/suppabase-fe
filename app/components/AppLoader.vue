<template>
  <Transition name="loader">
    <div v-if="show" class="loading-screen" aria-live="polite" aria-label="Loading">

      <!-- Stars -->
      <div class="stars">
        <span v-for="i in 16" :key="i" class="star" :style="starStyle(i)" />
      </div>

      <!-- Grid perspective -->
      <div class="grid-lines-wrapper">
        <div class="grid-plane"></div>
      </div>

      <!-- Center content -->
      <div class="center-content">
        <div class="logo-wrapper">
          <div class="brand-mark">
            <div class="brand-inner" />
          </div>
        </div>
        <h1 class="brand-name">Suppabase</h1>
        <p class="tagline">{{ message }}</p>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" />
        </div>
      </div>

    </div>
  </Transition>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  message: { type: String, default: 'Loading…' },
})

function starStyle(i) {
  const seed = i * 137.508
  const x = (Math.sin(seed) * 0.5 + 0.5) * 100
  const y = (Math.cos(seed * 1.3) * 0.5 + 0.5) * 100
  const size = 4 + (i % 3) * 3
  const delay = (i % 7) * 0.3
  const duration = 2 + (i % 4)
  return {
    left: `${x}%`,
    top: `${y}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  }
}
</script>

<style scoped>
/* Transition */
.loader-enter-active { transition: opacity .2s ease; }
.loader-leave-active { transition: opacity .4s ease; }
.loader-enter-from,
.loader-leave-to { opacity: 0; }

.loading-screen {
  position: fixed;
  inset: 0;
  background: linear-gradient(160deg, #047857 0%, #0f766e 40%, #4d7c0f 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 9999;
  font-family: "Geist", ui-sans-serif, system-ui, -apple-system, sans-serif;
}

/* Stars */
.stars {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.star {
  position: absolute;
  background: rgba(255, 255, 255, 0.6);
  clip-path: polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%);
  animation: twinkle ease-in-out infinite;
}
@keyframes twinkle {
  0%, 100% { opacity: 0.1; transform: scale(0.8) rotate(0deg); }
  50%       { opacity: 0.7; transform: scale(1.2) rotate(45deg); }
}

/* Grid */
.grid-lines-wrapper {
  position: absolute;
  inset: 0;
  perspective: 600px;
  perspective-origin: 50% 40%;
  z-index: 0;
}
.grid-plane {
  position: absolute;
  top: 30%;
  left: 25%;
  right: 25%;
  width: 50%;
  height: 100%;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;
  transform: rotateX(70deg);
  transform-origin: top center;
  mask-image: linear-gradient(to bottom,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 1) 30%,
    rgba(0, 0, 0, 1) 100%
  );
}

/* Content */
.center-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 10;
}
.logo-wrapper { margin-bottom: 4px; }

.brand-mark {
  width: 48px; height: 48px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 24px rgba(255, 255, 255, 0.2);
  position: relative;
  animation: pulse-glow 2.5s ease-in-out infinite;
}
.brand-inner {
  position: absolute;
  inset: 13px;
  background: #fff;
  border-radius: 3px;
  opacity: 0.9;
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 24px rgba(255, 255, 255, 0.2); }
  50%       { box-shadow: 0 0 40px rgba(255, 255, 255, 0.45); }
}

.brand-name {
  font-family: "Instrument Serif", ui-serif, Georgia, serif;
  font-size: 30px; font-weight: 400; line-height: 1;
  color: #fff;
  letter-spacing: -0.01em;
  margin: 0;
}

.tagline {
  color: rgba(255, 255, 255, 0.6);
  font-family: "Geist Mono", ui-monospace, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin: 0;
}

/* Progress */
.progress-bar-track {
  width: 160px;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 9999px;
  overflow: hidden;
  margin-top: 6px;
  position: relative;
}
.progress-bar-fill {
  position: absolute;
  top: 0; bottom: 0;
  width: 40%;
  border-radius: 9999px;
  background: #fff;
  animation: bounce-fill 1s ease-in-out infinite alternate;
}
@keyframes bounce-fill {
  0%   { left: -20%; }
  100% { left: 80%; }
}
</style>
