const fs = require('fs');
let code = fs.readFileSync('components/Layout.tsx', 'utf8');

// Header Styles
code = code.replace(
  'header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 dark:bg-slate-900/80 dark:border-slate-800"',
  'header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200 dark:bg-slate-950/70 dark:border-slate-800/60 dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]"'
);

// Desktop Nav Link Class
code = code.replace(
  /'bg-primary-50 text-primary-700 shadow-sm shadow-primary-100\/70'/g,
  "'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 shadow-sm shadow-primary-100/70 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_12px_rgba(99,102,241,0.2)] dark:border dark:border-primary-700/30'"
);
code = code.replace(
  /'text-slate-600 hover:text-primary-600 hover:bg-slate-50'/g,
  "'text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'"
);
code = code.replace(
  /'bg-slate-50 text-primary-600'/g,
  "'bg-slate-50 dark:bg-slate-800/80 text-primary-600 dark:text-primary-400'"
);

// Search Bar placeholder (if any)
code = code.replace(
  'absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden',
  'absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
);

// Notifications Popover
code = code.replace(
  "p-4 border-b border-slate-100 flex justify-between items-center bg-white",
  "p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900"
);
code = code.replace(
  "font-bold text-slate-900",
  "font-bold text-slate-900 dark:text-slate-100"
);
code = code.replace(
  "hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50",
  "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-800/50"
);
code = code.replace(
  "!notif.isRead ? 'bg-primary-50/30' : ''",
  "!notif.isRead ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''"
);
code = code.replace(
  "!notif.isRead ? 'bg-white shadow-sm' : 'bg-slate-100'",
  "!notif.isRead ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-100 dark:bg-slate-800/50'"
);
code = code.replace(
  "!notif.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'",
  "!notif.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'"
);
code = code.replace(
  "text-xs text-slate-500 line-clamp-2",
  "text-xs text-slate-500 dark:text-slate-400 line-clamp-2"
);

// User Dropdown Profiles
code = code.replace(
  "absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden",
  "absolute right-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
);
code = code.replace(
  "p-4 border-b border-slate-100 bg-slate-50/50",
  "p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
);
code = code.replace(
  "text-sm font-bold text-slate-900",
  "text-sm font-bold text-slate-900 dark:text-white"
);
code = code.replace(
  "hover:bg-slate-50 transition-colors",
  "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-700 dark:text-slate-300"
);

// Mobile Menu
code = code.replace(
  "fixed inset-0 z-40 bg-white md:hidden overflow-y-auto",
  "fixed inset-0 z-40 bg-white dark:bg-slate-950 md:hidden overflow-y-auto"
);
code = code.replace(
  "text-slate-500 hover:text-primary-600 hover:bg-slate-50",
  "text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
);
code = code.replace(
  "border-t border-slate-200",
  "border-t border-slate-200 dark:border-slate-800/60"
);

fs.writeFileSync('components/Layout.tsx', code);
console.log('Fixed Layout.tsx');
