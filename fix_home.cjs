const fs = require('fs');
let code = fs.readFileSync('pages/Home.tsx', 'utf8');

// Hero Background
code = code.replace(
  'className="relative bg-white pt-0 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden"',
  'className="relative bg-white dark:bg-slate-950 pt-0 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden"'
);
code = code.replace(
  'className="absolute top-0 left-1/2 w-full -translate-x-1/2 h-full bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary-50 via-white to-white pointer-events-none"',
  'className="absolute top-0 left-1/2 w-full -translate-x-1/2 h-full bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary-50 via-white to-white dark:from-primary-900/20 dark:via-slate-950 dark:to-slate-950 pointer-events-none"'
);

// Hero Typo
code = code.replace(
  'className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6"',
  'className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6"'
);
code = code.replace(
  'className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto"',
  'className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto"'
);

// Search Box
code = code.replace(
  'w-full h-12 pl-12 pr-10 rounded-full border border-slate-200 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none',
  'w-full h-12 pl-12 pr-10 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none dark:focus:ring-primary-500/50'
);
code = code.replace(
  'absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 max-h-96 overflow-y-auto',
  'absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 max-h-96 overflow-y-auto dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
);
code = code.replace(
  /bg-slate-50 text-xs font-semibold text-slate-500/g,
  'bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400'
);
code = code.replace(
  /hover:bg-slate-50 cursor-pointer flex items-center/g,
  'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex items-center'
);
code = code.replace(
  /font-medium text-slate-900 truncate/g,
  'font-medium text-slate-900 dark:text-slate-200 truncate'
);
code = code.replace(
  /text-xs text-slate-500/g,
  'text-xs text-slate-500 dark:text-slate-400'
);
code = code.replace(
  'px-4 py-3 bg-slate-50 border-t border-slate-100',
  'px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800'
);


// Stats Area
code = code.replace(
  'className="absolute inset-0 bg-linear-to-r from-primary-50 via-white to-emerald-50"',
  'className="absolute inset-0 bg-linear-to-r from-primary-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"'
);
code = code.replace(
  'className="absolute -left-20 top-0 w-72 h-72 bg-primary-200/60 blur-3xl"',
  'className="absolute -left-20 top-0 w-72 h-72 bg-primary-200/60 dark:bg-primary-900/10 blur-3xl rounded-full"'
);
code = code.replace(
  'className="absolute -right-30 -bottom-30 w-80 h-80 bg-emerald-200/60 blur-3xl"',
  'className="absolute -right-30 -bottom-30 w-80 h-80 bg-emerald-200/60 dark:bg-emerald-900/10 blur-3xl rounded-full"'
);
code = code.replace(
  'className="text-3xl md:text-4xl font-black text-slate-900"',
  'className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white"'
);
code = code.replace(
  'className="text-slate-600 max-w-3xl"',
  'className="text-slate-600 dark:text-slate-400 max-w-3xl"'
);

// Stat Cards
code = code.replace(
  'bg-white/85 backdrop-blur border border-white/60 shadow-lg shadow-primary-100/60',
  'bg-white/85 dark:bg-slate-800/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 shadow-lg shadow-primary-100/60 dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
);
code = code.replace(
  'bg-linear-to-br from-white via-white to-primary-50',
  'bg-linear-to-br from-white via-white to-primary-50 dark:from-slate-800/0 dark:via-slate-800/0 dark:to-primary-900/20'
);
code = code.replace(
  'bg-primary-100 blur-2xl opacity-70',
  'bg-primary-100 dark:bg-primary-900/40 blur-2xl opacity-70 dark:opacity-40'
);
code = code.replace(
  'bg-emerald-100 blur-2xl opacity-80',
  'bg-emerald-100 dark:bg-emerald-900/40 blur-2xl opacity-80 dark:opacity-40'
);

// Texts inside stat cards
code = code.replace(
  /text-xs font-semibold text-slate-500/g,
  'text-xs font-semibold text-slate-500 dark:text-slate-400'
);
code = code.replace(
  /text-sm font-semibold text-slate-900/g,
  'text-sm font-semibold text-slate-900 dark:text-slate-200'
);
code = code.replace(
  /text-emerald-700 bg-emerald-50/g,
  'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
);
code = code.replace(
  /border-emerald-100/g,
  'border-emerald-100 dark:border-emerald-500/20'
);
code = code.replace(
  /text-4xl font-black text-slate-900/g,
  'text-4xl font-black text-slate-900 dark:text-white'
);

// Contests Header
code = code.replace(
  'text-2xl font-bold text-slate-900',
  'text-2xl font-bold text-slate-900 dark:text-white'
);
code = code.replace(
  'text-slate-500 mt-1',
  'text-slate-500 dark:text-slate-400 mt-1'
);

// Skeletons
code = code.replace(
  /bg-slate-200/g,
  'bg-slate-200 dark:bg-slate-700/50'
);
code = code.replace(
  /bg-slate-100/g,
  'bg-slate-100 dark:bg-slate-700/30'
);

// Contest Card typography
code = code.replace(
  'text-lg font-bold text-slate-900 mb-2 group-hover:text-primary-600',
  'text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400'
);
code = code.replace(
  'text-sm text-slate-500 mb-4',
  'text-sm text-slate-500 dark:text-slate-300 mb-4'
);
code = code.replace(
  'border-t border-slate-100',
  'border-t border-slate-100 dark:border-slate-800'
);
code = code.replace(
  'font-medium text-slate-900',
  'font-medium text-slate-900 dark:text-slate-200'
);

// Courses Section
code = code.replace(
  'section className="bg-slate-100 py-16"',
  'section className="bg-slate-50 dark:bg-slate-900/40 py-16"'
);
code = code.replace(
  'text-2xl font-bold text-slate-900',
  'text-2xl font-bold text-slate-900 dark:text-white'
);

// Course Card Typography
code = code.replace(
  'font-bold text-slate-900 mb-1 line-clamp-1 group-hover:text-primary-600',
  'font-bold text-slate-900 dark:text-slate-100 mb-1 line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400'
);
code = code.replace(
  'Badge className="bg-slate-100 text-slate-600 border-0"',
  'Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-0"'
);

// How it works
code = code.replace(
  'text-2xl font-bold text-slate-900 mb-12',
  'text-2xl font-bold text-slate-900 dark:text-white mb-12'
);
code = code.replace(
  'bg-white border border-slate-100 shadow-sm',
  'bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] dark:glass-card'
);
code = code.replace(
  'text-6xl font-black text-slate-100 absolute',
  'text-6xl font-black text-slate-100 dark:text-slate-800 absolute'
);
code = code.replace(
  'text-lg font-bold text-slate-900 mb-2',
  'text-lg font-bold text-slate-900 dark:text-slate-100 mb-2'
);

fs.writeFileSync('pages/Home.tsx', code);
console.log('Fixed Home.tsx');
