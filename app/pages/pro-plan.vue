<script setup>
// Legacy redirect → unified chat page (/c) with PEB pseudo-model selected
definePageMeta({ layout: false })
await navigateTo({ path: '/c', query: { model: 'peb' } }, { replace: true })
</script>
<template><div /></template>
