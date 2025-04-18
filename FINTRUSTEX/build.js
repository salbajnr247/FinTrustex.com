const { execSync } = require('child_process');
const fs = require('fs');

console.log('Building project...');

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

try {
  // Compile TypeScript
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('TypeScript compilation successful!');
  
  // Copy .env file to dist if it exists
  if (fs.existsSync('.env')) {
    fs.copyFileSync('.env', 'dist/.env');
    console.log('Copied .env file to dist directory');
  }
  
  console.log('Build complete!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}