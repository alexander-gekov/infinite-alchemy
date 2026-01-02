export default defineEventHandler(async (event) => {
  const authCookie = getCookie(event, 'app_auth');
  const config = useRuntimeConfig();
  
  return {
    authenticated: authCookie === config.appPassword,
  };
});
