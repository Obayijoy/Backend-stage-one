import { Router } from "express";
import {
  createProfileHandler,
  deleteProfileByIdHandler,
  exportProfilesHandler,
  getAllProfilesHandler,
  getProfileByIdHandler,
  searchProfilesHandler
} from "../controllers/profile.controller";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

router.get("/profiles/search", requireRole("admin", "analyst"), searchProfilesHandler);
router.get("/profiles/export", requireRole("admin", "analyst"), exportProfilesHandler);
router.post("/profiles", requireRole("admin"), createProfileHandler);
router.get("/profiles", requireRole("admin", "analyst"), getAllProfilesHandler);
router.get("/profiles/:id", requireRole("admin", "analyst"), getProfileByIdHandler);
router.delete("/profiles/:id", requireRole("admin"), deleteProfileByIdHandler);

export default router;