const fs = require('fs');
const path = require('path');

const expPath = path.join(__dirname, '..', 'hub', 'explorer.html');
const content = fs.readFileSync(expPath, 'utf8');

console.log('127.0.0.1 in explorer:', content.match(/127\.0\.0\.1[^\s"']*/g));
console.log('POOL_NAMES in explorer:', content.includes('POOL_NAMES'));
console.log('triggerNextClaim in explorer:', content.includes('triggerNextClaim'));
console.log('fetchLiveClaims in explorer:', content.includes('fetchLiveClaims'));
