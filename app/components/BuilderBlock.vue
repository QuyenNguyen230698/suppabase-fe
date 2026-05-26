<template>
  <div class="builder-block" :style="containerStyle">
    <template v-if="block.type === 'text'">
      <p :style="textStyle">{{ block.props.text }}</p>
    </template>

    <template v-else-if="block.type === 'heading'">
      <h2 :style="textStyle">{{ block.props.text }}</h2>
    </template>

    <template v-else-if="block.type === 'button'">
      <button :style="buttonStyle">{{ block.props.text }}</button>
    </template>

    <template v-else-if="block.type === 'input'">
      <input
        type="text"
        :placeholder="block.props.placeholder"
        :style="inputStyle"
        readonly
      />
    </template>

    <template v-else-if="block.type === 'card'">
      <div class="bb-card" :style="cardStyle">
        <p :style="{ color: block.props.color, margin: 0 }">{{ block.props.text }}</p>
      </div>
    </template>

    <template v-else-if="block.type === 'image'">
      <img :src="block.props.src" class="bb-img" alt="" draggable="false" />
    </template>
  </div>
</template>

<script setup>
const props = defineProps({ block: { type: Object, required: true } })

const containerStyle = computed(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  pointerEvents: 'none',
}))

const textStyle = computed(() => ({
  margin: 0,
  color: props.block.props.color || '#ededec',
  fontSize: `${props.block.props.fontSize || 14}px`,
  lineHeight: 1.4,
  width: '100%',
  textAlign: 'left',
  padding: '0 8px',
}))

const buttonStyle = computed(() => ({
  width: '100%',
  height: '100%',
  background: props.block.props.bg || '#d8ff5b',
  color: props.block.props.color || '#0b0b0c',
  border: 0,
  borderRadius: '8px',
  fontSize: `${props.block.props.fontSize || 13}px`,
  fontWeight: 600,
  cursor: 'inherit',
}))

const inputStyle = computed(() => ({
  width: '100%',
  height: '100%',
  background: props.block.props.bg || '#1a1a1e',
  color: props.block.props.color || '#ededec',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '7px',
  padding: '0 10px',
  fontSize: '12px',
  outline: 'none',
}))

const cardStyle = computed(() => ({
  width: '100%',
  height: '100%',
  background: props.block.props.bg || '#131316',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '10px',
  padding: '12px 14px',
  display: 'flex',
  alignItems: 'flex-start',
}))
</script>

<style scoped>
.builder-block { user-select: none; }
.bb-img {
  width: 100%; height: 100%;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}
</style>
