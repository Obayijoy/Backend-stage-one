import { Router } from "express";
import {
  createProfileHandler,
  deleteProfileByIdHandler,
  getAllProfilesHandler,
  getProfileByIdHandler
} from "../controllers/profile.controller";

const router = Router();

router.post("/profiles", createProfileHandler);
router.get("/profiles", getAllProfilesHandler);
router.get("/profiles/:id", getProfileByIdHandler);
router.delete("/profiles/:id", deleteProfileByIdHandler);

export default router;