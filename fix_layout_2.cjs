const fs = require('fs');
let code = fs.readFileSync('components/Layout.tsx', 'utf8');

// Header Dropdowns
code = code.replace(
  /w-52 bg-white rounded-xl shadow-xl border border-slate-100 p-1/g,
  "w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 p-1"
);

// Group hover dropdown
code = code.replace(
  "w-48 bg-white rounded-xl shadow-lg py-1 border border-slate-100",
  "w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] py-1 border border-slate-100 dark:border-slate-800"
);

// Mobile Site Menu
code = code.replace(
  "className=\"md:hidden bg-white border-b border-slate-200\"",
  "className=\"md:hidden bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/60\""
);

// Info / Blog Banners
code = code.replace(
  "bg-white/95 backdrop-blur-md",
  "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md"
);
code = code.replace(
  "border-amber-100",
  "border-amber-100 dark:border-amber-900/30"
);

// Floating containers
code = code.replace(
  /border border-slate-100 bg-white shadow-(lg|md|xl) shadow-slate-200\/(60|40|50)/g,
  "border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow- dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
);

// Form / Info containers
code = code.replace(
  /border border-white\/80 bg-white\/70/g,
  "border border-white/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/70"
);

fs.writeFileSync('components/Layout.tsx', code);
