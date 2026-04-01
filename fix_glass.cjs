const fs = require('fs');
['components/ui/Common.tsx', 'pages/Home.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/dark:glass-card/g, 'glass-card');
  fs.writeFileSync(file, code);
  console.log('Fixed glass-card in ' + file);
});
