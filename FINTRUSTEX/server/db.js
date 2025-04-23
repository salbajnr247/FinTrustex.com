"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.client = void 0;

const postgres = require("postgres");
const { drizzle } = require("drizzle-orm/postgres-js");
const schema = require("../shared/schema");
require("dotenv/config");

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

exports.client = postgres(process.env.DATABASE_URL);
exports.db = drizzle(exports.client, { schema });

// Log configuration for debugging
console.log(`Database configured with ${process.env.DATABASE_URL ? 'provided' : 'missing'} connection string`);