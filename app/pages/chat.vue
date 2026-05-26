<script setup>
// Legacy redirect → unified chat page (/c)
definePageMeta({ layout: false })
await navigateTo('/c', { replace: true })
</script>
<template><div /></template>
