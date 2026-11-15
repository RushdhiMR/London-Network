const fs = require('fs');
const path = require('path');

const srcNext = path.join(__dirname, '..', 'frontend', '.next');
const destNext = path.join(__dirname, '..', '.next');
const srcPublic = path.join(__dirname, '..', 'frontend', 'public');
const destPublic = path.join(__dirname, '..', 'public');

if (fs.existsSync(srcNext)) {
  fs.cpSync(srcNext, destNext, { recursive: true });
  console.log('Successfully copied frontend/.next to .next');
}

if (fs.existsSync(srcPublic) && !fs.existsSync(destPublic)) {
  fs.cpSync(srcPublic, destPublic, { recursive: true });
  console.log('Successfully copied frontend/public to public');
}
