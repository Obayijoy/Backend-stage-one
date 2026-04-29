import { Request, Response } from "express";
import crypto from "crypto";
import {
  handleGitHubAuth,
  logoutUser,
  refreshTokens
} from "../services/auth.service";
import User from "../models/user.model";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const ACCESS_COOKIE_MAX_AGE = 3 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE = 5 * 60 * 1000;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const csrfToken = crypto.randomBytes(32).toString("hex");
  const secure = isProduction();
  const sameSite = secure ? "none" : "lax";

  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: ACCESS_COOKIE_MAX_AGE
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: REFRESH_COOKIE_MAX_AGE
  });

  res.cookie("csrf_token", csrfToken, {
    httpOnly: false,
    secure,
    sameSite,
    maxAge: REFRESH_COOKIE_MAX_AGE
  });
}

function clearAuthCookies(res: Response) {
  const secure = isProduction();
  const sameSite = secure ? "none" : "lax";

  res.clearCookie("access_token", { httpOnly: true, secure, sameSite });
  res.clearCookie("refresh_token", { httpOnly: true, secure, sameSite });
  res.clearCookie("csrf_token", { httpOnly: false, secure, sameSite });
}

export function githubLoginHandler(req: Request, res: Response) {
  const githubUrl = new URL("https://github.com/login/oauth/authorize");
  const source = req.query.source === "web" ? "web" : "cli";

  githubUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
  githubUrl.searchParams.set("redirect_uri", `${BACKEND_URL}/auth/github/callback`);
  githubUrl.searchParams.set("scope", "read:user user:email");
  githubUrl.searchParams.set("state", source);

  return res.redirect(githubUrl.toString());
}

export async function githubCallbackHandler(req: Request, res: Response) {
  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;

    if (!code) {
      return res.status(400).json({
        status: "error",
        message: "Authorization code is required"
      });
    }

    const result = await handleGitHubAuth(code);

    if (state === "cli") {
      const redirectUrl = new URL("http://localhost:8787/callback");
      redirectUrl.searchParams.set("access_token", result.accessToken);
      redirectUrl.searchParams.set("refresh_token", result.refreshToken);

      return res.redirect(redirectUrl.toString());
    }

    setAuthCookies(res, result.accessToken, result.refreshToken);

    return res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error("GitHub callback failed:", error);

    return res.status(500).json({
      status: "error",
      message: "GitHub authentication failed"
    });
  }
}

export async function refreshTokenHandler(req: Request, res: Response) {
  try {
    const refresh_token = req.body.refresh_token || req.cookies?.refresh_token;

    if (!refresh_token || typeof refresh_token !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Refresh token is required"
      });
    }

    const result = await refreshTokens(refresh_token);
    setAuthCookies(res, result.accessToken, result.refreshToken);

    return res.status(200).json({
      status: "success",
      access_token: result.accessToken,
      refresh_token: result.refreshToken
    });
  } catch (_error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired refresh token"
    });
  }
}

export async function logoutHandler(req: Request, res: Response) {
  try {
    const refresh_token = req.body.refresh_token || req.cookies?.refresh_token;

    if (!refresh_token || typeof refresh_token !== "string") {
      clearAuthCookies(res);

      return res.status(400).json({
        status: "error",
        message: "Refresh token is required"
      });
    }

    await logoutUser(refresh_token);
    clearAuthCookies(res);

    return res.status(200).json({
      status: "success",
      message: "Logged out successfully"
    });
  } catch (_error) {
    return res.status(500).json({
      status: "error",
      message: "Logout failed"
    });
  }
}

export async function meHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required"
    });
  }

  const user = await User.findByPk(req.user.id);

  if (!user) {
    return res.status(401).json({
      status: "error",
      message: "Invalid authentication token"
    });
  }

  return res.status(200).json({
    status: "success",
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      role: user.role
    }
  });
}
