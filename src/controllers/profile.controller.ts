import { Request, Response } from "express";
import {
  createProfile,
  deleteProfileById,
  getAllProfiles,
  getProfileById,
  searchProfiles
} from "../services/profile.service";

function parseNumber(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error("Invalid query parameters");
  }

  return parsed;
}

function parseNaturalLanguageQuery(query: string) {
  const q = query.trim().toLowerCase();

  if (!q) {
    throw new Error("Unable to interpret query");
  }

  const filters: {
    gender?: string;
    age_group?: string;
    country_id?: string;
    min_age?: number;
    max_age?: number;
  } = {};

  const countryMap: Record<string, string> = {
    nigeria: "NG",
    kenya: "KE",
    angola: "AO",
    benin: "BJ",
    ghana: "GH",
    cameroon: "CM",
    "south africa": "ZA",
    france: "FR",
    germany: "DE",
    canada: "CA",
    india: "IN",
    australia: "AU",
    "united states": "US",
    usa: "US",
    "united kingdom": "GB",
    uk: "GB"
  };

  if ((q.includes("male") || q.includes("males")) && !(q.includes("female") || q.includes("females"))) {
    filters.gender = "male";
  }

  if ((q.includes("female") || q.includes("females")) && !(q.includes("male and female") || q.includes("female and male"))) {
    filters.gender = "female";
  }

  if (q.includes("young")) {
    filters.min_age = 16;
    filters.max_age = 24;
  }

  if (q.includes("child") || q.includes("children")) {
    filters.age_group = "child";
  }

  if (q.includes("teenager") || q.includes("teenagers")) {
    filters.age_group = "teenager";
  }

  if (q.includes("adult") || q.includes("adults")) {
    filters.age_group = "adult";
  }

  if (q.includes("senior") || q.includes("seniors")) {
    filters.age_group = "senior";
  }

  const aboveMatch = q.match(/above\s+(\d+)/);
  if (aboveMatch) {
    filters.min_age = Number(aboveMatch[1]);
  }

  const belowMatch = q.match(/below\s+(\d+)/);
  if (belowMatch) {
    filters.max_age = Number(belowMatch[1]);
  }

  for (const countryName of Object.keys(countryMap)) {
    if (q.includes(`from ${countryName}`)) {
      filters.country_id = countryMap[countryName];
      break;
    }
  }

  const hasMeaningfulFilter =
    filters.gender !== undefined ||
    filters.age_group !== undefined ||
    filters.country_id !== undefined ||
    filters.min_age !== undefined ||
    filters.max_age !== undefined;

  if (!hasMeaningfulFilter) {
    throw new Error("Unable to interpret query");
  }

  return filters;
}

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
    const sortBy = req.query.sort_by as string | undefined;
    const order = req.query.order as string | undefined;

    const allowedSortBy = ["age", "created_at", "gender_probability"];
    const allowedOrder = ["asc", "desc"];

    if (sortBy && !allowedSortBy.includes(sortBy)) {
      return res.status(422).json({
        status: "error",
        message: "Invalid query parameters"
      });
    }

    if (order && !allowedOrder.includes(order.toLowerCase())) {
      return res.status(422).json({
        status: "error",
        message: "Invalid query parameters"
      });
    }

    const page = parseNumber(req.query.page) ?? 1;
    let limit = parseNumber(req.query.limit) ?? 10;

    if (page < 1 || limit < 1) {
      return res.status(422).json({
        status: "error",
        message: "Invalid query parameters"
      });
    }

    if (limit > 50) {
      limit = 50;
    }

    const result = await getAllProfiles({
      gender: req.query.gender as string | undefined,
      age_group: req.query.age_group as string | undefined,
      country_id: req.query.country_id as string | undefined,
      min_age: parseNumber(req.query.min_age),
      max_age: parseNumber(req.query.max_age),
      min_gender_probability: parseNumber(req.query.min_gender_probability),
      min_country_probability: parseNumber(req.query.min_country_probability),
      sort_by: sortBy as "age" | "created_at" | "gender_probability" | undefined,
      order: order?.toLowerCase() as "asc" | "desc" | undefined,
      page,
      limit
    });

    return res.status(200).json({
      status: "success",
      page: result.page,
      limit: result.limit,
      total: result.total,
      data: result.data
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message === "Invalid query parameters") {
      return res.status(422).json({
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

export async function searchProfilesHandler(req: Request, res: Response) {
  try {
    const q = req.query.q as string | undefined;

    if (q === undefined || q === null || q.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Missing or empty parameter"
      });
    }

    const page = parseNumber(req.query.page) ?? 1;
    let limit = parseNumber(req.query.limit) ?? 10;

    if (page < 1 || limit < 1) {
      return res.status(422).json({
        status: "error",
        message: "Invalid query parameters"
      });
    }

    if (limit > 50) {
      limit = 50;
    }

    const parsedFilters = parseNaturalLanguageQuery(q);

    const result = await searchProfiles({
      ...parsedFilters,
      page,
      limit
    });

    return res.status(200).json({
      status: "success",
      page: result.page,
      limit: result.limit,
      total: result.total,
      data: result.data
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message === "Unable to interpret query") {
      return res.status(400).json({
        status: "error",
        message
      });
    }

    if (message === "Invalid query parameters") {
      return res.status(422).json({
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