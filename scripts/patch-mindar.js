/**
 * Post-install patch for mind-ar v1.2.5 compatibility with Three.js r152+
 * 
 * mind-ar's production bundle imports:
 * 1. `sRGBEncoding` from 'three' (removed in Three.js r152+)
 * 2. from 'three/addons/...' (should be 'three/examples/jsm/...')
 * 
 * This script patches the bundle to fix both issues.
 * Run: node scripts/patch-mindar.js
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'node_modules', 'mind-ar', 'dist', 'mindar-image-three.prod.js');

if (!fs.existsSync(filePath)) {
  console.log('mind-ar not installed, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

// Check if already patched
if (content.startsWith('const Si = 3001;')) {
  console.log('mind-ar already patched, skipping.');
  process.exit(0);
}

// Remove sRGBEncoding import from the 'three' import statement
content = content.replace('sRGBEncoding as Si,', '');
content = content.replace('sRGBEncoding as Si', '');

// Replace three/addons/ with three/examples/jsm/
content = content.replace(/from "three\/addons\//g, 'from "three/examples/jsm/');

// Add constant declaration at the top
content = 'const Si = 3001;\n' + content;

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ mind-ar patched successfully for Three.js r152+ compatibility');
