import type { H3Event } from "h3";
import { getRequestIP, getRequestHeader, getCookie, setCookie } from "h3";
import { randomUUID } from "crypto";

const COOKIE_NAME = "rlid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function getRateLimitIdentifier(event: H3Event): string {
  const xff = getRequestHeader(event, "x-forwarded-for");
  if (xff) {
    const firstHop = xff.split(",")[0]?.trim();
    if (firstHop) return firstHop;
  }

  const ip = getRequestIP(event);
  if (ip) return ip;

  let cookieId = getCookie(event, COOKIE_NAME);
  if (!cookieId) {
    cookieId = randomUUID();
    setCookie(event, COOKIE_NAME, cookieId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }
  return `cookie:${cookieId}`;
}
