const fs = require('fs');
let code = fs.readFileSync('components/Layout.tsx', 'utf8');

// The replacement was broken because PowerShell ate the variable. Restore Layout.tsx first!
code = fs.readFileSync('Layout.backup.tsx', 'utf8');

code = code.replace(/bg-white/g, 'bg-white dark:bg-slate-900');
code = code.replace(/bg-slate-50\b/g, 'bg-slate-50 dark:bg-slate-800/50');
code = code.replace(/text-slate-(800|900)/g, 'text-slate-$1 dark:text-slate-100');
code = code.replace(/text-slate-(600|700)/g, 'text-slate-$1 dark:text-slate-300');
code = code.replace(/text-slate-(400|500)/g, 'text-slate-$1 dark:text-slate-400');
code = code.replace(/border-slate-(100|200)/g, 'border-slate-$1 dark:border-slate-800');
code = code.replace(/backdrop-blur-md\b/g, 'backdrop-blur-xl dark:bg-slate-900/80');

code = code.replace(/className=(["'])(.*?)\1/g, (match, quote, classes) => {
    let parts = classes.split(/\s+/).filter(Boolean);
    let seenDark = new Set();
    let finalParts = [];
    parts.forEach(p => {
        if (p.startsWith('dark:')) {
            let base = p.split(':')[1].split('-').slice(0, 2).join('-');
            if (p.startsWith('dark:shadow')) base = 'shadow';
            if (p.startsWith('dark:border')) base = 'border';
            if (p.startsWith('dark:bg')) base = 'bg';
            
            if (!seenDark.has(base)) {
                seenDark.add(base);
                finalParts.push(p);
            }
        } else {
            finalParts.push(p);
        }
    });
    return 'className=' + quote + finalParts.join(' ') + quote;
});

fs.writeFileSync('components/Layout.tsx', code, 'utf8');
console.log('Fixed powershell eating variables');
