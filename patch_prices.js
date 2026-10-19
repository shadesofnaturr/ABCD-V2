import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `<h3 className="text-[11px] font-bold uppercase tracking-wider mb-1 text-[#1A1A1A] truncate">{formatPosterName(poster.name)}</h3>
                                  {poster.description && (`;

const replacement1 = `<h3 className="text-[11px] font-bold uppercase tracking-wider mb-1 text-[#1A1A1A] truncate">{formatPosterName(poster.name)}</h3>
                                  <p className="text-[11px] font-bold text-black mt-1 mb-1">₹40</p>
                                  {poster.description && (`;

content = content.replace(new RegExp(target1.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replacement1);

const target2 = `<h3 className="text-[11px] font-bold uppercase tracking-wider mb-1 text-[#1A1A1A] truncate">{formatPosterName(poster.name)}</h3>
                                  {poster.description && (`;

// Already replaced globally, but wait, both were the same string! Let's check.
const countReplaced = (content.match(/₹40/g) || []).length;
console.log('Replaced in cards:', countReplaced);

const target3 = `<h2 className="text-base sm:text-xl font-bold uppercase tracking-wider text-black mb-2 line-clamp-2">
                    {formatPosterName(poster.name)}
                  </h2>
                  
                  {poster.description && (`

const replacement3 = `<h2 className="text-base sm:text-xl font-bold uppercase tracking-wider text-black mb-2 line-clamp-2">
                    {formatPosterName(poster.name)}
                  </h2>
                  <p className="text-sm font-bold text-black mb-4">₹40</p>
                  
                  {poster.description && (`

content = content.replace(target3, replacement3);

const target4 = `<label className="block text-[10px] uppercase tracking-[0.15em] text-[#999] font-semibold mb-6">01 / Selected Items ({selectedPosters.reduce((sum, p) => sum + (posterQuantities[p.id] || (p.categoryHint === 'Stickers' ? 4 : 1)), 0)})</label>`;
const replacement4 = `<label className="block text-[10px] uppercase tracking-[0.15em] text-[#999] font-semibold mb-6">
                01 / Selected Items ({selectedPosters.reduce((sum, p) => sum + (posterQuantities[p.id] || (p.categoryHint === 'Stickers' ? 4 : 1)), 0)}) - ₹{selectedPosters.reduce((sum, p) => sum + (posterQuantities[p.id] || (p.categoryHint === 'Stickers' ? 4 : 1)), 0) * 40}
              </label>`;
              
content = content.replace(target4, replacement4);

fs.writeFileSync('src/App.tsx', content);
console.log('Done');
