import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `                    {selectedPosters.length > 0 ? \`\${selectedPosters.reduce((sum, p) => sum + (posterQuantities[p.id] || (p.categoryHint === 'Stickers' ? 4 : 1)), 0)} Item\${selectedPosters.reduce((sum, p) => sum + (posterQuantities[p.id] || (p.categoryHint === 'Stickers' ? 4 : 1)), 0) !== 1 ? 's' : ''} Selected\` : ''}`;

const replacement1 = `                    {selectedPosters.length > 0 ? (() => {
                      const totalQty = selectedPosters.reduce((sum, p) => sum + (posterQuantities[p.id] || (p.categoryHint === 'Stickers' ? 4 : 1)), 0);
                      return \`\${totalQty} Item\${totalQty !== 1 ? 's' : ''} Selected - ₹\${totalQty * 40}\`;
                    })() : ''}`;

content = content.replace(new RegExp(target1.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replacement1);
fs.writeFileSync('src/App.tsx', content);
console.log('Successfully patched checkout bars');
