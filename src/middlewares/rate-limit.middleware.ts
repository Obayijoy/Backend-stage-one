import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { AuthenticatedRequest } from "./auth.middleware";

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many requests"
  }
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthenticatedRequest) => {
    return req.user?.id || ipKeyGenerator(req.ip || "unknown");
  },
  message: {
    status: "error",
    message: "Too many requests"
  }
});