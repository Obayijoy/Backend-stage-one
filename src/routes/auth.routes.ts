import { Router } from "express";
import {
  githubCallbackHandler,
  githubLoginHandler,
  logoutHandler,
  refreshTokenHandler
} from "../controllers/auth.controller";

const router = Router();

router.get("/github", githubLoginHandler);
router.get("/github/callback", githubCallbackHandler);
router.post("/refresh", refreshTokenHandler);
router.post("/logout", logoutHandler);

export default router;