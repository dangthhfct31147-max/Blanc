const fs = require('fs');
let code = fs.readFileSync('components/CommandPalette.tsx', 'utf8');

// Overlay
code = code.replace(
  "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm",
  "fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
);

// Box
code = code.replace(
  "w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden",
  "w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl dark:shadow-[0_16px_64px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 overflow-hidden"
);

// Input Container
code = code.replace(
  "border-b border-slate-100",
  "border-b border-slate-100 dark:border-slate-800"
);
code = code.replace(
  "text-slate-500",
  "text-slate-500 dark:text-slate-400"
);
code = code.replace(
  "w-full bg-transparent px-4 py-4 text-lg text-slate-900",
  "w-full bg-transparent px-4 py-4 text-lg text-slate-900 dark:text-white"
);
code = code.replace(
  "placeholder:text-slate-400",
  "placeholder:text-slate-400 dark:placeholder:text-slate-500"
);

// Footer
code = code.replace(
  "bg-slate-50 border-t border-slate-100",
  "bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800"
);
code = code.replace(
  /text-slate-500/g,
  "text-slate-500 dark:text-slate-400"
);

// Section Titles
code = code.replace(
  "text-xs font-semibold text-slate-400 uppercase",
  "text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase"
);

// Items hover and active
code = code.replace(
  /bg-slate-50/g,
  "bg-slate-50 dark:bg-slate-800/60"
);
code = code.replace(
  /hover:bg-slate-50/g,
  "hover:bg-slate-50 dark:hover:bg-slate-800/60"
);
code = code.replace(
  /text-slate-900/g,
  "text-slate-900 dark:text-slate-100"
);

fs.writeFileSync('components/CommandPalette.tsx', code);
console.log('Fixed CommandPalette.tsx');
