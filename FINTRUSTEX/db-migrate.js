/**
 * Database Migration Script for FinTrustEX
 * This script allows you to export your database schema and data to SQL format
 * which can be imported into another PostgreSQL database
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

// Database connection parameters
const dbParams = {
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD
};

// Output files
const SCHEMA_FILE = path.join(__dirname, 'db_schema.sql');
const DATA_FILE = path.join(__dirname, 'db_data.sql');

console.log('Database Migration Tool for FinTrustEX');
console.log('======================================');

// Validate database connection details
if (!dbParams.host || !dbParams.database || !dbParams.user || !dbParams.password) {
  console.error('Error: Missing database connection parameters.');
  console.error('Please ensure the following environment variables are set:');
  console.error('PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD');
  process.exit(1);
}

try {
  console.log(`\nExporting database schema to ${SCHEMA_FILE}...`);
  
  // Export schema (structure only, no data)
  const schemaCmd = `PGPASSWORD=${dbParams.password} pg_dump -h ${dbParams.host} -p ${dbParams.port} -U ${dbParams.user} -d ${dbParams.database} --schema-only --no-owner --no-acl > "${SCHEMA_FILE}"`;
  execSync(schemaCmd, { stdio: 'inherit' });
  
  console.log(`\nExporting database data to ${DATA_FILE}...`);
  
  // Export data only (no schema)
  const dataCmd = `PGPASSWORD=${dbParams.password} pg_dump -h ${dbParams.host} -p ${dbParams.port} -U ${dbParams.user} -d ${dbParams.database} --data-only --no-owner --no-acl > "${DATA_FILE}"`;
  execSync(dataCmd, { stdio: 'inherit' });
  
  console.log('\nDatabase export completed successfully!');
  console.log('\nInstructions for importing to a new database:');
  console.log('1. Create a new PostgreSQL database');
  console.log('2. Import the schema: psql -h new_host -U new_user -d new_database < db_schema.sql');
  console.log('3. Import the data: psql -h new_host -U new_user -d new_database < db_data.sql');
  
} catch (error) {
  console.error('\nError during database export:', error.message);
  console.error('\nAlternative export method:');
  console.log('You can manually export the database using the command line:');
  console.log(`PGPASSWORD=${dbParams.password} pg_dump -h ${dbParams.host} -p ${dbParams.port} -U ${dbParams.user} -d ${dbParams.database} > fintrustex_backup.sql`);
}

// Display the current database URL (for reference)
console.log('\nCurrent DATABASE_URL:', process.env.DATABASE_URL);
console.log('\nTo use this database in another application, set the DATABASE_URL environment variable to the value above.');