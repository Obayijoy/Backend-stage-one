import axios from "axios";
import { getAgeGroup } from "../utils/age-group";

export interface EnrichedProfileData {
  gender: string;
  gender_probability: number;
  sample_size: number;
  age: number;
  age_group: string;
  country_id: string;
  country_probability: number;
}

export async function fetchAndProcessProfileData(name: string): Promise<EnrichedProfileData> {
  const [genderResponse, ageResponse, nationalityResponse] = await Promise.all([
    axios.get(`https://api.genderize.io?name=${name}`),
    axios.get(`https://api.agify.io?name=${name}`),
    axios.get(`https://api.nationalize.io?name=${name}`)
  ]);

  const genderData = genderResponse.data;
  const ageData = ageResponse.data;
  const nationalityData = nationalityResponse.data;

  if (genderData.gender === null || genderData.count === 0) {
    throw new Error("Genderize returned an invalid response");
  }

  if (ageData.age === null) {
    throw new Error("Agify returned an invalid response");
  }

  if (!nationalityData.country || nationalityData.country.length === 0) {
    throw new Error("Nationalize returned an invalid response");
  }

  const topCountry = nationalityData.country.reduce(
    (highest: { country_id: string; probability: number }, current: { country_id: string; probability: number }) => {
      return current.probability > highest.probability ? current : highest;
    }
  );

  return {
    gender: genderData.gender,
    gender_probability: genderData.probability,
    sample_size: genderData.count,
    age: ageData.age,
    age_group: getAgeGroup(ageData.age),
    country_id: topCountry.country_id,
    country_probability: topCountry.probability
  };
}