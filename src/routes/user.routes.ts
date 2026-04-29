import { Router } from "express";
import { meHandler } from "../controllers/auth.controller";

const router = Router();

router.get("/users/me", meHandler);

export default router;
