import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target2 = `const isSearching = folderSearchQuery.trim().length > 0;
                    if (categoryFolders.length === 0) {
                      if (categoryName !== 'Stickers' || isSearching) return null;
                    }`;

const replacement2 = `if (categoryFolders.length === 0) return null;`;

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Successfully patched grid logic');
} else {
  console.error('Target 2 content not found!');
}
