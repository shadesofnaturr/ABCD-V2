import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `              /* CATEGORIES HOME LIST */
              <div className="animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {[...FOLDER_CATEGORIES.map(c => c.name)].sort((a,b) => a === 'Others' ? 1 : b === 'Others' ? -1 : a.localeCompare(b)).map(categoryName => {`;

const replacement = `              /* CATEGORIES HOME LIST */
              <div className="animate-in fade-in duration-300">
                {/* Stickers Banner */}
                {(() => {
                  const categoryName = 'Stickers';
                  const isCatNameMatch = categoryName.toLowerCase().includes(folderSearchQuery.toLowerCase().trim());
                  const allCategoryFolders = folders.filter(f => getFolderCategory(f) === categoryName);
                  const categoryFolders = isCatNameMatch
                    ? allCategoryFolders
                    : allCategoryFolders.filter(f => (f.name || '').toLowerCase().includes(folderSearchQuery.toLowerCase().trim()));
                  
                  const isSearching = folderSearchQuery.trim().length > 0;
                  if (categoryFolders.length === 0 && isSearching) return null;

                  const cardPoster = categoryPosters[categoryName];
                  
                  return (
                    <div
                      key={categoryName}
                      onClick={() => navigateState({ selectedCategory: categoryName })}
                      className="group mb-8 border border-[#E5E5E5] bg-[#FDFBF7] hover:border-black transition-all hover:shadow-md duration-300 cursor-pointer overflow-hidden flex flex-row relative min-h-[160px] sm:min-h-[220px]"
                    >
                      <div className="p-6 sm:p-8 md:p-12 w-[60%] sm:w-1/2 flex flex-col justify-center relative z-10">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center border border-[#E5E5E5] bg-white rounded-none mb-4 sm:mb-6 group-hover:border-black transition-colors shadow-sm">
                          {getCategoryIcon(categoryName)}
                        </div>
                        <h3 className="text-lg sm:text-2xl font-bold uppercase tracking-[0.2em] text-black group-hover:translate-x-2 transition-transform duration-300 flex flex-wrap items-center gap-2 sm:gap-3">
                          {categoryName}
                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                        </h3>
                        <p className="text-[9px] sm:text-[11px] text-[#666] mt-2 sm:mt-3 uppercase tracking-widest font-bold max-w-sm leading-relaxed">
                          Exclusive premium stickers. Waterproof, highly detailed, perfect for custom aesthetics.
                        </p>
                      </div>
                      
                      {cardPoster && (
                        <div className="absolute right-0 top-0 bottom-0 w-[50%] z-0 bg-[#E5E5E5]">
                          <img 
                            src={cardPoster.thumbnailLink?.replace('=s220', '=s800')}
                            alt="Stickers Banner"
                            className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-[#FDFBF7] via-[#FDFBF7]/50 to-transparent" />
                          
                          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-black text-white px-2 py-1 sm:px-3 sm:py-1.5 text-[8px] sm:text-[9px] uppercase tracking-widest font-bold rotate-3 group-hover:-rotate-3 transition-transform duration-300 shadow-xl border border-white/20">
                            Best Sellers
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {[...FOLDER_CATEGORIES.map(c => c.name)].filter(n => n !== 'Stickers').sort((a,b) => a === 'Others' ? 1 : b === 'Others' ? -1 : a.localeCompare(b)).map(categoryName => {`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Successfully patched src/App.tsx');
} else {
  console.error('Target content not found!');
}
