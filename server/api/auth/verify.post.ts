export default defineEventHandler(async (event) => {
  const { password } = await readBody(event);
  const config = useRuntimeConfig();
  
  if (password === config.appPassword) {
    setCookie(event, 'app_auth', password, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    
    return { success: true };
  }
  
  throw createError({
    statusCode: 401,
    message: 'Invalid password',
  });
});
