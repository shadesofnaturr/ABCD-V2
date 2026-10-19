import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace all sticker quantity limits from 8 to 4
content = content.replace(/Stickers' \? 8 :/g, "Stickers' ? 4 :");
content = content.replace(/isSticker \? 8 :/g, "isSticker ? 4 :");
content = content.replace(/currentQty <= 8/g, "currentQty <= 4");
content = content.replace(/safeVal < 8\) safeVal = 8/g, "safeVal < 4) safeVal = 4");
content = content.replace(/currentQty === 0 \? 8 :/g, "currentQty === 0 ? 4 :");
content = content.replace(/\(Min 8,/g, "(Min 4,");
content = content.replace(/'Stickers' \? "8" :/g, "'Stickers' ? \"4\" :");

fs.writeFileSync('src/App.tsx', content);
console.log('Successfully patched quantities');
