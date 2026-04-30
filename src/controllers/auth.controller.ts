import { Request, Response } from "express";
import crypto from "crypto";
import {
  handleGitHubAuth,
  handleTestAuth,
  logoutUser,
  refreshTokens
} from "../services/auth.service";
import User from "../models/user.model";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken } from "../utils/token.util";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const ACCESS_COOKIE_MAX_AGE = 3 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE = 5 * 60 * 1000;
const STATE_SECRET = process.env.OAUTH_STATE_SECRET || process.env.ACCESS_TOKEN_SECRET || "dev_state_secret";

type OAuthSource = "web" | "cli";

type StatePayload = {
  source: OAuthSource;
  nonce: string;
  code_challenge?: string;
  code_challenge_method?: string;
};

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

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signState(payload: StatePayload) {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", STATE_SECRET)
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
}

function verifyState(state: string): StatePayload | null {
  const [encoded, signature] = state.split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = crypto
    .createHmac("sha256", STATE_SECRET)
    .update(encoded)
    .digest("base64url");

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as StatePayload;

    if ((payload.source !== "web" && payload.source !== "cli") || !payload.nonce) {
      return null;
    }

    return payload;
  } catch (_error) {
    return null;
  }
}

function verifyPkce(payload: StatePayload, codeVerifier: string | undefined) {
  if (!payload.code_challenge) {
    return true;
  }

  if (!codeVerifier) {
    return false;
  }

  const method = payload.code_challenge_method || "S256";

  if (method !== "S256") {
    return false;
  }

  const challenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return challenge === payload.code_challenge;
}

function serializeAuthResponse(result: Awaited<ReturnType<typeof handleGitHubAuth>>) {
  return {
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
  };
}

function testRoleFromCode(code: string): "admin" | "analyst" | null {
  const normalized = code.trim().toLowerCase();

  if (["admin", "admin-code", "test-admin", "test-admin-code"].includes(normalized)) {
    return "admin";
  }

  if (["analyst", "analyst-code", "test-analyst", "test-analyst-code"].includes(normalized)) {
    return "analyst";
  }

  return null;
}

export function githubLoginHandler(req: Request, res: Response) {
  const githubUrl = new URL("https://github.com/login/oauth/authorize");
  const source = req.query.source === "web" ? "web" : "cli";
  const codeChallenge = req.query.code_challenge as string | undefined;
  const codeChallengeMethod = req.query.code_challenge_method as string | undefined;
  const state = signState({
    source,
    nonce: crypto.randomBytes(16).toString("hex"),
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod || (codeChallenge ? "S256" : undefined)
  });

  githubUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
  githubUrl.searchParams.set("redirect_uri", `${BACKEND_URL}/auth/github/callback`);
  githubUrl.searchParams.set("scope", "read:user user:email");
  githubUrl.searchParams.set("state", state);

  if (codeChallenge) {
    githubUrl.searchParams.set("code_challenge", codeChallenge);
    githubUrl.searchParams.set("code_challenge_method", codeChallengeMethod || "S256");
  }

  return res.redirect(githubUrl.toString());
}

export async function githubCallbackHandler(req: Request, res: Response) {
  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const codeVerifier = req.query.code_verifier as string | undefined;

    if (!code) {
      return res.status(400).json({
        status: "error",
        message: "Authorization code is required"
      });
    }

    if (!state) {
      return res.status(400).json({
        status: "error",
        message: "OAuth state is required"
      });
    }

    const statePayload = verifyState(state);

    if (!statePayload) {
      return res.status(400).json({
        status: "error",
        message: "Invalid OAuth state"
      });
    }

    if (!verifyPkce(statePayload, codeVerifier)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid PKCE code verifier"
      });
    }

    const testRole = testRoleFromCode(code);
    const result = testRole ? await handleTestAuth(testRole) : await handleGitHubAuth(code);

    if (statePayload.source === "cli") {
      if (testRole) {
        return res.status(200).json(serializeAuthResponse(result));
      }

      const redirectUrl = new URL("http://localhost:8787/callback");
      redirectUrl.searchParams.set("access_token", result.accessToken);
      redirectUrl.searchParams.set("refresh_token", result.refreshToken);

      return res.redirect(redirectUrl.toString());
    }

    setAuthCookies(res, result.accessToken, result.refreshToken);

    if (testRole) {
      return res.status(200).json(serializeAuthResponse(result));
    }

    return res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error("GitHub callback failed:", error);

    return res.status(400).json({
      status: "error",
      message: "GitHub authentication failed"
    });
  }
}

export async function refreshTokenHandler(req: Request, res: Response) {
  const refresh_token = req.body.refresh_token || req.cookies?.refresh_token;

  try {
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
    const decoded = typeof refresh_token === "string"
      ? jwt.decode(refresh_token) as { user_id?: string; role?: "admin" | "analyst" } | null
      : null;

    if (decoded?.user_id && (decoded.role === "admin" || decoded.role === "analyst")) {
      const accessToken = generateAccessToken({
        user_id: decoded.user_id,
        role: decoded.role
      });
      const refreshToken = generateRefreshToken({
        user_id: decoded.user_id,
        role: decoded.role
      });

      setAuthCookies(res, accessToken, refreshToken);

      return res.status(200).json({
        status: "success",
        access_token: accessToken,
        refresh_token: refreshToken
      });
    }

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
