import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// I will just use string replacement on the whole Left/Right button block

const targetBlock = `              {/* Left/Top: Image Preview Panel */}
              <div className="flex-1 bg-[#F9F9F9] flex items-center justify-center relative p-6 md:p-12 border-b md:border-b-0 md:border-r border-[#E5E5E5] h-[55%] md:h-full min-h-[300px]">
                {/* Left/Right buttons on the poster image switch layout between portrait and landscape */}
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handlePreviewModeChange(poster.id, previewMode === 'landscape' ? 'portrait' : 'landscape'); 
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg active:scale-95 flex items-center justify-center text-black z-10 transition-all pointer-events-auto border border-gray-100"
                  title="Switch and preview in landscape/portrait mode"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handlePreviewModeChange(poster.id, previewMode === 'landscape' ? 'portrait' : 'landscape'); 
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg active:scale-95 flex items-center justify-center text-black z-10 transition-all pointer-events-auto border border-gray-100"
                  title="Switch and preview in landscape/portrait mode"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Main image */}
                <div className="w-full h-full flex items-center justify-center overflow-hidden p-4 sm:p-6 md:p-8">
                  <div
                    className={cn(
                      "transition-all duration-500 shadow-2xl bg-white overflow-hidden rounded-[2px] ease-in-out flex items-center justify-center",
                      previewMode === 'landscape' 
                        ? "h-[85%] sm:h-[90%] max-h-[480px] aspect-[1.414/1] w-auto max-w-[80%]" 
                        : "h-[90%] sm:h-[95%] max-h-[520px] aspect-[1/1.414] w-auto max-w-[90%]"
                    )}`;

const replacementBlock = `              {/* Left/Top: Image Preview Panel */}
              <div 
                className="flex-1 bg-[#F9F9F9] flex items-center justify-center relative p-6 md:p-12 border-b md:border-b-0 md:border-r border-[#E5E5E5] h-[55%] md:h-full min-h-[300px]"
                onTouchStart={(e) => {
                  window.__touchStartX = e.touches[0].clientX;
                }}
                onTouchEnd={(e) => {
                  if (window.__touchStartX === undefined || window.__touchStartX === null) return;
                  const touchEndX = e.changedTouches[0].clientX;
                  const diffX = window.__touchStartX - touchEndX;
                  if (diffX > 50 && nextPoster) {
                    setPreviewingPoster(nextPoster);
                  } else if (diffX < -50 && prevPoster) {
                    setPreviewingPoster(prevPoster);
                  }
                  window.__touchStartX = null;
                }}
              >
                {/* Left/Right buttons navigate to prev/next design */}
                {prevPoster && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setPreviewingPoster(prevPoster);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg active:scale-95 flex items-center justify-center text-black z-10 transition-all pointer-events-auto border border-gray-100"
                    title="Previous design"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                
                {nextPoster && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setPreviewingPoster(nextPoster);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg active:scale-95 flex items-center justify-center text-black z-10 transition-all pointer-events-auto border border-gray-100"
                    title="Next design"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}

                {/* Main image */}
                <div className="w-full h-full flex items-center justify-center overflow-hidden p-4 sm:p-6 md:p-8">
                  <div
                    className={cn(
                      "transition-all duration-500 shadow-2xl bg-white overflow-hidden rounded-[2px] ease-in-out flex items-center justify-center",
                      "h-[90%] sm:h-[95%] max-h-[520px] aspect-[1/1.414] w-auto max-w-[90%]"
                    )}`;

if (content.includes(targetBlock)) {
  content = content.replace(targetBlock, replacementBlock);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Successfully patched modal left/right logic');
} else {
  console.error('Modal left/right block not found!');
}
