import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase() : "";
    return email ? `login:${email}` : `login:${req.ip}`;
  },
  message: { message: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
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
