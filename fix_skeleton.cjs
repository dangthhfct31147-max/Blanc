const fs = require('fs');
let code = fs.readFileSync('pages/Home.tsx', 'utf8');

code = code.replace(
  'className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur p-6 shadow-lg shadow-primary-100/50 animate-pulse"',
  'className="relative overflow-hidden rounded-2xl border border-white/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-800/50 backdrop-blur p-6 shadow-lg shadow-primary-100/50 dark:shadow-none animate-pulse"'
);

fs.writeFileSync('pages/Home.tsx', code);
