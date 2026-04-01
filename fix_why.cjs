const fs = require('fs');
let code = fs.readFileSync('components/home/WhyContestHubNeedsToExist.tsx', 'utf8');

// Title
code = code.replace(
  "text-3xl md:text-5xl font-black text-slate-900 tracking-tight",
  "text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight"
);

// Lead text
code = code.replace(
  "text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed",
  "text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed"
);

// Block background
code = code.replace(
  "bg-white border-y border-slate-200 py-24",
  "bg-white dark:bg-slate-950/50 border-y border-slate-200 dark:border-slate-800/80 py-24 relative overflow-hidden"
);

// Cards
code = code.replace(
  /bg-slate-50 border border-slate-100/g,
  "bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.15)]"
);

// Card Text
code = code.replace(
  /text-xl font-bold text-slate-900/g,
  "text-xl font-bold text-slate-900 dark:text-slate-100"
);
code = code.replace(
  /text-slate-600 leading-relaxed/g,
  "text-slate-600 dark:text-slate-400 leading-relaxed"
);

// Gradient backgrounds inside the cards (we'll just let them have dark classes)
code = code.replace(
  /bg-white shadow-sm ring-1 ring-slate-900\/5/g,
  "bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10"
);

fs.writeFileSync('components/home/WhyContestHubNeedsToExist.tsx', code);
console.log('Fixed WhyContestHubNeedsToExist.tsx');
