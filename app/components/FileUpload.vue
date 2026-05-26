<template>
  <div>
    <!-- Attached file badges -->
    <div v-if="chatStore.attachedDocuments.length" class="flex flex-wrap gap-2 px-4 py-2 border-t border-gray-800">
      <div
        v-for="doc in chatStore.attachedDocuments"
        :key="doc.document_id"
        class="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-xs text-gray-300"
      >
        <span>📎 {{ doc.name }}</span>
        <span
          class="text-xs px-1.5 py-0.5 rounded-full"
          :class="{
            'bg-yellow-900 text-yellow-300': doc.status === 'processing',
            'bg-green-900 text-green-300': doc.status === 'ready',
            'bg-red-900 text-red-300': doc.status === 'error',
          }"
        >{{ doc.status }}</span>
        <button @click="chatStore.removeDocument(doc.document_id)" class="text-gray-500 hover:text-red-400 ml-1">✕</button>
      </div>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      accept=".txt,.md,.mdx,.csv,.pdf,.docx,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.json,.yaml,.yml,.toml,.xml,.html,.css,.scss,.js,.ts,.jsx,.tsx,.vue,.py,.go,.rs,.java,.kt,.swift,.c,.cpp,.cs,.php,.sh,.sql,.env,.ini,.lua,.rb,.dart"
      @change="handleFileChange"
    />

    <!-- Upload button -->
    <button
      @click="fileInput?.click()"
      :disabled="uploading"
      class="p-2 text-gray-400 hover:text-white disabled:opacity-50 transition-colors rounded-lg hover:bg-gray-800"
      title="Attach file"
    >
      <span v-if="uploading" class="text-xs">...</span>
      <span v-else>📎</span>
    </button>

    <p v-if="uploadError" class="text-red-400 text-xs px-2">{{ uploadError }}</p>
  </div>
</template>

<script setup>
const chatStore = useChatStore()
const { uploadFile } = useUpload()

const fileInput = ref(null)
const uploading = ref(false)
const uploadError = ref('')

async function handleFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value = true
  uploadError.value = ''
  try {
    await uploadFile(file)
  } catch (err) {
    uploadError.value = err.message
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>
