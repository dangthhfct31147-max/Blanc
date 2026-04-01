const fs = require('fs');
const code = fs.readFileSync('components/Layout.tsx', 'utf8');
const classNames = code.match(/className=(["'])([^\1]*?)\1/g) || [];
const bad = classNames.filter(c => c.includes('bg-white') && !c.includes('dark:'));
console.log(bad);
