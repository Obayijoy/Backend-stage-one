import { v7 as uuidv7 } from "uuid";
import { Op, WhereOptions } from "sequelize";
import Profile from "../models/profile.model";
import { fetchAndProcessProfileData } from "./external-api.service";

export async function createProfile(name: string) {
  const normalizedName = name.trim().toLowerCase();

  const existingProfile = await Profile.findOne({
    where: { name: normalizedName }
  });

  if (existingProfile) {
    return {
      alreadyExists: true,
      profile: existingProfile
    };
  }

  const enrichedData = await fetchAndProcessProfileData(normalizedName);

  const newProfile = await Profile.create({
    id: uuidv7(),
    name: normalizedName,
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

export async function getAllProfiles(filters: {
  gender?: string;
  country_id?: string;
  age_group?: string;
}) {
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

  const profiles = await Profile.findAll({
    where,
    attributes: ["id", "name", "gender", "age", "age_group", "country_id"],
    order: [["created_at", "DESC"]]
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