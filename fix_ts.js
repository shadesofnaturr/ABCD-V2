import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/window.__touchStartX/g, '(window as any).__touchStartX');
fs.writeFileSync('src/App.tsx', content);
