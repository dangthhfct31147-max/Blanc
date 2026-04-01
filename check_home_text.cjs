const fs = require('fs');
let code = fs.readFileSync('pages/Home.tsx', 'utf8');
let matches = code.match(/className="[^"]*text-slate-(800|900|950)[^"]*"/g) || [];
let unfixed = matches.filter(c => !c.includes('dark:'));
console.log('UNFIXED dark text in Home.tsx:');
console.log(unfixed);
