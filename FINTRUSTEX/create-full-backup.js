/**
 * Full Database Backup Script for FinTrustEX
 * Creates a complete backup in a single file (schema + data)
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

// Output file
const BACKUP_FILE = path.join(__dirname, 'fintrustex_full_backup.sql');

console.log('FinTrustEX Full Database Backup Tool');
console.log('===================================');

// Validate database connection details
if (!dbParams.host || !dbParams.database || !dbParams.user || !dbParams.password) {
  console.error('Error: Missing database connection parameters.');
  console.error('Please ensure the following environment variables are set:');
  console.error('PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD');
  process.exit(1);
}

try {
  console.log(`\nCreating full database backup to ${BACKUP_FILE}...`);
  
  // Export complete database (schema + data)
  const backupCmd = `PGPASSWORD=${dbParams.password} pg_dump -h ${dbParams.host} -p ${dbParams.port} -U ${dbParams.user} -d ${dbParams.database} --no-owner --no-acl > "${BACKUP_FILE}"`;
  execSync(backupCmd, { stdio: 'inherit' });
  
  console.log('\nFull database backup completed successfully!');
  console.log('\nInstructions for importing to a new database:');
  console.log('1. Create a new PostgreSQL database');
  console.log(`2. Import the backup: psql -h new_host -U new_user -d new_database < ${BACKUP_FILE}`);
  
  // Get file size
  const stats = fs.statSync(BACKUP_FILE);
  const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`\nBackup file size: ${fileSizeInMB} MB`);
  console.log(`Backup file location: ${BACKUP_FILE}`);
  
} catch (error) {
  console.error('\nError during database backup:', error.message);
}

// Display the current database URL (for reference)
console.log('\nCurrent DATABASE_URL:', process.env.DATABASE_URL);
console.log('\nTo use this database in another application, set the DATABASE_URL environment variable to the value above.');