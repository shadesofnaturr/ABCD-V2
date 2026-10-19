const fs = require('fs');

const file = fs.readFileSync('src/App.tsx', 'utf8');

// The block to extract starts at `{sidebarView === 'my_orders' && (` and ends at the curly brace before `{sidebarView === 'notifications' && (`
const startStr = "              {sidebarView === 'my_orders' && (";
const endStr = "              {sidebarView === 'notifications' && (";

const startIndex = file.indexOf(startStr);
const endIndex = file.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start or end index");
  process.exit(1);
}

// We extract everything from inside the `sidebarView === 'my_orders'` block (lines 1737 to 1883)
const blockToExtract = file.substring(startIndex, endIndex);

// Remove the `              {sidebarView === 'my_orders' && (` and the closing `              )}`
// blockToExtract is something like:
/*
              {sidebarView === 'my_orders' && (
                <div className="space-y-6">
                  {selectedOrderFolder ? (
...
                  )}
                </div>
              )}

*/

// Now remove that block from the file
let modifiedFile = file.slice(0, startIndex) + file.slice(endIndex);

// Let's modify the extracted block slightly to fit the new context.
// Replace `navigateState({ isSidebarOpen: false, adminViewingOrder: order });` with `navigateState({ adminViewingOrder: order });`
let newContent = blockToExtract
  .replace("navigateState({ isSidebarOpen: false, adminViewingOrder: order });", "navigateState({ adminViewingOrder: order });")
  
  // We want the inner div starting with `<div className="space-y-6">`
let innerContentMatch = newContent.match(/<div className="space-y-6">([\s\S]*?)<\/div>\s*\}\s*\)\s*$/);
let innerContent = innerContentMatch ? innerContentMatch[0] : newContent; // Fallback

// We also need to strip out the very last `)}` which matches the sidebar wrapper if it's there
let lines = newContent.split('\n');
lines.shift(); // remove `{sidebarView === ...`
let closingIndex = lines.length - 1;
while(closingIndex > 0 && !lines[closingIndex].includes(')}')) closingIndex--;
if (closingIndex > 0) lines[closingIndex] = ''; // remove `)}`
newContent = lines.join('\n');

const mainInsertStart = "        ) : !currentFolder ? (";
const mainInsertIndex = modifiedFile.indexOf(mainInsertStart);

const viewContent = `        ) : isViewingMyOrders ? (
          /* MY ORDERS VIEW */
          <div className="min-h-screen">
            <header className="flex items-center justify-between mb-10 border-b border-[#E5E5E5] pb-6 sticky top-[72px] sm:top-20 bg-[#F7F7F7] z-20 pt-0 sm:pt-0">
              <div className="flex space-x-10">
                <span className="text-xs uppercase tracking-[0.2em] font-bold border-b-2 border-black pb-2 -mb-6">Your Orders</span>
              </div>
            </header>
            
${newContent}
          </div>
`;

modifiedFile = modifiedFile.slice(0, mainInsertIndex) + viewContent + modifiedFile.slice(mainInsertIndex);

fs.writeFileSync('src/App.tsx', modifiedFile);
console.log("Successfully moved my_orders to main view");
