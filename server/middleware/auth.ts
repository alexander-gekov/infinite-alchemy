export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  
  if (url.pathname.startsWith('/api/auth')) {
    return;
  }
  
  if (!url.pathname.startsWith('/api/')) {
    return;
  }
  
  const authCookie = getCookie(event, 'app_auth');
  const config = useRuntimeConfig();
  
  if (authCookie !== config.appPassword) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }
});
