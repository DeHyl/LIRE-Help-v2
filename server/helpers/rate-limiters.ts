import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// H19: cap login attempts per (email, IP) 15-minute window. keying by email
// prevents slow credential stuffing across IPs; the IP fallback catches submits
// that don't include an email. ipKeyGenerator normalizes IPv6 /64 buckets so
// an attacker can't rotate through the low bits of their address to bypass.
// In test env LIRE_LOGIN_LIMIT overrides the cap so the limiter can be
// exercised explicitly without tripping unrelated suites that log in many times.
const LOGIN_MAX = parseInt(process.env.LIRE_LOGIN_LIMIT ?? "", 10) || 10;

export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: LOGIN_MAX,
  keyGenerator: (req, _res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
    if (email) return `login:email:${email}`;
    return `login:ip:${ipKeyGenerator(req.ip ?? "", 56)}`;
  },
  message: { message: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  // In test env the limiter is OFF by default so suites that log in many
  // accounts per file don't collide with it. Tests that want to exercise
  // the limiter set header x-exercise-login-limit: 1 to opt back in.
  skip: (req) =>
    process.env.NODE_ENV === "test" && req.headers["x-exercise-login-limit"] !== "1",
});

export const chatPerMinuteLimiter = rateLimit({
  windowMs: 60_000,
  max: 6,
  message: { error: "Too many requests. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const chatPerDayLimiter = rateLimit({
  windowMs: 24 * 60 * 60_000,
  max: 200,
  message: { error: "Daily chat limit reached." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const platformSessionsWriteLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: { message: "Too many session writes." },
  standardHeaders: true,
  legacyHeaders: false,
});
