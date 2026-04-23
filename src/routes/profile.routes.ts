import { Router } from "express";
import {
  createProfileHandler,
  deleteProfileByIdHandler,
  getAllProfilesHandler,
  getProfileByIdHandler,
  searchProfilesHandler
} from "../controllers/profile.controller";

const router = Router();

router.get("/profiles/search", searchProfilesHandler);
router.post("/profiles", createProfileHandler);
router.get("/profiles", getAllProfilesHandler);
router.get("/profiles/:id", getProfileByIdHandler);
router.delete("/profiles/:id", deleteProfileByIdHandler);

export default router;