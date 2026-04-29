# Insighta Labs+ Backend

Secure Profile Intelligence backend for Stage 3. The API stores demographic profiles, protects every `/api/*` route, supports role-based access control, powers the CLI, and serves the web portal auth flow.

## Live URLs

- Backend: `https://backend-stage-one-production-bffb.up.railway.app`
- Web portal: `https://insighta-web-production-d646.up.railway.app`

## Architecture

The system is split into three repositories:

- Backend: Express, TypeScript, Sequelize, PostgreSQL, JWT, GitHub OAuth
- CLI: Node command-line interface using the same backend APIs
- Web portal: React/Vite app using HTTP-only cookie sessions

PostgreSQL is the single source of truth for profiles, users, roles, and refresh tokens.

## Authentication Flow

`GET /auth/github` starts GitHub OAuth. The backend creates a signed `state` value and supports optional PKCE using `code_challenge` and `code_verifier`.

`GET /auth/github/callback` requires:

- `code`
- signed `state`
- valid `code_verifier` when the state contains a PKCE challenge

For real GitHub login, the backend exchanges the code with GitHub, creates or updates the user, and issues an access token plus refresh token.

For the web portal, tokens are stored as HTTP-only cookies and a readable `csrf_token` cookie is issued. Unsafe cookie-based requests must send `X-CSRF-Token`.

For the CLI, tokens are returned as JSON so the CLI can store them at `~/.insighta/credentials.json`.

## Token Handling

- Access token expiry: 3 minutes
- Refresh token expiry: 5 minutes
- `POST /auth/refresh` rotates refresh tokens and revokes the old token immediately
- `POST /auth/logout` revokes the refresh token server-side

## Role Enforcement

Users have one of two roles:

- `admin`: full access, including create/delete profiles
- `analyst`: read-only access for list, detail, search, and export

Authorization is enforced through shared middleware, not scattered checks.

## Core Endpoints

- `GET /auth/github`
- `GET /auth/github/callback`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /api/users/me`
- `GET /api/profiles`
- `POST /api/profiles`
- `GET /api/profiles/:id`
- `DELETE /api/profiles/:id`
- `GET /api/profiles/search`
- `GET /api/profiles/export?format=csv`

Profile routes require:

```text
X-API-Version: 1
```

## CLI Integration

The CLI uses the same backend endpoints. It sends bearer access tokens on API requests, refreshes expired tokens when possible, and prompts re-login when refresh fails.

## Web Integration

The web portal redirects users to backend GitHub OAuth. The backend sets HTTP-only cookies, the web app sends `credentials: "include"`, and unsafe requests send `X-CSRF-Token`.

## Natural Language Search

`GET /api/profiles/search?q=...` parses phrases such as `young males from nigeria`, maps them to structured filters, and returns the same paginated response shape as profile listing.

## Rate Limiting and Logging

- `/auth/*`: 10 requests per minute
- Other API routes: 60 requests per minute per user
- Logs include method, endpoint, status code, and response time

## Local Development

```bash
npm install
npm run build
npm run dev
```

Required environment variables:

```env
DATABASE_URL=
PORT=3000
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
OAUTH_STATE_SECRET=
```
