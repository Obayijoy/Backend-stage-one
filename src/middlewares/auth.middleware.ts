import { NextFunction, Request, Response } from "express";
import User from "../models/user.model";
import { verifyAccessToken } from "../utils/token.util";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: "admin" | "analyst";
    username: string;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.access_token;

    if ((!authHeader || !authHeader.startsWith("Bearer ")) && !cookieToken) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required"
      });
    }

    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : cookieToken;
    const payload = verifyAccessToken(token);

    const user = await User.findByPk(payload.user_id);

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid authentication token"
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        status: "error",
        message: "User account is inactive"
      });
    }

    req.user = {
      id: user.id,
      role: user.role,
      username: user.username
    };

    next();
  } catch (_error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token"
    });
  }
}
