// Helpers for "Sign in with Google" (OAuth 2.0 authorization code flow, no extra libraries).
export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const appUrl = (req: Request) => process.env.APP_URL ?? new URL(req.url).origin;
