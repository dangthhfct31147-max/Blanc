const fs = require('fs');
let code = fs.readFileSync('components/PinnedNewsSlider.tsx', 'utf8');

// Title/Text
code = code.replace(
  /font-bold text-slate-900/g,
  "font-bold text-slate-900 dark:text-white"
);
code = code.replace(
  /text-slate-600/g,
  "text-slate-600 dark:text-slate-300"
);
code = code.replace(
  /text-slate-500/g,
  "text-slate-500 dark:text-slate-400"
);

// Card
code = code.replace(
  /bg-white/g,
  "bg-white dark:bg-slate-900/80 dark:backdrop-blur-md"
);
code = code.replace(
  /border border-slate-100/g,
  "border border-slate-100 dark:border-slate-800/60"
);

// Dots
code = code.replace(
  /bg-slate-300/g,
  "bg-slate-300 dark:bg-slate-700"
);
code = code.replace(
  /bg-slate-800/g,
  "bg-slate-800 dark:bg-slate-200"
);

fs.writeFileSync('components/PinnedNewsSlider.tsx', code);
console.log('Fixed PinnedNewsSlider.tsx');
