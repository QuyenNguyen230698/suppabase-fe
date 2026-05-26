export function useLogout() {
  const auth = useAuthStore()
  const { ask } = useConfirm()
  const { t } = useI18n()

  async function confirmLogout() {
    const ok = await ask({
      title: t('auth.signOutConfirm'),
      message: t('auth.signOutMessage'),
      confirmLabel: t('auth.signOut'),
      cancelLabel: t('common.cancel'),
      variant: 'danger',
    })
    if (ok) {
      useToast().show(t('auth.signedOut'), 'success')
      await auth.logout()
    }
  }

  return { confirmLogout }
}
