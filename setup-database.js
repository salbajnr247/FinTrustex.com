const { spawn } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('Setting up database...');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  console.error('Please make sure you have a PostgreSQL database available.');
  process.exit(1);
}

// Run the database migration script
console.log('Running database migration script...');
const migration = spawn('node', ['FINTRUSTEX/server/db-migrate.js'], {
  stdio: 'inherit'
});

migration.on('close', (code) => {
  if (code === 0) {
    console.log('Database setup complete!');
    console.log('You can now start the server with:');
    console.log('  npm start');
    console.log('Or for development with auto-reload:');
    console.log('  npm run dev');
  } else {
    console.error(`Migration script exited with code ${code}`);
    process.exit(code);
  }
});