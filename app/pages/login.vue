<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
    <div class="w-full max-w-md p-8">
      <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-white mb-2">Welcome</h1>
          <p class="text-slate-300">Enter the password to continue</p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div>
            <Input
              v-model="password"
              type="password"
              placeholder="Enter password"
              class="w-full bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-white/30"
              :disabled="isSubmitting"
            />
          </div>

          <p v-if="error" class="text-red-400 text-sm text-center">
            {{ error }}
          </p>

          <Button
            type="submit"
            class="w-full bg-white text-slate-900 hover:bg-slate-100"
            :disabled="isSubmitting || !password"
          >
            <span v-if="isSubmitting">Verifying...</span>
            <span v-else>Enter</span>
          </Button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
});

const authStore = useAuthStore();
const router = useRouter();

const password = ref('');
const error = ref('');
const isSubmitting = ref(false);

const handleSubmit = async () => {
  error.value = '';
  isSubmitting.value = true;

  const result = await authStore.login(password.value);

  if (result.success) {
    await router.push('/');
  } else {
    error.value = result.error || 'Invalid password';
  }

  isSubmitting.value = false;
};

onMounted(async () => {
  await authStore.checkAuth();
  if (authStore.isAuthenticated) {
    await router.push('/');
  }
});
</script>
