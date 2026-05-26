<script setup>
// Default landing for /admin → dashboard
definePageMeta({ layout: false })
await navigateTo('/admin/dashboard', { replace: true })
</script>
<template><div /></template>
