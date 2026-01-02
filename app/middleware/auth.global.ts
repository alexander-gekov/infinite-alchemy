export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') {
    return;
  }

  const authStore = useAuthStore();
  
  if (authStore.isLoading) {
    await authStore.checkAuth();
  }

  if (!authStore.isAuthenticated) {
    return navigateTo('/login');
  }
});
