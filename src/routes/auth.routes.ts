import { Router } from "express";
import {
  githubCallbackHandler,
  githubLoginHandler,
  meHandler,
  logoutHandler,
  refreshTokenHandler
} from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireCsrfToken } from "../middlewares/csrf.middleware";

const router = Router();

router.get("/github", githubLoginHandler);
router.get("/github/callback", githubCallbackHandler);
router.get("/me", requireAuth, meHandler);
router.post("/refresh", requireCsrfToken, refreshTokenHandler);
router.post("/logout", requireCsrfToken, logoutHandler);
router.all("/logout", (_req, res) => {
  return res.status(405).json({
    status: "error",
    message: "Method not allowed"
  });
});

export default router;
