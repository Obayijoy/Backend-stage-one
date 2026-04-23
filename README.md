# Profile Intelligence Service - Stage 2

A backend API built with TypeScript, Express.js, Sequelize, and PostgreSQL for storing, filtering, sorting, paginating, and querying demographic profile data.

## Features

- Create profiles from a name using external APIs
- Store profile data in PostgreSQL
- Prevent duplicate profile creation
- Retrieve a profile by ID
- Get all profiles with:
  - combined filters
  - sorting
  - pagination
- Search profiles using plain English queries
- Seed the database with the provided 2026 dataset
- Prevent duplicate seeding on re-run

## Tech Stack

- TypeScript
- Express.js
- Sequelize
- PostgreSQL
- Axios
- UUID v7
- CORS
- Dotenv

## Base URL

```bash
http://localhost:3000