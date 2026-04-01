const fs = require('fs');
let code = fs.readFileSync('components/Layout.tsx', 'utf8');

// text-slate
code = code.replace(/text-slate-900(?! dark:)/g, 'text-slate-900 dark:text-white');
code = code.replace(/text-slate-800(?! dark:)/g, 'text-slate-800 dark:text-slate-100');
code = code.replace(/text-slate-700(?! hover:| dark:)/g, 'text-slate-700 dark:text-slate-200');
code = code.replace(/text-slate-600(?! hover:| dark:)/g, 'text-slate-600 dark:text-slate-300');
code = code.replace(/text-slate-500(?! hover:| dark:)/g, 'text-slate-500 dark:text-slate-400');
code = code.replace(/text-slate-400(?! hover:| dark:)/g, 'text-slate-400 dark:text-slate-500');

// text-slate hover overrides
code = code.replace(/hover:text-slate-700/g, 'hover:text-slate-700 dark:hover:text-slate-200');

// bg-slate
code = code.replace(/bg-slate-100(?! dark:| text-slate-800)/g, 'bg-slate-100 dark:bg-slate-800/60');
code = code.replace(/bg-slate-50(?! dark:)/g, 'bg-slate-50 dark:bg-slate-800/40');
code = code.replace(/hover:bg-slate-50(?! dark:)/g, 'hover:bg-slate-50 dark:hover:bg-slate-800/60');
code = code.replace(/hover:bg-slate-200/g, 'hover:bg-slate-200 dark:hover:bg-slate-700/60');
code = code.replace(/hover:bg-slate-100(?! dark:)/g, 'hover:bg-slate-100 dark:hover:bg-slate-800/60');

// Note: special case for notification bell: g-slate-100 text-slate-800 is active state
code = code.replace(
  /\/g,
  "\"
);

fs.writeFileSync('components/Layout.tsx', code);
