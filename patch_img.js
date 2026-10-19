import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetBlock = `                <div className="w-full h-full flex items-center justify-center overflow-hidden p-4 sm:p-6 md:p-8">
                  <div
                    className={cn(
                      "transition-all duration-500 shadow-2xl bg-white overflow-hidden rounded-[2px] ease-in-out flex items-center justify-center",
                      "h-[90%] sm:h-[95%] max-h-[520px] aspect-[1/1.414] w-auto max-w-[90%]"
                    )}
                  >
                    <img
                      src={poster.thumbnailLink?.replace('=s220', '=s800')}
                      alt={formatPosterName(poster.name)}
                      className="w-full h-full object-fill transition-all duration-500 ease-in-out"
                    />
                  </div>
                </div>`;

const replacementBlock = `                <div className="w-full h-full flex items-center justify-center p-4 sm:p-6 md:p-8">
                  <img
                    src={poster.thumbnailLink?.replace('=s220', '=s800')}
                    alt={formatPosterName(poster.name)}
                    className="max-w-full max-h-full object-contain shadow-2xl bg-white rounded-[2px] transition-all duration-500 ease-in-out"
                    referrerPolicy="no-referrer"
                  />
                </div>`;

if (content.includes(targetBlock)) {
  content = content.replace(targetBlock, replacementBlock);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Successfully patched image preview');
} else {
  console.error('Image block not found!');
}
