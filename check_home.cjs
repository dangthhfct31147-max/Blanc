const fs = require('fs');
let code = fs.readFileSync('pages/Home.tsx', 'utf8');
let matches = code.match(/className="[^"]*bg-white[^"]*"/g) || [];
let unfixed = matches.filter(c => !c.includes('dark:'));
console.log('UNFIXED bg-white in Home.tsx:');
console.log(unfixed);
