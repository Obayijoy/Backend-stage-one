import { Request, Response } from "express";
import crypto from "crypto";
import {
  handleGitHubAuth,
  logoutUser,
  refreshTokens
} from "../services/auth.service";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

export function githubLoginHandler(req: Request, res: Response) {
  const state = crypto.randomBytes(16).toString("hex");

  const githubUrl = new URL("https://github.com/login/oauth/authorize");

  githubUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
  githubUrl.searchParams.set("redirect_uri", `${BACKEND_URL}/auth/github/callback`);
  githubUrl.searchParams.set("scope", "read:user user:email");
  githubUrl.searchParams.set("state", state);

  return res.redirect(githubUrl.toString());
}

export async function githubCallbackHandler(req: Request, res: Response) {
  try {
    const code = req.query.code as string | undefined;

    if (!code) {
      return res.status(400).json({
        status: "error",
        message: "Authorization code is required"
      });
    }

    const result = await handleGitHubAuth(code);

    return res.status(200).json({
      status: "success",
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        avatar_url: result.user.avatar_url,
        role: result.user.role
      },
      access_token: result.accessToken,
      refresh_token: result.refreshToken
    });
  } catch (_error) {
    return res.status(500).json({
      status: "error",
      message: "GitHub authentication failed"
    });
  }
}

export async function refreshTokenHandler(req: Request, res: Response) {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token || typeof refresh_token !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Refresh token is required"
      });
    }

    const result = await refreshTokens(refresh_token);

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
    const { refresh_token } = req.body;

    if (!refresh_token || typeof refresh_token !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Refresh token is required"
      });
    }

    await logoutUser(refresh_token);

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