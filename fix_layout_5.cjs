const fs = require('fs');
let code = fs.readFileSync('components/Layout.tsx', 'utf8');

// deduplicate classes
const dedup = (str) => {
  return str.split(' ').filter((item, pos, self) => item && self.indexOf(item) == pos).join(' ');
};

code = code.replace(/className="([^"]+)"/g, (match, classes) => {
  return 'className="' + dedup(classes) + '"';
});

code = code.replace(/className=\{([^]+)\}/g, (match, classes) => {
  return 'className={' + dedup(classes) + '}';
});

fs.writeFileSync('components/Layout.tsx', code);
console.log('Deduped Layout.tsx');
