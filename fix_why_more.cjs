const fs = require('fs');
let code = fs.readFileSync('components/home/WhyContestHubNeedsToExist.tsx', 'utf8');

// 35: sectionBadge
code = code.replace(
  "border-primary-100 bg-white/90 text-primary-700",
  "border-primary-100 dark:border-primary-900/50 bg-white/90 dark:bg-slate-900/90 text-primary-700 dark:text-primary-400"
);

// 339:
code = code.replace(
  "border border-slate-200/80 bg-white/95 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.18)] ring-1 ring-white/70",
  "border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.18)] dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)] ring-1 ring-white/70 dark:ring-white/5"
);

// 452
code = code.replace(
  "border border-white/50 bg-white/80 px-5 py-3.5 shadow-lg shadow-slate-900/8",
  "border border-white/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 px-5 py-3.5 shadow-lg shadow-slate-900/8 dark:shadow-black/20"
);

// 522
code = code.replace(
  "border border-white/70 bg-white/90 px-6 py-8 text-center shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] ring-1 ring-white/70",
  "border border-white/70 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 px-6 py-8 text-center shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)] ring-1 ring-white/70 dark:ring-white/5"
);

// 533
code = code.replace(
  "border border-white/80 bg-white shadow-lg shadow-primary-200/50 ring-4 ring-primary-50/70",
  "border border-white/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 shadow-lg shadow-primary-200/50 dark:shadow-primary-900/30 ring-4 ring-primary-50/70 dark:ring-primary-900/20"
);

fs.writeFileSync('components/home/WhyContestHubNeedsToExist.tsx', code);
