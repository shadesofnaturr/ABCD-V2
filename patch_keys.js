import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewingPoster) return;
      
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const currentMode = previewModes[previewingPoster.id] || 'portrait';
        handlePreviewModeChange(previewingPoster.id, currentMode === 'landscape' ? 'portrait' : 'landscape');
      } else if (e.key === 'Escape') {
        setPreviewingPoster(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewingPoster, previewModes]);`;

const replacement = `    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewingPoster) return;
      
      const activeList = isViewingWishlist ? wishlistedPosters : posters;
      const idx = activeList.findIndex(p => p.id === previewingPoster.id);
      const prevPoster = idx > 0 ? activeList[idx - 1] : null;
      const nextPoster = idx !== -1 && idx < activeList.length - 1 ? activeList[idx + 1] : null;

      if (e.key === 'ArrowLeft' && prevPoster) {
        setPreviewingPoster(prevPoster);
      } else if (e.key === 'ArrowRight' && nextPoster) {
        setPreviewingPoster(nextPoster);
      } else if (e.key === 'Escape') {
        setPreviewingPoster(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewingPoster, posters, wishlistedPosters, isViewingWishlist]);`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Successfully patched keys!');
} else {
  console.log('Keys target not found.');
}
