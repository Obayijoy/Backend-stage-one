import { v7 as uuidv7 } from "uuid";
import { Op, Order, WhereOptions } from "sequelize";
import Profile from "../models/profile.model";
import { fetchAndProcessProfileData } from "./external-api.service";

function normalizeFullName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function extractFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0].toLowerCase();
}

interface GetAllProfilesFilters {
  gender?: string;
  age_group?: string;
  country_id?: string;
  min_age?: number;
  max_age?: number;
  min_gender_probability?: number;
  min_country_probability?: number;
  sort_by?: "age" | "created_at" | "gender_probability";
  order?: "asc" | "desc";
  page: number;
  limit: number;
}

export async function createProfile(name: string) {
  const normalizedFullName = normalizeFullName(name);

  const existingProfile = await Profile.findOne({
    where: { name: normalizedFullName }
  });

  if (existingProfile) {
    return {
      alreadyExists: true,
      profile: existingProfile
    };
  }

  const firstName = extractFirstName(normalizedFullName);
  const enrichedData = await fetchAndProcessProfileData(firstName);

  const newProfile = await Profile.create({
    id: uuidv7(),
    name: normalizedFullName,
    ...enrichedData,
    created_at: new Date()
  });

  return {
    alreadyExists: false,
    profile: newProfile
  };
}

export async function getProfileById(id: string) {
  const profile = await Profile.findByPk(id);

  if (!profile) {
    throw new Error("Profile not found");
  }

  return profile;
}

function buildWhere(filters: Partial<GetAllProfilesFilters>): WhereOptions {
  const where: WhereOptions = {};

  if (filters.gender) {
    where.gender = {
      [Op.iLike]: filters.gender.trim()
    };
  }

  if (filters.age_group) {
    where.age_group = {
      [Op.iLike]: filters.age_group.trim()
    };
  }

  if (filters.country_id) {
    where.country_id = {
      [Op.iLike]: filters.country_id.trim()
    };
  }

  if (filters.min_age !== undefined || filters.max_age !== undefined) {
    where.age = {};

    if (filters.min_age !== undefined) {
      (where.age as any)[Op.gte] = filters.min_age;
    }

    if (filters.max_age !== undefined) {
      (where.age as any)[Op.lte] = filters.max_age;
    }
  }

  if (filters.min_gender_probability !== undefined) {
    where.gender_probability = {
      [Op.gte]: filters.min_gender_probability
    };
  }

  if (filters.min_country_probability !== undefined) {
    where.country_probability = {
      [Op.gte]: filters.min_country_probability
    };
  }

  return where;
}

function buildOrder(
  sort_by?: "age" | "created_at" | "gender_probability",
  order?: "asc" | "desc"
): Order {
  const sortBy = sort_by || "created_at";
  const sortOrder = (order || "desc").toUpperCase() as "ASC" | "DESC";

  return [[sortBy, sortOrder]];
}

export async function getAllProfiles(filters: GetAllProfilesFilters) {
  const where = buildWhere(filters);
  const order = buildOrder(filters.sort_by, filters.order);
  const offset = (filters.page - 1) * filters.limit;

  const { count, rows } = await Profile.findAndCountAll({
    where,
    order,
    limit: filters.limit,
    offset
  });

  return {
    page: filters.page,
    limit: filters.limit,
    total: count,
    data: rows
  };
}

interface SearchProfileFilters {
  gender?: string;
  age_group?: string;
  country_id?: string;
  min_age?: number;
  max_age?: number;
  page: number;
  limit: number;
}

export async function searchProfiles(filters: SearchProfileFilters) {
  const where = buildWhere(filters);
  const offset = (filters.page - 1) * filters.limit;

  const { count, rows } = await Profile.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit: filters.limit,
    offset
  });

  return {
    page: filters.page,
    limit: filters.limit,
    total: count,
    data: rows
  };
}

export async function exportProfiles(filters: Partial<GetAllProfilesFilters>) {
  const where = buildWhere(filters);
  const order = buildOrder(filters.sort_by, filters.order);

  const profiles = await Profile.findAll({
    where,
    order
  });

  return profiles;
}

export async function deleteProfileById(id: string) {
  const profile = await Profile.findByPk(id);

  if (!profile) {
    throw new Error("Profile not found");
  }

  await profile.destroy();
}