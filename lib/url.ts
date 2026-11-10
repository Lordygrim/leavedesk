import { headers } from "next/headers";
// The address people use to reach the app, for links in emails. Set APP_URL in production.
export async function baseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
}
