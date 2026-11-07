// Password gate shared by the proxy, the login route and the API routes.
// Credentials come from the AUTH_USERNAME / AUTH_PASSWORD environment variables (never the code,
// since the repo is public). The session cookie holds an expiry plus an HMAC signature keyed by
// the password: it can't be forged without the password, and changing the password signs everyone out.

export const SESSION_COOKIE = "rapids_session";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // seconds

const encoder = new TextEncoder();

export const authConfigured = () => Boolean(process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD);

// Compare without exiting early, so response time doesn't reveal how much of a guess was right
const safeEqual = (a, b) => {
  const x = encoder.encode(String(a));
  const y = encoder.encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
};

const sign = async (message) => {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(process.env.AUTH_PASSWORD), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
};

export const checkCredentials = (username, password) =>
  authConfigured() &&
  // evaluate both so a wrong username takes as long as a wrong password
  [safeEqual(username, process.env.AUTH_USERNAME), safeEqual(password, process.env.AUTH_PASSWORD)].every(Boolean);

export const createSessionToken = async () => {
  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  return `${expires}.${await sign(`${process.env.AUTH_USERNAME}:${expires}`)}`;
};

export const verifySessionToken = async (token) => {
  if (!token || !authConfigured()) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) < Date.now() / 1000) return false;
  return safeEqual(signature, await sign(`${process.env.AUTH_USERNAME}:${expires}`));
};

export const isSignedIn = (request) => verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
