export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function profilesToCsv(profiles: any[]): string {
  const headers = [
    "id",
    "name",
    "gender",
    "gender_probability",
    "age",
    "age_group",
    "country_id",
    "country_name",
    "country_probability",
    "created_at"
  ];

  const rows = profiles.map((profile) => {
    const plain = profile.toJSON ? profile.toJSON() : profile;

    return headers
      .map((header) => escapeCsvValue(plain[header]))
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}