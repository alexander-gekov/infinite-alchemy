export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false);
  const isLoading = ref(true);

  const checkAuth = async () => {
    isLoading.value = true;
    try {
      const { authenticated } = await $fetch<{ authenticated: boolean }>('/api/auth/check');
      isAuthenticated.value = authenticated;
    } catch {
      isAuthenticated.value = false;
    } finally {
      isLoading.value = false;
    }
  };

  const login = async (password: string) => {
    try {
      await $fetch('/api/auth/verify', {
        method: 'POST',
        body: { password },
      });
      isAuthenticated.value = true;
      return { success: true };
    } catch {
      return { success: false, error: 'Invalid password' };
    }
  };

  return {
    isAuthenticated,
    isLoading,
    checkAuth,
    login,
  };
});
