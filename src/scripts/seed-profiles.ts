import dotenv from "dotenv";
import { v7 as uuidv7 } from "uuid";
import { sequelize } from "../config/db";
import Profile from "../models/profile.model";
import { getAgeGroup } from "../utils/age-group";
import { getCountryName } from "../services/external-api.service";

dotenv.config();

import profilesData from "../data/profiles-2026.json";

interface SeedProfile {
  name: string;
  gender: string;
  gender_probability: number;
  age: number;
  age_group?: string;
  country_id: string;
  country_name?: string;
  country_probability: number;
  created_at?: string;
}

function extractProfiles(data: any): SeedProfile[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.profiles)) {
    return data.profiles;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  throw new Error("JSON file format is invalid");
}

async function seedProfiles() {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");

    await sequelize.sync();
    console.log("Database synced successfully");

    const data = extractProfiles(profilesData);

    for (const item of data) {
      const normalizedName = item.name.trim().toLowerCase();

      const existingProfile = await Profile.findOne({
        where: { name: normalizedName }
      });

      if (existingProfile) {
        console.log(`Skipping existing profile: ${normalizedName}`);
        continue;
      }

      await Profile.create({
        id: uuidv7(),
        name: normalizedName,
        gender: item.gender,
        gender_probability: item.gender_probability,
        age: item.age,
        age_group: item.age_group || getAgeGroup(item.age),
        country_id: item.country_id,
        country_name: item.country_name || getCountryName(item.country_id),
        country_probability: item.country_probability,
        created_at: item.created_at ? new Date(item.created_at) : new Date()
      });

      console.log(`Seeded profile: ${normalizedName}`);
    }

    console.log("Seeding completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedProfiles();