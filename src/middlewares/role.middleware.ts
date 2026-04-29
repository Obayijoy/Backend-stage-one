import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "./auth.middleware";

export function requireRole(...allowedRoles: Array<"admin" | "analyst">) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden"
      });
    }

    next();
  };
}