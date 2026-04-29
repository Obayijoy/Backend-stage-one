import { NextFunction, Request, Response } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function requireCsrfToken(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const usesCookieSession = Boolean(req.cookies?.access_token);

  if (!usesCookieSession) {
    return next();
  }

  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.header("X-CSRF-Token");

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({
      status: "error",
      message: "CSRF token missing or invalid"
    });
  }

  return next();
}
