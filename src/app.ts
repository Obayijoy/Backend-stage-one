import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import profileRoutes from "./routes/profile.routes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import { requireAuth } from "./middlewares/auth.middleware";
import { requireApiVersion } from "./middlewares/api-version.middleware";
import { authRateLimiter, apiRateLimiter } from "./middlewares/rate-limit.middleware";
import { requestLogger } from "./middlewares/logger.middleware";
import { requireCsrfToken } from "./middlewares/csrf.middleware";

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.set("trust proxy", 1);
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.status(200).json({
    status: "success",
    message: "Profile Service is running"
  });
});

app.use("/auth", authRateLimiter, authRoutes);
app.use("/api", requireAuth, requireCsrfToken, apiRateLimiter, userRoutes);
app.use("/api", requireAuth, requireCsrfToken, apiRateLimiter, requireApiVersion, profileRoutes);

export default app;
