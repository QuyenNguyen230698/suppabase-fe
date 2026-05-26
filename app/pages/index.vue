<script setup>
definePageMeta({
  layout: false,
  middleware: [
    () => {
      const auth = useAuthStore()
      return navigateTo(auth.isLoggedIn ? '/c' : '/login', { replace: true })
    },
  ],
})
</script>
<template><div /></template>
