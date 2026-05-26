<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <AppLoader :show="loading" :message="loadingMessage" />
    <DsConfirm />
    <DsToast />
  </div>
</template>

<script setup>
const { loading, loadingMessage } = useLoader()
</script>
