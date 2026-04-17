# Profile Service

A backend API built with TypeScript, Express.js, Sequelize, and PostgreSQL.

This service accepts a name, enriches it using external APIs, stores the processed profile in PostgreSQL, and provides REST endpoints for retrieval, filtering, and deletion.

## Features

- Create a profile from a name
- Enrich profile data using:
  - Genderize
  - Agify
  - Nationalize
- Store processed profile data in PostgreSQL
- Prevent duplicate records for the same name
- Retrieve a profile by ID
- List all profiles with optional filters
- Delete a profile by ID

## Tech Stack

- TypeScript
- Express.js
- Sequelize
- PostgreSQL
- Axios
- UUID
- CORS
- Dotenv

## API Base URL

```bash
http://localhost:3000