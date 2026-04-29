import express from "express";
import cors from "cors";
import profileRoutes from "./routes/profile.routes";
import authRoutes from "./routes/auth.routes";
import { requireAuth } from "./middlewares/auth.middleware";
import { requireApiVersion } from "./middlewares/api-version.middleware";
import { authRateLimiter, apiRateLimiter } from "./middlewares/rate-limit.middleware";
import { requestLogger } from "./middlewares/logger.middleware";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.status(200).json({
    status: "success",
    message: "Profile Service is running"
  });
});

app.use("/auth", authRateLimiter, authRoutes);
app.use("/api", requireAuth, apiRateLimiter, requireApiVersion, profileRoutes);

export default app;