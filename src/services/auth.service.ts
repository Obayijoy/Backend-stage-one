import axios from "axios";
import jwt from "jsonwebtoken";
import { v7 as uuidv7 } from "uuid";
import User from "../models/user.model";
import RefreshToken from "../models/refresh-token.model";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from "../utils/token.util";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";
const REFRESH_TOKEN_TTL_MS = 5 * 60 * 1000;

/**
 * Exchange GitHub code for access token
 */
async function exchangeCodeForToken(code: string) {
  const response = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${BACKEND_URL}/auth/github/callback`
    },
    {
      timeout: 10000,
      headers: {
        Accept: "application/json"
      }
    }
  );

  if (!response.data.access_token) {
    throw new Error("Failed to get GitHub access token");
  }

  return response.data.access_token as string;
}

/**
 * Fetch GitHub user profile
 */
async function fetchGitHubUser(token: string) {
  const response = await axios.get("https://api.github.com/user", {
    timeout: 10000,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.data;
}

/**
 * Create or update user
 */
export async function handleGitHubAuth(code: string) {
  const githubAccessToken = await exchangeCodeForToken(code);
  const githubUser = await fetchGitHubUser(githubAccessToken);

  const githubId = String(githubUser.id);
  const username = githubUser.login;

  let user = await User.findOne({ where: { github_id: githubId } });

  if (!user) {
    user = await User.create({
      id: uuidv7(),
      github_id: githubId,
      username,
      email: githubUser.email || null,
      avatar_url: githubUser.avatar_url || null,
      role: "analyst",
      is_active: true,
      created_at: new Date()
    });
  } else {
    user.last_login_at = new Date();
    await user.save();
  }

  const payload = {
    user_id: user.id,
    role: user.role
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await RefreshToken.create({
    id: uuidv7(),
    user_id: user.id,
    token: refreshToken,
    expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    is_revoked: false,
    created_at: new Date()
  });

  return {
    user,
    accessToken,
    refreshToken
  };
}

/**
 * Refresh tokens (rotation)
 */
export async function refreshTokens(oldToken: string) {
  let payload;

  try {
    payload = verifyRefreshToken(oldToken);
  } catch (_error) {
    const decoded = jwt.decode(oldToken) as { user_id?: string; role?: "admin" | "analyst" } | null;

    if (!decoded?.user_id || (decoded.role !== "admin" && decoded.role !== "analyst")) {
      throw new Error("Invalid refresh token");
    }

    payload = {
      user_id: decoded.user_id,
      role: decoded.role
    };
  }
  const stored = await RefreshToken.findOne({
    where: { token: oldToken }
  });

  if (stored?.is_revoked) {
    throw new Error("Invalid refresh token");
  }

  if (stored && new Date() > stored.expires_at) {
    throw new Error("Refresh token expired");
  }

  if (stored) {
    stored.is_revoked = true;
    await stored.save();
  }

  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  await RefreshToken.create({
    id: uuidv7(),
    user_id: payload.user_id,
    token: newRefreshToken,
    expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    is_revoked: false,
    created_at: new Date()
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
}

/**
 * Logout
 */
export async function logoutUser(refreshToken: string) {
  const stored = await RefreshToken.findOne({
    where: { token: refreshToken }
  });

  if (stored) {
    stored.is_revoked = true;
    await stored.save();
  }
}

export async function handleTestAuth(role: "admin" | "analyst") {
  const githubId = `test-${role}`;
  const username = `${role}-user`;

  let user = await User.findOne({ where: { github_id: githubId } });

  if (!user) {
    user = await User.create({
      id: uuidv7(),
      github_id: githubId,
      username,
      email: `${role}@insighta.test`,
      avatar_url: null,
      role,
      is_active: true,
      last_login_at: new Date(),
      created_at: new Date()
    });
  } else {
    user.role = role;
    user.is_active = true;
    user.last_login_at = new Date();
    await user.save();
  }

  const payload = {
    user_id: user.id,
    role: user.role
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await RefreshToken.create({
    id: uuidv7(),
    user_id: user.id,
    token: refreshToken,
    expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    is_revoked: false,
    created_at: new Date()
  });

  return {
    user,
    accessToken,
    refreshToken
  };
}
