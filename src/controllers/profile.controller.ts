import { Request, Response } from "express";
import {
  createProfile,
  deleteProfileById,
  getAllProfiles,
  getProfileById
} from "../services/profile.service";

export async function createProfileHandler(req: Request, res: Response) {
  try {
    const { name } = req.body;

    if (name === undefined || name === null || name === "") {
      return res.status(400).json({
        status: "error",
        message: "Name is required"
      });
    }

    if (typeof name !== "string") {
      return res.status(422).json({
        status: "error",
        message: "Invalid type for name"
      });
    }

    if (name.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Name is required"
      });
    }

    const result = await createProfile(name);

    if (result.alreadyExists) {
      return res.status(200).json({
        status: "success",
        message: "Profile already exists",
        data: result.profile
      });
    }

    return res.status(201).json({
      status: "success",
      data: result.profile
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    if (
      message === "Genderize returned an invalid response" ||
      message === "Agify returned an invalid response" ||
      message === "Nationalize returned an invalid response"
    ) {
      return res.status(502).json({
        status: "error",
        message
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
}

export async function getProfileByIdHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const profile = await getProfileById(id);

    return res.status(200).json({
      status: "success",
      data: profile
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message === "Profile not found") {
      return res.status(404).json({
        status: "error",
        message
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
}

export async function getAllProfilesHandler(req: Request, res: Response) {
  try {
    const profiles = await getAllProfiles({
      gender: req.query.gender as string | undefined,
      country_id: req.query.country_id as string | undefined,
      age_group: req.query.age_group as string | undefined
    });

    return res.status(200).json({
      status: "success",
      count: profiles.length,
      data: profiles
    });
  } catch (_error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
}

export async function deleteProfileByIdHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    await deleteProfileById(id);

    return res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message === "Profile not found") {
      return res.status(404).json({
        status: "error",
        message
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
}