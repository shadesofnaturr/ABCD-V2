import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `<span className="text-[11px] font-bold text-black truncate w-full" title={formatPosterName(pp.name)}>{formatPosterName(pp.name)}</span>`;
const replacement1 = `<span className="text-[11px] font-bold text-black truncate w-full" title={formatPosterName(pp.name)}>{formatPosterName(pp.name)}</span>
                      <span className="text-[11px] font-bold text-black mt-1">₹40</span>`;
                      
content = content.replace(new RegExp(target1.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replacement1);

fs.writeFileSync('src/App.tsx', content);
console.log('Done summary');
