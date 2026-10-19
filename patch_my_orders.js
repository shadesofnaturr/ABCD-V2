import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Fix the sort logic to just use the reversed array from api.ts
const sortTarget = `const sortedSheetOrders = [...sheetOrders].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
      });`;
const sortReplacement = `const sortedSheetOrders = [...sheetOrders]; // Already reversed from api.ts (newest to oldest)`;
content = content.replace(sortTarget, sortReplacement);

// 2. Fix the click handler in My Orders view
const clickTarget = `onClick={() => {
                                navigateState({ adminViewingOrder: order });
                              }}`;
const clickReplacement = `onClick={() => {
                                navigateState({ selectedSheetOrder: order });
                              }}`;
content = content.replace(clickTarget, clickReplacement);

fs.writeFileSync('src/App.tsx', content);
console.log('Successfully patched My Orders logic');
