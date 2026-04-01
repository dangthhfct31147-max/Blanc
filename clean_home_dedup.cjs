const fs = require('fs');
let code = fs.readFileSync('pages/Home.tsx', 'utf8');

code = code.replace(/className=(["'])(.*?)\1/g, (match, quote, classes) => {
    let parts = classes.split(/\s+/).filter(Boolean);
    let finalParts = [];
    parts.forEach(p => {
        if (!finalParts.includes(p)) {
            finalParts.push(p);
        }
    });
    return 'className="' + finalParts.join(' ') + '"';
});

fs.writeFileSync('pages/Home.tsx', code, 'utf8');
console.log('Home.tsx deduped successfully.');
