import React, { useEffect, useState } from 'react';
import { buildOrderPDF, PRINT_SIZE_KEYS } from './lib/pdf';
import { ShoppingCart, CheckCircle, ChevronLeft, ChevronRight, Image as ImageIcon, Folder, Loader2, ArrowRight, Edit2, Trash2, X, Search, Menu, User as UserIcon, Bell, Phone, Mail, Instagram, ShoppingBag, Heart, LayoutGrid, List, Sparkles, Car, Smile, Compass, Film, Zap, BookOpen, Music, Trophy, Star } from 'lucide-react';
import { getRootFolders, getFoldersInFolder, getImagesInFolder, getOrCreateOrdersSheet, appendOrderRow, appendCustomOrderRow, createDriveFolder, getOrCreateMainOrdersFolder, getOrCreateMainCatalogsFolder, getOrCreateMainCustomOrdersFolder, getOrCreateCustomOrdersSheet, updateDriveFolder, deleteDriveFolder, uploadImageToFolder, updateDriveFile, copyDriveFile, DriveFolder, DriveFile, getOrCreateUsersSheet, appendUserRow, updateUserRow, fetchAllUsers, fetchUserOrdersFromSheet, SheetOrder } from './lib/api';
import { cn } from './lib/utils';

const SECURITY_QUESTIONS = [
  "What was the name of your first school?",
  "What was your childhood nickname?",
  "In which city were you born?",
  "What is your favorite movie?",
  "What is your favorite food?",
  "What was your dream job as a child?",
  "What is the name of your first pet?",
  "Who is favorite celebrity?",
  "Who is your role model?",
  "What is your hobby?"
];

const BrandLogo = ({ size = 'md' }: { size?: 'xs' | 'sm' | 'md' | 'lg' }) => {
  const boxSize = size === 'xs' ? 'w-4 h-4 text-[10px]' : size === 'sm' ? 'w-6 h-6 text-sm' : size === 'lg' ? 'w-16 h-[64px] text-[65px] leading-[65px]' : 'w-8 h-8 text-xl';
  const gapSize = size === 'lg' ? 'gap-[3px] p-[3px]' : 'gap-[2px] p-[2px]';
  const textSize = size === 'xs' ? 'text-[6px]' : size === 'sm' ? 'text-[8px]' : size === 'lg' ? 'text-[18px]' : 'text-[11px]';
  
  return (
    <div className="inline-flex flex-col items-center justify-center select-none font-sans font-[Verdana] shrink-0">
      <div className={`grid grid-cols-2 ${gapSize} bg-white border border-white`}>
        <div className={`bg-black text-white flex items-center justify-center font-bold font-display text-center leading-none ${boxSize} font-[Verdana]`}>A</div>
        <div className={`bg-black text-white flex items-center justify-center font-bold font-display text-center leading-none ${boxSize} font-[Verdana]`}>B</div>
        <div className={`bg-black text-white flex items-center justify-center font-bold font-display text-center leading-none ${boxSize} font-[Verdana]`}>C</div>
        <div className={`bg-black text-white flex items-center justify-center font-bold font-display text-center leading-none ${boxSize} font-[Verdana]`}>D</div>
      </div>
      <div className={`font-bold uppercase tracking-[0.1em] text-black w-full text-center mt-1 ${textSize} text-justify flex justify-between font-[Verdana]`}>
        <span>C</span><span>R</span><span>E</span><span>A</span><span>T</span><span>O</span><span>R</span><span>S</span>
      </div>
    </div>
  );
};

const parsePostersStr = (postersStr: string) => {
  const parts = postersStr.split(',').map(s => s.trim()).filter(Boolean);
  return parts.map(part => {
    const match = part.match(/^(?:(\d+)x\s+)?(.+?)(?:\s+\((.+)\))?$/);
    if (match) {
      const [, qty, name, size] = match;
      return { qty: parseInt(qty || '1', 10), name: name.trim(), size: size ? size.trim() : '' };
    }
    return { qty: 1, name: part, size: 'A4' };
  });
};

const formatFolderDisplayName = (name: string | undefined | null): string => {
  if (!name) return '';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  
  // Replace spacing/typo issues for Jujutsu Kaisen with proper capitalized layout with space
  if (
    lower === 'jujutsukaisen' || 
    lower === 'jujustsukaisen' || 
    lower === 'jujustsu kaisen' ||
    lower.replace(/\s+/g, '') === 'jujutsukaisen' ||
    lower.replace(/\s+/g, '') === 'jujustsukaisen'
  ) {
    return 'JUJUTSU KAISEN';
  }
  
  return trimmed;
};

interface SubFolderCardProps {
  folder: DriveFolder;
  layout: 'grid' | 'list';
  onSelect: (folder: DriveFolder) => void;
}

interface CartLine {
  poster: DriveFile;
  size: string;
  quantity: number;
}

const SubFolderCard: React.FC<SubFolderCardProps> = ({ folder, layout, onSelect }) => {
  const [bgImage, setBgImage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getImagesInFolder(folder.id)
      .then(files => {
        if (!active) return;
        if (files && files.length > 0) {
          const randomFile = files[Math.floor(Math.random() * files.length)];
          if (randomFile?.thumbnailLink) {
            setBgImage(randomFile.thumbnailLink.replace('=s220', '=s600'));
          }
        }
      })
      .catch(err => {
        console.error("Failed to load background for folder:", folder.id, err);
      });
    return () => {
      active = false;
    };
  }, [folder.id]);

  const displayName = formatFolderDisplayName(folder.name);

  if (layout === 'grid') {
    return (
      <div
        className={cn(
          "group p-3 sm:p-5 border transition-all hover:shadow-sm duration-300 flex flex-col justify-end items-center cursor-pointer relative min-h-[190px] sm:min-h-[240px] overflow-hidden w-full text-center",
          bgImage
            ? "border-[#E5E5E5] hover:border-black bg-cover bg-center"
            : "bg-white border-[#E5E5E5] hover:border-black"
        )}
        style={
          bgImage
            ? { backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.75)), url('${bgImage}')` }
            : undefined
        }
        onClick={() => onSelect(folder)}
      >
        <div className="relative z-10 flex flex-col justify-end items-center h-full w-full">
          <div className="w-full flex justify-center">
            <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] text-black group-hover:scale-105 transition-all duration-300 flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 break-words whitespace-normal text-center">
              <span className="break-words line-clamp-3 leading-tight">{displayName}</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-0 group-hover:opacity-100 transition-opacity animate-in fade-in shrink-0 group-hover:translate-x-0.5 duration-300" />
            </h3>
          </div>
        </div>
      </div>
    );
  }

  // List layout
  return (
    <div
      className={cn(
        "group p-4 border transition-all duration-300 flex items-center justify-between cursor-pointer relative overflow-hidden w-full min-h-[56px]",
        bgImage
          ? "border-[#E5E5E5] hover:border-black bg-cover bg-center"
          : "bg-white border-[#E5E5E5] hover:border-black"
      )}
      style={
        bgImage
          ? { backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.75)), url('${bgImage}')` }
          : undefined
      }
      onClick={() => onSelect(folder)}
    >
      <div className="relative z-10 flex items-center w-full">
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-black break-words whitespace-normal w-full">{displayName}</span>
      </div>
    </div>
  );
};

const formatPosterName = (name: string) => {
  if (!name) return '';
  return name.replace(/\.(jpe?g|png|webp|gif|tiff?|bmp|svg)$/i, '');
};

export default function App() {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [navigationHistory, setNavigationHistory] = useState<any[]>([]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Store data
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [foldersError, setFoldersError] = useState('');
  
  const [currentFolder, setCurrentFolder] = useState<DriveFolder | null>(null);
  const [posters, setPosters] = useState<DriveFile[]>([]);
  const [allPosters, setAllPosters] = useState<DriveFile[]>([]);
  const [isLoadingPosters, setIsLoadingPosters] = useState(false);

  // Cart / Checkout
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  
const FOLDER_CATEGORIES = [
  {
    name: 'Anime',
    items: ['Death Note', 'Demons Slayer', 'Dragon Ball Z', 'Jujutsu Kaisen', 'Naruto', 'One Piece', 'Solo Leveling']
  },
  {
    name: 'Cars & Bikes',
    items: ['Porsche', 'Lamborgini', 'BMW', 'Mercedes', 'Defender', 'Royal Enfield', 'Maseretti', 'Mustang', 'Mclaren', 'Muscle', 'Dodge', 'Mini Cooper', 'Triumph', 'BMW Bikes', 'Kawasaki', 'Rolls Royce']
  },
  {
    name: 'Cartoon',
    items: ['Bubu Dudu', 'Doraemon', 'Sinchan', 'Tom & Jerry', 'Minions']
  },
  {
    name: 'Devotional',
    items: ['Goddess Durgamma', 'Lord Buddha', 'Lord Ganesh', 'Lord Hanuman', 'Lord Krishna', 'Lord Shiva', 'Lord Sriram', 'Lord vishnu', 'Mahabharat', 'Ramayana']
  },
  {
    name: 'Hollywood Movies & Series',
    items: ['Breaking Bad', 'Friends', 'Fight Club', 'Game of Thrones', 'Harry Potter', 'Stranger Things', 'The Office', 'How I met your Mother', 'Big Bang Theory', 'Peaky Blinders', 'John Wick', 'Transformers']
  },
  {
    name: 'Marvel & DC',
    items: ['Avengers', 'Batman', 'Flash', 'Captain America', 'Deadpool', 'Hulk', 'Ironman', 'Joker', 'Spiderman', 'Superman', 'Thor']
  },
  {
    name: 'Motivational Quotes',
    items: ['Affirmations & Law of Attraction', 'Affirmations', 'Devotional & Spiritual', 'Inspirational Quotes', 'Meditation and Peace', 'Quotes', 'Women Quotes']
  },
  {
    name: 'Music',
    items: ['BTS', 'Michael Jackson', 'Taylor Swift', 'The Weeknd']
  },
  {
    name: 'Sports',
    items: ['Christiano Ronaldo', 'F1 AMG', 'F1 Ferrari', 'F1 Mclaren', 'F1 Redbull', 'Hardhik Pandya', 'Messi', 'MS Dhoni', 'Virat kohli']
  },
  {
    name: 'Tollywood Celebrities',
    items: ['Mahesh Babu', 'Prabhas', 'Chiranjeevi', 'Balakrishna', 'NTR', 'Allu Arjun', 'Pavan Kalyan', 'Ram Charan', 'Tamil Celebrities', 'Kannada celebrities', 'Bollywood Celebrities']
  },
  {
    name: 'Stickers',
    items: ['Stickers']
  },
  {
    name: 'Others',
    items: ['ABCD creator', 'Bollywood', 'Games']
  }
];

const getFolderCategory = (folder: DriveFolder | null | undefined) => {
  if (!folder) return 'Others';
  if (folder.categoryHint) return folder.categoryHint;
  const folderName = folder.name;
  if (!folderName) return 'Others';
  const name = folderName.trim().toLowerCase();
  const spacelessName = name.replace(/\s+/g, '');
  
  if (
    spacelessName.includes('quote') || 
    spacelessName.includes('qoute') ||
    spacelessName.includes('motivational') ||
    spacelessName.includes('affirmation')
  ) {
    return 'Motivational Quotes';
  }

  // Robust Jujutsu Kaisen / Jujustsu Kaisen matchers for flexible folder names
  if (
    spacelessName.includes('jujutsu') || 
    spacelessName.includes('jujustsu') || 
    spacelessName.includes('kaisen')
  ) {
    return 'Anime';
  }
  
  for (const cat of FOLDER_CATEGORIES) {
    if (cat.items.some(item => {
      const normalizedItem = item.trim().toLowerCase();
      // Direct substring match
      if (name.includes(normalizedItem) || normalizedItem.includes(name)) {
        return true;
      }
      // Spaceless direct substring match
      const spacelessItem = normalizedItem.replace(/\s+/g, '');
      if (spacelessName.includes(spacelessItem) || spacelessItem.includes(spacelessName)) {
        return true;
      }
      // Loose match for plural variations (e.g., Demon Slayer vs Demons Slayer)
      if (normalizedItem.includes('demon') && name.includes('demon')) {
        return true;
      }
      return false;
    })) {
      return cat.name;
    }
  }
  return 'Others';
};

const getCategoryIcon = (categoryName: string) => {
  const normalized = categoryName.trim().toLowerCase();
  if (normalized.includes('anime')) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-[#FDF6E2] overflow-hidden select-none">
        {/* Luffy Hair (Back) */}
        <div className="absolute w-8 h-8 bg-black rounded-full top-[8px] z-0 flex justify-center">
          {/* Spike tufts */}
          <div className="absolute -top-[2px] left-1 w-2 h-2 bg-black rotate-45" />
          <div className="absolute -top-[3px] left-3 w-2.5 h-2.5 bg-black rotate-12" />
          <div className="absolute -top-[2px] right-1 w-2 h-2 bg-black -rotate-45" />
        </div>
        
        {/* Face */}
        <div className="absolute w-6 h-6 bg-[#FFDBB5] rounded-full top-[14px] z-10 flex flex-col items-center pt-2 gap-[1px]">
          {/* Eyes */}
          <div className="flex justify-between w-3.5 px-0.5 mt-[1px]">
            <div className="w-1 h-1 bg-black rounded-full" />
            <div className="w-1 h-1 bg-black rounded-full relative">
              {/* Scar below left eye */}
              <div className="absolute -bottom-1 left-0 text-[5px] font-bold text-[#C2410C] leading-none select-none">+</div>
            </div>
          </div>
          {/* Smile */}
          <div className="w-2.5 h-1 border-b border-black rounded-b-full mt-0.5" />
        </div>

        {/* Straw Hat (placed in front of hair and overlapping face) */}
        <div className="absolute w-full h-full flex flex-col items-center justify-center z-20 pointer-events-none">
          {/* Hat Crown / Cap */}
          <div className="w-5 h-4 bg-[#EAB308] rounded-t-full border-t border-[#CA8A04] mt-[-6px]" />
          {/* Red Band */}
          <div className="w-5 h-1 bg-[#EF4444]" />
          {/* Hat Brim */}
          <div className="w-[34px] h-[3px] bg-[#EAB308] rounded-full border border-[#CA8A04]" />
        </div>
      </div>
    );
  }
  if (normalized.includes('cartoon')) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#FDE047] overflow-hidden select-none border-0 pt-0.5">
        {/* Sponge Holes */}
        <div className="absolute w-3 h-3 bg-[#EAB308] opacity-30 rounded-full left-1 top-2" />
        <div className="absolute w-2.5 h-2.5 bg-[#EAB308] opacity-30 rounded-full right-2 top-3" />
        <div className="absolute w-4 h-4 bg-[#EAB308] opacity-30 rounded-full right-1 bottom-1" />
        <div className="absolute w-2 h-2 bg-[#EAB308] opacity-30 rounded-full left-2 bottom-3" />

        {/* Eyelashes (placed behind eyes) */}
        <div className="absolute top-[8px] left-[15px] flex gap-5 z-0">
          <div className="flex gap-0.5 -rotate-12">
            <div className="w-[1.5px] h-2 bg-black origin-bottom -rotate-12" />
            <div className="w-[1.5px] h-2.5 bg-black origin-bottom" />
            <div className="w-[1.5px] h-2 bg-black origin-bottom rotate-12" />
          </div>
          <div className="flex gap-0.5 rotate-12 ml-2">
            <div className="w-[1.5px] h-2 bg-black origin-bottom -rotate-12" />
            <div className="w-[1.5px] h-2.5 bg-black origin-bottom" />
            <div className="w-[1.5px] h-2 bg-black origin-bottom rotate-12" />
          </div>
        </div>

        {/* Large Eyes */}
        <div className="flex gap-1.5 z-10 mt-1">
          <div className="w-5 h-5 bg-white border border-black rounded-full flex items-center justify-center relative">
            {/* Iris */}
            <div className="w-2.5 h-2.5 bg-[#38BDF8] rounded-full flex items-center justify-center border-[0.5px] border-black/20">
              {/* Pupil */}
              <div className="w-1.5 h-1.5 bg-black rounded-full" />
            </div>
          </div>
          <div className="w-5 h-5 bg-white border border-black rounded-full flex items-center justify-center relative">
            {/* Iris */}
            <div className="w-2.5 h-2.5 bg-[#38BDF8] rounded-full flex items-center justify-center border-[0.5px] border-black/20">
              {/* Pupil */}
              <div className="w-1.5 h-1.5 bg-black rounded-full" />
            </div>
          </div>
        </div>

        {/* SpongeBob Nose */}
        <div className="absolute w-2 h-4 bg-[#FDE047] border border-black rounded-full z-20 top-[18px] left-[20px]" />

        {/* Rosy Cheek Circles */}
        <div className="absolute w-2 h-1.5 bg-[#F97316] opacity-60 rounded-full left-[6px] top-[21px] z-10" />
        <div className="absolute w-2 h-1.5 bg-[#F97316] opacity-60 rounded-full right-[6px] top-[21px] z-10" />

        {/* Freckles */}
        <div className="absolute left-[8px] top-[23px] flex gap-[1.5px] z-10">
          <div className="w-[1px] h-[1px] bg-[#C2410C] rounded-full" />
          <div className="w-[1px] h-[1px] bg-[#C2410C] rounded-full mt-[1px]" />
          <div className="w-[1px] h-[1px] bg-[#C2410C] rounded-full" />
        </div>
        <div className="absolute right-[8px] top-[23px] flex gap-[1.5px] z-10">
          <div className="w-[1px] h-[1px] bg-[#C2410C] rounded-full" />
          <div className="w-[1px] h-[1px] bg-[#C2410C] rounded-full mt-[1px]" />
          <div className="w-[1px] h-[1px] bg-[#C2410C] rounded-full" />
        </div>

        {/* Smile and Teeth */}
        <div className="relative w-9 h-[10px] mt-2 flex flex-col items-center justify-start z-10">
          <div className="absolute top-0 w-8 h-3 border-b-2 border-black rounded-b-full bg-transparent" />
          
          {/* Two Cute Buck Teeth hanging down */}
          <div className="absolute top-[10px] flex gap-[2px]">
            <div className="w-[4.5px] h-[5px] bg-white border-l border-r border-b border-black" />
            <div className="w-[4.5px] h-[5px] bg-white border-l border-r border-b border-black" />
          </div>
        </div>
      </div>
    );
  }
  if (normalized.includes('car')) return <Car className="w-5 h-5 text-blue-500" />;
  if (normalized.includes('devotional')) return <Compass className="w-5 h-5 text-[#B45309]" />;
  if (normalized.includes('hollywood')) return <Film className="w-5 h-5 text-rose-500" />;
  if (normalized.includes('marvel') || normalized.includes('dc')) return <Zap className="w-5 h-5 text-red-500" />;
  if (normalized.includes('motivation')) return <BookOpen className="w-5 h-5 text-teal-600" />;
  if (normalized.includes('music')) return <Music className="w-5 h-5 text-emerald-500" />;
  if (normalized.includes('sport')) return <Trophy className="w-5 h-5 text-orange-500" />;
  if (normalized.includes('celebrity') || normalized.includes('celebrities')) return <Star className="w-5 h-5 text-indigo-500" />;
  if (normalized.includes('sticker')) return <Star className="w-6 h-6 text-[#FFB800] fill-[#FFB800]" />;
  return <Folder className="w-5 h-5 text-gray-500" />;
};

  const SIZES: string[] = [...PRINT_SIZE_KEYS];
  const [posterSizes, setPosterSizes] = useState<Record<string, string>>({});
  const [previewModes, setPreviewModes] = useState<Record<string, 'portrait' | 'landscape'>>({});
  const [previewingPoster, setPreviewingPoster] = useState<DriveFile | null>(null);

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [checkoutError, setCheckoutError] = useState('');

  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [folderLayout, setFolderLayout] = useState<'grid' | 'list'>('grid');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [categoryPages, setCategoryPages] = useState<Record<string, number>>({});
  const [folderPosterPages, setFolderPosterPages] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryPosters, setCategoryPosters] = useState<Record<string, DriveFile | null>>({});

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<'menu' | 'edit_profile' | 'my_orders' | 'notifications' | 'contact_us'>('menu');

  // Edit Profile
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileCity, setProfileCity] = useState('');
  
  // My Orders
  const [adminViewingOrder, setAdminViewingOrder] = useState<SheetOrder | null>(null);
  const [myOrdersFolders, setMyOrdersFolders] = useState<DriveFolder[]>([]);
  const [mySheetOrders, setMySheetOrders] = useState<SheetOrder[]>([]);
  const [selectedOrderFolder, setSelectedOrderFolder] = useState<DriveFolder | null>(null);
  const [selectedSheetOrder, setSelectedSheetOrder] = useState<SheetOrder | null>(null);
  const [orderPosters, setOrderPosters] = useState<DriveFile[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handlePreviewModeChange = (posterId: string, newMode: 'portrait' | 'landscape') => {
    setPreviewModes(prev => ({ ...prev, [posterId]: newMode }));
    setPosterSizes(prev => {
      const currentSize = prev[posterId] || SIZES[0];
      let newSize = currentSize;
      if (newMode === 'landscape') {
        if (currentSize === 'A4(Portrait)') {
          newSize = 'A4(Landscape)';
        } else if (currentSize === '12*18(Portrait)') {
          newSize = '12*18(Landscape)';
        }
      } else {
        if (currentSize === 'A4(Landscape)') {
          newSize = 'A4(Portrait)';
        } else if (currentSize === '12*18(Landscape)') {
          newSize = '12*18(Portrait)';
        }
      }
      return { ...prev, [posterId]: newSize };
    });
  };

  const handleSizeChange = (posterId: string, size: string) => {
    setPosterSizes(prev => ({ ...prev, [posterId]: size }));
    const isLandscape = size.toLowerCase().includes('landscape');
    setPreviewModes(prev => ({ ...prev, [posterId]: isLandscape ? 'landscape' : 'portrait' }));
  };

  const handleTouchEnd = (e: React.TouchEvent, posterId: string, currentMode: string) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    if (Math.abs(deltaX) > 40) {
      handlePreviewModeChange(posterId, currentMode === 'landscape' ? 'portrait' : 'landscape');
    }
    setTouchStartX(null);
  };

  const fetchMyOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const email = clientEmail.trim();
      const phoneStr = (customerPhone || profilePhone || '').trim();

      const [mainFolderId, sheetOrders] = await Promise.all([
        getOrCreateMainOrdersFolder(),
        fetchUserOrdersFromSheet(email, phoneStr)
      ]);
      
      const ordersFolders = await getFoldersInFolder(mainFolderId);
      
      // Filter orders by the current user's phone number
      const userOrders = phoneStr ? ordersFolders.filter(folder => folder.name.includes(phoneStr)).reverse() : [];
      
      setMyOrdersFolders(userOrders);
      const sortedSheetOrders = [...sheetOrders]; // Already reversed from api.ts (newest to oldest)
      setMySheetOrders(sortedSheetOrders);

      if (allPosters.length === 0 && folders.length > 0) {
        Promise.all(folders.map(f => getImagesInFolder(f.id)))
          .then(results => setAllPosters(results.flat()))
          .catch(err => console.error('Error fetching all posters for history thumbnails:', err));
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const openMyOrders = () => {
    navigateState({ isViewingMyOrders: true, isSidebarOpen: false });
    fetchMyOrders();
  };

  const previewOrder = async (folder: DriveFolder) => {
    navigateState({ selectedOrderFolder: folder });
    setIsLoadingOrders(true);
    try {
      const files = await getImagesInFolder(folder.id);
      setOrderPosters(files);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

    // deleted



  const navigateState = (updates: any) => {
    const mainKeys = ['isCheckingOut', 'isViewingWishlist', 'isViewingMyOrders', 'isViewingContactUs', 'isViewingProfile'];
    let hasTargetView = false;
    
    for (const key of mainKeys) {
      if (updates[key] === true) {
        hasTargetView = true;
        break;
      }
    }
    
    if (updates.currentFolder) {
      hasTargetView = true;
    }
    
    const autoCleans: any = {};
    if (hasTargetView) {
      for (const key of mainKeys) {
        if (updates[key] !== true) {
          autoCleans[key] = false;
        }
      }
      if (!updates.hasOwnProperty('currentFolder')) {
        autoCleans.currentFolder = null;
      }
    }

    const currentState = {
      currentFolder,
      isCheckingOut,
      isViewingWishlist,
      isViewingMyOrders,
      isViewingContactUs,
      isViewingProfile,
      selectedCategory,
      isSidebarOpen,
      sidebarView,
      selectedSheetOrder,
      selectedOrderFolder,
      adminViewingOrder,
    };

    // Store state in custom navigation stack for fallback/sandboxed back navigations
    setNavigationHistory(prev => {
      const last = prev[prev.length - 1];
      // Avoid duplicate history state entries if clicking the same view
      if (last && 
          last.isViewingWishlist === currentState.isViewingWishlist &&
          last.isCheckingOut === currentState.isCheckingOut &&
          last.isViewingProfile === currentState.isViewingProfile &&
          last.isViewingMyOrders === currentState.isViewingMyOrders &&
          last.isViewingContactUs === currentState.isViewingContactUs &&
          last.currentFolder?.id === currentState.currentFolder?.id &&
          last.selectedCategory === currentState.selectedCategory
         ) {
        return prev;
      }
      return [...prev, currentState];
    });

    const mergedUpdates = { ...autoCleans, ...updates };
    const nextState = { ...currentState, ...mergedUpdates };
    window.history.pushState(nextState, '');
    
    if (mergedUpdates.currentFolder !== undefined) {
      setCurrentFolder(mergedUpdates.currentFolder);
      if (mergedUpdates.currentFolder) {
        setFolderPosterPages(prev => ({ ...prev, [mergedUpdates.currentFolder.id]: 1 }));
      }
    }
    if (mergedUpdates.isCheckingOut !== undefined) setIsCheckingOut(mergedUpdates.isCheckingOut);
    if (mergedUpdates.isViewingWishlist !== undefined) setIsViewingWishlist(mergedUpdates.isViewingWishlist);
    if (mergedUpdates.isViewingMyOrders !== undefined) setIsViewingMyOrders(mergedUpdates.isViewingMyOrders);
    if (mergedUpdates.isViewingContactUs !== undefined) setIsViewingContactUs(mergedUpdates.isViewingContactUs);
    if (mergedUpdates.isViewingProfile !== undefined) setIsViewingProfile(mergedUpdates.isViewingProfile);
    if (mergedUpdates.selectedCategory !== undefined) {
      setSelectedCategory(mergedUpdates.selectedCategory);
      if (mergedUpdates.selectedCategory) {
        setCategoryPages(prev => ({ ...prev, [mergedUpdates.selectedCategory]: 1 }));
      }
    }
    if (mergedUpdates.isSidebarOpen !== undefined) setIsSidebarOpen(mergedUpdates.isSidebarOpen);
    if (mergedUpdates.sidebarView !== undefined) setSidebarView(mergedUpdates.sidebarView);
    if (mergedUpdates.selectedSheetOrder !== undefined) setSelectedSheetOrder(mergedUpdates.selectedSheetOrder);
    if (mergedUpdates.selectedOrderFolder !== undefined) setSelectedOrderFolder(mergedUpdates.selectedOrderFolder);
    if (mergedUpdates.adminViewingOrder !== undefined) setAdminViewingOrder(mergedUpdates.adminViewingOrder);
  };

  const navigateBack = () => {
    if (navigationHistory.length > 0) {
      const prev = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prevStack => prevStack.slice(0, -1));

      if (prev.currentFolder !== undefined) setCurrentFolder(prev.currentFolder);
      if (prev.isCheckingOut !== undefined) setIsCheckingOut(prev.isCheckingOut);
      if (prev.isViewingWishlist !== undefined) setIsViewingWishlist(prev.isViewingWishlist);
      if (prev.isViewingMyOrders !== undefined) setIsViewingMyOrders(prev.isViewingMyOrders);
      if (prev.isViewingContactUs !== undefined) setIsViewingContactUs(prev.isViewingContactUs);
      if (prev.isViewingProfile !== undefined) setIsViewingProfile(prev.isViewingProfile);
      if (prev.selectedCategory !== undefined) setSelectedCategory(prev.selectedCategory);
      if (prev.isSidebarOpen !== undefined) setIsSidebarOpen(prev.isSidebarOpen);
      if (prev.sidebarView !== undefined) setSidebarView(prev.sidebarView);
      if (prev.selectedSheetOrder !== undefined) setSelectedSheetOrder(prev.selectedSheetOrder);
      if (prev.selectedOrderFolder !== undefined) setSelectedOrderFolder(prev.selectedOrderFolder);
      if (prev.adminViewingOrder !== undefined) setAdminViewingOrder(prev.adminViewingOrder);

      // Keep native state structure in sync
      window.history.pushState(prev, '');
    } else {
      // Direct hard-coded fallback to collections
      setCurrentFolder(null);
      setIsCheckingOut(false);
      setIsViewingWishlist(false);
      setIsViewingMyOrders(false);
      setIsViewingContactUs(false);
      setIsViewingProfile(false);
      setSelectedCategory(null);
    }
  };

  useEffect(() => {
    window.history.replaceState({
      currentFolder: null,
      isCheckingOut: false,
      isViewingWishlist: false,
      isViewingMyOrders: false,
      isViewingContactUs: false,
      isViewingProfile: false,
      selectedCategory: null,
      isSidebarOpen: false,
      sidebarView: 'menu',
      selectedSheetOrder: null,
      selectedOrderFolder: null,
      adminViewingOrder: null,
    }, '');

    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      if (state) {
        if (state.currentFolder !== undefined) setCurrentFolder(state.currentFolder);
        if (state.isCheckingOut !== undefined) setIsCheckingOut(state.isCheckingOut);
        if (state.isViewingWishlist !== undefined) setIsViewingWishlist(state.isViewingWishlist);
        if (state.isViewingMyOrders !== undefined) setIsViewingMyOrders(state.isViewingMyOrders);
        if (state.isViewingContactUs !== undefined) setIsViewingContactUs(state.isViewingContactUs);
        if (state.isViewingProfile !== undefined) setIsViewingProfile(state.isViewingProfile);
        if (state.selectedCategory !== undefined) setSelectedCategory(state.selectedCategory);
        if (state.isSidebarOpen !== undefined) setIsSidebarOpen(state.isSidebarOpen);
        if (state.sidebarView !== undefined) setSidebarView(state.sidebarView);
        if (state.selectedSheetOrder !== undefined) setSelectedSheetOrder(state.selectedSheetOrder);
        if (state.selectedOrderFolder !== undefined) setSelectedOrderFolder(state.selectedOrderFolder);
        if (state.adminViewingOrder !== undefined) setAdminViewingOrder(state.adminViewingOrder);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


  const loadFolders = async () => {
    setIsLoadingFolders(true);
    setFoldersError('');
    try {
      const rootFolders = await getRootFolders();
      const stickersFolder = rootFolders.find(f => f.name.toLowerCase().includes('sticker'));
      let allFolders = rootFolders.filter(f => f.id !== stickersFolder?.id);

      if (stickersFolder) {
        const stickersSubFolders = await getFoldersInFolder(stickersFolder.id);
        const taggedStickerFolders = stickersSubFolders.map(f => ({
          ...f,
          categoryHint: 'Stickers'
        }));
        allFolders = [...taggedStickerFolders, ...allFolders];
      }

      setFolders(allFolders);
    } catch (err: any) {
      console.error(err);
      setFoldersError(err.message || 'Failed to load folders');
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const loadPosters = async (folder: DriveFolder) => {
    navigateState({ currentFolder: folder });
    setIsLoadingPosters(true);
    try {
      const data = await getImagesInFolder(folder.id);
      const cat = getFolderCategory(folder);
      const enrichedData = data.map(p => ({ ...p, categoryHint: cat }));
      setPosters(enrichedData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPosters(false);
    }
  };

  const effectiveSize = (poster: DriveFile) =>
    poster.categoryHint === 'Stickers' ? '' : (posterSizes[poster.id] || '');
  const hasChosenSize = (poster: DriveFile) =>
    poster.categoryHint === 'Stickers' || !!posterSizes[poster.id];
  const findLine = (posterId: string, size: string) =>
    cartLines.find(l => l.poster.id === posterId && l.size === size);
  const lineQuantity = (poster: DriveFile) => findLine(poster.id, effectiveSize(poster))?.quantity ?? 0;
  const isInCart = (poster: DriveFile) => findLine(poster.id, effectiveSize(poster)) !== undefined;

  const upsertLine = (poster: DriveFile, size: string, quantity: number) => {
    setCartLines(prev => {
      const idx = prev.findIndex(l => l.poster.id === poster.id && l.size === size);
      if (quantity <= 0) return idx === -1 ? prev : prev.filter((_, i) => i !== idx);
      if (idx === -1) return [...prev, { poster, size, quantity }];
      const next = [...prev];
      next[idx] = { ...next[idx], quantity };
      return next;
    });
  };

  const removeLine = (posterId: string, size: string) => {
    setCartLines(prev => prev.filter(l => !(l.poster.id === posterId && l.size === size)));
  };

  const toggleCartLine = (poster: DriveFile) => {
    if (!hasChosenSize(poster)) return;
    const size = effectiveSize(poster);
    if (findLine(poster.id, size)) {
      upsertLine(poster, size, 0);
      return;
    }
    upsertLine(poster, size, poster.categoryHint === 'Stickers' ? 4 : 1);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');
    if (!customerName || !customerPhone || cartLines.length === 0) return;

    if (customerName.trim().length < 3) {
      setCheckoutError('Name must be at least 3 characters long.');
      return;
    }

    if (!/^\d{10}$/.test(customerPhone.replace(/[\s-]/g, ''))) {
      setCheckoutError('Please enter a valid 10-digit phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const dateStr = new Date().toLocaleString();
      
      if (cartLines.length > 0) {
        const sheetId = await getOrCreateOrdersSheet();
        const posterNames = cartLines.map(l => {
          const isSticker = l.poster.categoryHint === 'Stickers';
          const sizeStr = !isSticker ? ` (${l.size})` : '';
          return `${l.quantity}x ${formatPosterName(l.poster.name)}${sizeStr}`;
        }).join(', ');
        const totalQuantity = cartLines.reduce((sum, l) => sum + l.quantity, 0);

        await appendOrderRow(sheetId, [
          dateStr,
          customerName,
          customerPhone,
          posterNames,
          totalQuantity.toString(),
          clientEmail.trim().toLowerCase()
        ]);

        const printLines = cartLines.filter(l => l.poster.categoryHint !== 'Stickers');
        if (printLines.length > 0) {
          setIsGeneratingPdf(true);
          try {
            const safeFilePart = (s: string) => s.replace(/[\\/:*?"<>|]/g, '-').trim();
            const pdfFilename = `${safeFilePart(customerName) || 'Order'} - ${safeFilePart(dateStr)}.pdf`;
            const blob = await buildOrderPDF(printLines);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = pdfFilename;
            a.click();
            URL.revokeObjectURL(url);
          } catch (err) {
            console.error('Order PDF generation failed:', err);
          } finally {
            setIsGeneratingPdf(false);
          }
        }
      }

      setSubmitSuccess(true);
      setCartLines([]);
      
      // Also save the phone to profile if it's empty so future fetches work automatically
      if (!profilePhone.trim()) {
         setProfilePhone(customerPhone);
      }
      
    } catch (err: any) {
      console.error('Submission failed:', err);
      setCheckoutError(err.message || 'Failed to submit order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [clientConfirmPassword, setClientConfirmPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot_password' | 'reset_password'>('signin');
  const [clientLoginError, setClientLoginError] = useState('');
  const [clientSuccessMessage, setClientSuccessMessage] = useState('');

  const [signupSecurityQuestion, setSignupSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [signupSecurityAnswer, setSignupSecurityAnswer] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [resetSecurityQuestion, setResetSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [resetSecurityAnswer, setResetSecurityAnswer] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'question' | 'password'>('email');
  
  const [wishlistedPosters, setWishlistedPosters] = useState<DriveFile[]>([]);
  const [isViewingWishlist, setIsViewingWishlist] = useState(false);
  const [isViewingMyOrders, setIsViewingMyOrders] = useState(false);
  const [isViewingContactUs, setIsViewingContactUs] = useState(false);
  const [isViewingProfile, setIsViewingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState('');
  const [userRowIndex, setUserRowIndex] = useState<number | null>(null);
  const [signupName, setSignupName] = useState('');

  // Scroll to the top of the page when switching views
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    document.body.scrollTo(0, 0);
  }, [
    currentFolder?.id,
    isCheckingOut,
    isViewingWishlist,
    isViewingMyOrders,
    isViewingContactUs,
    isViewingProfile,
    selectedCategory,
    selectedSheetOrder?.id,
    selectedOrderFolder?.id,
    adminViewingOrder?.id
  ]);

  useEffect(() => {
    const key = clientEmail.trim() ? `wishlist_${clientEmail.trim()}` : 'wishlist_guest';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setWishlistedPosters(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      setWishlistedPosters([]);
    }
  }, [clientEmail]);

  useEffect(() => {
    const key = clientEmail.trim() ? `wishlist_${clientEmail.trim()}` : 'wishlist_guest';
    localStorage.setItem(key, JSON.stringify(wishlistedPosters));
  }, [wishlistedPosters, clientEmail]);

  useEffect(() => {
    setPreviewingPoster(null);
  }, [currentFolder, selectedCategory, isViewingWishlist]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [previewingPoster, posters, wishlistedPosters, isViewingWishlist]);

  useEffect(() => {
    if (folders.length > 0) {
      const missingCategories = FOLDER_CATEGORIES.map(c => c.name).filter(catName => !categoryPosters[catName]);
      if (missingCategories.length > 0) {
        missingCategories.forEach(catName => {
          const catFolders = folders.filter(f => getFolderCategory(f) === catName);
          if (catFolders.length > 0) {
            const randomFolder = catFolders[Math.floor(Math.random() * catFolders.length)];
            getImagesInFolder(randomFolder.id).then(files => {
              if (files.length > 0) {
                const randomFile = files[Math.floor(Math.random() * files.length)];
                setCategoryPosters(prev => ({
                  ...prev,
                  [catName]: randomFile
                }));
              }
            }).catch(err => {
              console.error(`Failed to load random poster background for ${catName}:`, err);
            });
          }
        });
      }
    }
  }, [folders, categoryPosters]);

  const toggleWishlist = (poster: DriveFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlistedPosters(prev => 
      prev.some(p => p.id === poster.id) 
        ? prev.filter(p => p.id !== poster.id) 
        : [...prev, poster]
    );
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientLoginError('');
    setClientSuccessMessage('');
    if (!clientEmail.trim().toLowerCase().endsWith('@gmail.com')) {
      setClientLoginError('invalid email/password');
      return;
    }
    
    setIsLoggingIn(true);
    try {
      const sheetId = await getOrCreateUsersSheet();
      const usersData = await fetchAllUsers(sheetId);
      
      if (authMode === 'signup') {
        if (!signupName.trim()) {
          setClientLoginError('Name is required.');
          return;
        }
        if (clientPassword.length < 6) {
          setClientLoginError('Password must be at least 6 characters.');
          return;
        }
        if (clientPassword !== clientConfirmPassword) {
          setClientLoginError('Passwords do not match.');
          return;
        }
        if (signupSecurityAnswer.trim().length < 4) {
          setClientLoginError('Security answer must be at least 4 characters long.');
          return;
        }
        
        const existingUser = usersData.find(row => row[0] === clientEmail.trim().toLowerCase());
        if (existingUser) {
          setClientLoginError('User with this email already exists.');
          return;
        }
        
        const dateStr = new Date().toLocaleString();
        await appendUserRow(sheetId, [
          clientEmail.trim().toLowerCase(), 
          clientPassword, 
          dateStr, 
          signupSecurityQuestion, 
          signupSecurityAnswer.trim(),
          signupName.trim(),
          '' // Empty phone on signup
        ]);
        
        setUserRowIndex(usersData.length);
        setProfileName(signupName.trim());
        setProfilePhone('');
        setProfileEmail(clientEmail.trim().toLowerCase());
        setCustomerName(signupName.trim());
        setCustomerPhone('');
        
        setNeedsAuth(false);
        loadFolders();
      } else {
        const userIndex = usersData.findIndex(row => row[0] === clientEmail.trim().toLowerCase() && row[1] === clientPassword);
        if (userIndex === -1) {
          setClientLoginError('invalid email/password');
          return;
        }
        const userRow = usersData[userIndex];
        const savedName = userRow[5] || '';
        const savedPhone = userRow[6] || '';
        
        setUserRowIndex(userIndex);
        setProfileName(savedName);
        setProfilePhone(savedPhone);
        setProfileEmail(clientEmail.trim().toLowerCase());
        setCustomerName(savedName);
        setCustomerPhone(savedPhone);
        
        setNeedsAuth(false);
        loadFolders();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setClientLoginError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientLoginError('');
    setClientSuccessMessage('');
    setIsLoggingIn(true);
    try {
      const sheetId = await getOrCreateUsersSheet();
      const usersData = await fetchAllUsers(sheetId);
      const userIndex = usersData.findIndex(row => row[0] === resetEmail.trim().toLowerCase());
      
      if (userIndex === -1) {
        setClientLoginError('invalid email/password');
        return;
      }
      const userRow = usersData[userIndex];

      if (resetStep === 'email') {
        setResetStep('question');
      } else if (resetStep === 'question') {
        const storedQuestion = userRow[3];
        const storedAnswer = userRow[4];
        if (resetSecurityQuestion !== storedQuestion || resetSecurityAnswer.trim().toLowerCase() !== (storedAnswer || '').toLowerCase()) {
          setClientLoginError('Incorrect security question or answer.');
          return;
        }
        setResetStep('password');
      } else if (resetStep === 'password') {
        if (resetNewPassword.length < 6) {
          setClientLoginError('Password must be at least 6 characters.');
          return;
        }
        if (resetNewPassword !== resetConfirmPassword) {
          setClientLoginError('Passwords do not match.');
          return;
        }
        // Update user
        const newRow = [...userRow];
        newRow[1] = resetNewPassword;
        await updateUserRow(sheetId, userIndex, newRow);
        
        setClientLoginError('');
        setClientSuccessMessage('Password reset successfully. Please sign in.');
        setAuthMode('signin');
        setResetStep('email');
        setResetEmail('');
        setResetSecurityAnswer('');
        setResetNewPassword('');
        setResetConfirmPassword('');
      }
    } catch (err: any) {
      console.error('Reset error:', err);
      setClientLoginError(err.message || 'Reset failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex flex-col items-center justify-center p-4 antialiased text-[#1A1A1A]">
        <div className="max-w-md w-full bg-white border border-[#E5E5E5] p-12 text-center">
          <div className="flex flex-col items-center mb-10">
            <BrandLogo size="lg" />
            <div className="h-4"></div>
            <p className="font-['Ametha_Sweet',_'Ametha_Sweet_Font',_cursive] text-3xl md:text-4xl mt-4 font-normal text-black capitalize tracking-wide">Welcome back</p>
          </div>
          
          {authMode === 'reset_password' ? (
            <form onSubmit={handleResetSubmit} className="space-y-6 text-left">
              {clientLoginError && (
                 <div className="bg-red-50 text-red-600 p-3 text-xs border border-red-200 font-medium mb-4">
                   {clientLoginError}
                 </div>
              )}
              {clientSuccessMessage && (
                 <div className="bg-green-50 text-green-600 p-3 text-xs border border-green-200 font-medium mb-4">
                   {clientSuccessMessage}
                 </div>
              )}
              {resetStep === 'email' && (
                <div className="group">
                  <input
                    required
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    className="w-full bg-transparent border-b border-[#E5E5E5] py-3 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-[#BBB]"
                    placeholder="Enter your email address"
                  />
                </div>
              )}
              
              {resetStep === 'question' && (
                <>
                  <div className="group">
                    <label className="block text-[10px] uppercase tracking-[0.1em] text-[#999] font-bold mb-1">Security Question</label>
                    <select
                      value={resetSecurityQuestion}
                      onChange={e => setResetSecurityQuestion(e.target.value)}
                      className="w-full bg-transparent border-b border-[#E5E5E5] py-3 text-sm focus:outline-none focus:border-black transition-colors text-[#1A1A1A]"
                    >
                      {SECURITY_QUESTIONS.map((q, idx) => (
                        <option key={idx} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>
                  <div className="group mt-4">
                    <input
                      required
                      type="text"
                      value={resetSecurityAnswer}
                      onChange={e => setResetSecurityAnswer(e.target.value)}
                      className="w-full bg-transparent border-b border-[#E5E5E5] py-3 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-[#BBB]"
                      placeholder="Enter security answer (min. 4 characters)"
                      minLength={4}
                    />
                  </div>
                </>
              )}
              
              {resetStep === 'password' && (
                <>
                  <div className="group">
                    <input
                      required
                      type="password"
                      value={resetNewPassword}
                      onChange={e => setResetNewPassword(e.target.value)}
                      className="w-full bg-transparent border-b border-[#E5E5E5] py-3 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-[#BBB]"
                      placeholder="Enter new password"
                      minLength={6}
                    />
                  </div>
                  <div className="group mt-4">
                    <input
                      required
                      type="password"
                      value={resetConfirmPassword}
                      onChange={e => setResetConfirmPassword(e.target.value)}
                      className="w-full bg-transparent border-b border-[#E5E5E5] py-3 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-[#BBB]"
                      placeholder="Confirm new password"
                      minLength={6}
                    />
                  </div>
                </>
              )}
              
              <button
                type="submit"
                disabled={isLoggingIn || (resetStep === 'email' && !resetEmail) || (resetStep === 'question' && !resetSecurityAnswer) || (resetStep === 'password' && (!resetNewPassword || !resetConfirmPassword))}
                className="w-full flex items-center justify-center gap-3 bg-black text-white py-4 text-[11px] uppercase tracking-[0.25em] font-bold hover:bg-[#333] transition-all disabled:opacity-50 mt-4"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span>
                    {resetStep === 'email' ? 'Next' : resetStep === 'question' ? 'Verify Answer' : 'Reset Password'}
                  </span>
                )}
              </button>
              
              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setAuthMode('signin');
                    setClientLoginError('');
                    setClientSuccessMessage('');
                    setResetStep('email');
                  }}
                  className="text-[10px] text-[#999] uppercase tracking-widest hover:text-black transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <form 
              onSubmit={handleAuthSubmit}
              className="space-y-6 text-left"
            >
              {clientLoginError && (
                 <div className="bg-red-50 text-red-600 p-3 text-xs border border-red-200 font-medium mb-4">
                   {clientLoginError}
                 </div>
              )}
              {clientSuccessMessage && (
                 <div className="bg-green-50 text-green-600 p-3 text-xs border border-green-200 font-medium mb-4">
                   {clientSuccessMessage}
                 </div>
              )}
              <div className="group">
                <input
                  required
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-[#E5E5E5] py-3 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-[#BBB]"
                  placeholder="Enter your email address"
                />
              </div>
              
              {authMode === 'signup' && (
                <div className="group">
                  <input
                    required
                    type="text"
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    className="w-full bg-transparent border-b border-[#E5E5E5] py-3 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-[#BBB]"
                    placeholder="Enter your name"
                  />
                </div>
              )}
              
              <div className="group">
                <input
                  required
                  type="password"
                  value={clientPassword}
                  onChange={e => setClientPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-[#E5E5E5] py-3 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-[#BBB]"
                  placeholder="Enter password"
                  minLength={6}
                />
              </div>
              
              {authMode === 'signup' && (
                <>
                  <div className="group">
                    <input
                      required
                      type="password"
                      value={clientConfirmPassword}
                      onChange={e => setClientConfirmPassword(e.target.value)}
                      className="w-full bg-transparent border-b border-[#E5E5E5] py-3 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-[#BBB]"
                      placeholder="Confirm password"
                      minLength={6}
                    />
                  </div>
                  
                  <div className="group mt-4">
                    <label className="block text-[10px] uppercase tracking-[0.1em] text-[#999] font-bold mb-1">Security Question</label>
                    <select
                      value={signupSecurityQuestion}
                      onChange={e => setSignupSecurityQuestion(e.target.value)}
                      className="w-full bg-transparent border-b border-[#E5E5E5] py-3 text-sm focus:outline-none focus:border-black transition-colors text-[#1A1A1A]"
                    >
                      {SECURITY_QUESTIONS.map((q, idx) => (
                        <option key={idx} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="group mt-4">
                    <input
                      required
                      type="text"
                      value={signupSecurityAnswer}
                      onChange={e => setSignupSecurityAnswer(e.target.value)}
                      className="w-full bg-transparent border-b border-[#E5E5E5] py-3 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-[#BBB]"
                      placeholder="Enter security answer (min. 4 characters)"
                      minLength={4}
                    />
                  </div>
                </>
              )}
              
              {authMode === 'signin' && (
                <div className="text-right">
                  <button 
                    type="button" 
                    onClick={() => {
                      setAuthMode('reset_password');
                      setClientLoginError('');
                      setClientSuccessMessage('');
                    }}
                    className="text-[10px] text-[#999] hover:text-black transition-colors uppercase tracking-widest"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
              
              <button
                type="submit"
                disabled={isLoggingIn || !clientEmail || !clientPassword}
                className="w-full flex items-center justify-center gap-3 bg-black text-white py-4 text-[11px] uppercase tracking-[0.25em] font-bold hover:bg-[#333] transition-all disabled:opacity-50 mt-4"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>{authMode === 'signin' ? 'Sign In To Browse' : 'Create Account'}</span>
                  </>
                )}
              </button>
              <div className="text-center mt-4 mb-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                    setClientLoginError('');
                    setClientSuccessMessage('');
                  }}
                  className="text-[10px] text-[#999] uppercase tracking-widest hover:text-black transition-colors"
                >
                  {authMode === 'signin' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
                </button>
              </div>
            </form>
          )}
          <div className="mt-6 text-[10px] text-[#999]">
             Note: Enter your email to begin fetching the gallery securely.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col font-sans text-[#1A1A1A] antialiased">
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E5E5] px-3 xs:px-6 sm:px-12 h-20 sm:h-24 flex items-center justify-between shadow-sm transition-all duration-300">
        <div className="flex items-center gap-1.5 xs:gap-3 sm:gap-6 min-w-0 flex-1">
          <div 
            onClick={() => {
              navigateState({
                isSidebarOpen: false,
                currentFolder: null,
                isCheckingOut: false,
                isViewingWishlist: false,
                isViewingMyOrders: false,
                isViewingContactUs: false,
                isViewingProfile: false,
                selectedCategory: null,
                selectedOrderFolder: null,
                selectedSheetOrder: null,
                adminViewingOrder: null
              });
              setNavigationHistory([]);
              if (!needsAuth) setSubmitSuccess(false);
            }}
            className="cursor-pointer flex items-center gap-2 sm:gap-4 group shrink-0"
          >
            <BrandLogo size="sm" />
          </div>
          
          <div className="w-px h-6 bg-[#E5E5E5] mx-1 sm:mx-2 hidden sm:block"></div>
          
          <div className="flex items-center gap-1 sm:gap-3 min-w-0">
            {isGeneratingPdf ? null : adminViewingOrder ? (
              <button 
                onClick={() => {
                  navigateBack();
                }}
                className="p-1 sm:p-2 hover:text-black transition-colors text-[#999] shrink-0"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : submitSuccess ? (
              <button 
                onClick={() => {
                  setSubmitSuccess(false);
                  navigateState({ isCheckingOut: false });
                }}
                className="p-1 sm:p-2 hover:text-black transition-colors text-[#999] shrink-0"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : isCheckingOut ? (
              <button 
                onClick={() => {
                  navigateBack();
                }}
                className="p-1 sm:p-2 hover:text-black transition-colors text-[#999] shrink-0"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : isViewingWishlist ? (
              <button 
                onClick={() => {
                  navigateBack();
                }}
                className="p-1 sm:p-2 hover:text-black transition-colors text-[#999] shrink-0"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : isViewingProfile ? (
              <button 
                onClick={() => {
                  navigateBack();
                }}
                className="p-1 sm:p-2 hover:text-black transition-colors text-[#999] shrink-0"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : isViewingMyOrders ? (
              <button 
                onClick={() => {
                  navigateBack();
                }}
                className="p-1 sm:p-2 hover:text-black transition-colors text-[#999] shrink-0"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : selectedCategory && !currentFolder ? (
              <button 
                onClick={() => {
                  navigateBack();
                }}
                className="p-1 sm:p-2 hover:text-black transition-colors text-[#999] shrink-0"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : null}
            <h1 className="text-[10px] xs:text-xs sm:text-sm font-light tracking-[0.1em] sm:tracking-[0.2em] uppercase font-display truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[280px]">
              {isGeneratingPdf
                ? 'Preparing Order'
                : adminViewingOrder
                ? 'Order Details'
                : submitSuccess
                ? 'Order Placed'
                : isCheckingOut 
                ? 'Complete Order'
                : isViewingMyOrders
                ? 'My Orders'
                : isViewingProfile
                ? 'Profile'
                : isViewingWishlist
                ? 'Wishlist'
                : selectedCategory && !currentFolder
                ? selectedCategory
                : ''}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 xs:gap-4 sm:gap-6 shrink-0 z-20">
          {!isCheckingOut && !isViewingWishlist && (
            <button
              onClick={() => navigateState({ isViewingWishlist: true })}
              className={cn(
                "flex items-center justify-center transition-colors h-8 relative",
                wishlistedPosters.length > 0 ? "text-black" : "text-[#999] hover:text-black"
              )}
            >
              <Heart className={cn("w-4 h-4 sm:w-4 sm:h-4 mr-0 sm:mr-2", wishlistedPosters.length > 0 ? "fill-red-500 text-red-500" : "")} />
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] hidden sm:inline">Wishlist</span>
              {wishlistedPosters.length > 0 && (
                <span className="text-[9px] sm:text-xs ml-1 font-mono bg-black text-white px-1.5 py-0.5 rounded-full sm:bg-transparent sm:text-inherit sm:p-0">
                  {wishlistedPosters.length}
                </span>
              )}
            </button>
          )}
          {!clientEmail.trim() ? (
            <button
              onClick={() => setNeedsAuth(true)}
              className="flex items-center justify-center transition-colors text-[#999] hover:text-black h-8 shrink-0 relative"
            >
              <UserIcon className="w-4 h-4 sm:w-4 sm:h-4 mr-0 sm:mr-2" />
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] hidden sm:inline whitespace-nowrap">Sign In</span>
            </button>
          ) : (
            <button
              onClick={() => {
                navigateState({ 
                  isViewingProfile: true, 
                  isCheckingOut: false, 
                  isViewingWishlist: false, 
                  isViewingMyOrders: false,
                  isViewingContactUs: false,
                  currentFolder: null,
                  selectedCategory: null
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={cn(
                "flex items-center justify-center transition-colors h-8 shrink-0",
                isViewingProfile ? "text-black font-bold" : "text-[#999] hover:text-black"
              )}
              title="View Profile"
            >
              <UserIcon className="w-4 h-4 sm:w-4 sm:h-4 mr-0 sm:mr-2" />
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] hidden sm:inline">Profile</span>
            </button>
          )}
          {!isViewingWishlist && (
            <button
              onClick={() => navigateState({ isCheckingOut: true })}
              className={cn(
                "flex items-center justify-center transition-colors h-8 shrink-0 relative",
                cartLines.length > 0 ? "text-black" : "text-[#999] hover:text-black"
              )}
            >
              <ShoppingBag className="w-4 h-4 sm:w-4 sm:h-4 mr-0 sm:mr-2" />
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] hidden sm:inline">Cart</span>
              <span className="text-[9px] sm:text-xs ml-1 font-mono bg-black text-white px-1.5 py-0.5 rounded-full sm:bg-transparent sm:text-inherit sm:p-0">
                {cartLines.reduce((sum, l) => sum + l.quantity, 0)}
              </span>
            </button>
          )}
          <button 
            onClick={() => {
              navigateState({ isSidebarOpen: true, sidebarView: 'menu' });
            }}
            className="p-1 sm:p-1.5 hover:bg-[#F0F0F0] rounded-full transition-colors flex items-center justify-center shrink-0 -mr-1.5 sm:mr-0 ml-0.5"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-12 pt-4 sm:pt-6 pb-32 break-words">
        
        {/* Dynamic Tagline Banner & Customization Button */}
        <div className="flex flex-col items-center justify-center pt-2 pb-4 mb-4 text-center">
          {!isCheckingOut && !submitSuccess && !isViewingMyOrders && !isViewingWishlist && !isViewingProfile && (
            <p className="text-xs sm:text-sm font-light tracking-[0.25em] text-[#1A1A1A] uppercase font-sans mb-3">
              DISCOVER ART THAT DEFINES YOUR SPACE
            </p>
          )}
          <a
            href="https://wa.me/917207733216?text=Hi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-black px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-bold bg-white text-black hover:bg-black hover:text-white transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <svg
              className="w-3.5 h-3.5 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12.011 2.222c-5.385 0-9.768 4.383-9.768 9.77 0 1.721.447 3.4 1.3 4.877L2.224 21.78l5.024-1.318a9.71 9.71 0 0 0 4.761 1.25c5.385 0 9.769-4.383 9.769-9.77s-4.383-9.77-9.767-9.77zm0 17.925c-1.611 0-3.19-.433-4.568-1.253l-.328-.194-3.395.89.907-3.31-.212-.338a7.922 7.922 0 0 1-1.21-4.17c0-4.394 3.575-7.969 7.971-7.969 4.394 0 7.969 3.575 7.969 7.97 0 4.394-3.575 7.969-7.971 7.969zm4.368-5.975c-.24-.12-1.415-.698-1.635-.778-.22-.08-.38-.12-.54.12-.16.24-.62.778-.76.938-.14.16-.28.18-.52.06a6.55 6.55 0 0 1-1.93-1.188A7.26 7.26 0 0 1 9.61 12.04c-.2-.348-.02-.536.152-.708.156-.156.348-.407.52-.61.173-.203.23-.347.347-.58.116-.23.06-.433-.03-.612-.09-.18-.76-1.83-1.04-2.51-.27-.66-.55-.57-.76-.58H7.31c-.18 0-.48.067-.73.34-.25.27-.954.933-.954 2.275s.976 2.632 1.112 2.813c.135.18 1.92 2.93 4.65 4.113.65.28 1.157.447 1.554.573.65.207 1.242.178 1.71.108.52-.078 1.415-.578 1.615-1.138.2-.56.2-1.04.14-1.138-.06-.1-.22-.16-.46-.28z"/>
            </svg>
            Customization
          </a>
        </div>
        
        {/* PDF GENERATION LOADING VIEW */}
        {isGeneratingPdf ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-300">
            <Loader2 className="w-10 h-10 text-black animate-spin mb-8" />
            <h2 className="text-xl font-light tracking-[0.2em] uppercase mb-4 text-[#1A1A1A]">Preparing Your Order</h2>
            <p className="text-[11px] text-[#999] uppercase tracking-wider max-w-md mx-auto leading-relaxed font-bold text-center">
              Generating your print-ready PDF. This will just take a moment.
            </p>
          </div>
        ) : /* SUCCESS VIEW */
        submitSuccess ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 border border-[#E5E5E5] bg-white flex items-center justify-center mb-8">
              <span className="text-2xl text-black">✓</span>
            </div>
            <h2 className="text-xl font-light tracking-[0.2em] uppercase mb-4 text-[#1A1A1A]">Order Confirmed</h2>
            <p className="text-[11px] text-[#999] uppercase tracking-wider max-w-md mx-auto mb-10 leading-relaxed font-bold text-center">
              THANK YOU {customerName.toUpperCase()}. YOUR ORDER HAS BEEN PLACED. WE WILL CONTACT YOU AT {customerPhone}.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setSubmitSuccess(false);
                  navigateState({ isCheckingOut: false, currentFolder: null, isSidebarOpen: true });
                  openMyOrders();
                }}
                className="bg-white border text-black border-black px-8 py-4 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-[#F7F7F7] transition-colors"
              >
                View My Orders
              </button>
              <button
                onClick={() => {
                  setSubmitSuccess(false);
                  navigateState({ isCheckingOut: false, currentFolder: null });
                }}
                className="bg-black text-white px-8 py-4 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-[#333] transition-colors"
              >
                Browse More Posters
              </button>
            </div>
          </div>
        ) : adminViewingOrder ? (
          <div className="max-w-4xl mx-auto bg-[#F7F7F7] border border-[#E5E5E5] animate-in fade-in slide-in-from-bottom-4 duration-300 mt-8 sm:mt-12">
            <div className="p-8 sm:p-12 border-b border-[#E5E5E5] flex flex-col md:flex-row gap-8 justify-between bg-white">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-[#999] font-semibold mb-2">Order Date</label>
                <h2 className="text-xl font-bold">{adminViewingOrder.date}</h2>
                <div className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[#999] bg-[#F7F7F7] px-3 py-1">
                  Submitted
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-12 text-sm max-w-2xl bg-white border border-[#E5E5E5] p-6 shadow-sm">
                <div>
                  <span className="text-[9px] text-[#999] uppercase tracking-widest block mb-1">Customer Name</span>
                  <span className="font-bold text-xs">{adminViewingOrder.customerName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#999] uppercase tracking-widest block mb-1">Phone Number</span>
                  <span className="font-bold text-xs">{adminViewingOrder.phone}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#999] uppercase tracking-widest block mb-1">Email Address</span>
                  <span className="font-bold text-xs">{adminViewingOrder.email}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#999] uppercase tracking-widest block mb-1">Total Items</span>
                  <span className="font-bold text-xs">{adminViewingOrder.count}</span>
                </div>
              </div>
            </div>
            <div className="p-8 sm:p-12">
              <h3 className="text-xs uppercase tracking-[0.15em] text-[#999] font-bold mb-8">My orders</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6">
                {parsePostersStr(adminViewingOrder.posters).map((pp, idx) => {
                  // Find matching poster to get thumbnail
                  const matchingFile = (allPosters.length > 0 ? allPosters : posters).find(p => formatPosterName(p.name).trim().toLowerCase() === pp.name.toLowerCase());
                  
                  return (
                    <div key={idx} className="flex flex-col group bg-white border border-[#E5E5E5] p-3 shadow-sm hover:shadow-md transition-shadow h-full">
                      <div className="w-full bg-[#F7F7F7] border border-[#E5E5E5] relative mb-3 flex items-center justify-center min-h-[120px] h-full overflow-hidden">
                        {matchingFile ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <img src={matchingFile.thumbnailLink} alt={formatPosterName(pp.name)} className="w-full h-auto max-h-full transform group-hover:scale-105 transition-transform duration-500" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-center p-4 text-[10px] text-[#999] uppercase tracking-widest">
                            No Image
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur border border-[#E5E5E5] px-2 py-1 text-[10px] font-bold text-black tabular-nums">
                          {pp.qty}x
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-black truncate w-full" title={formatPosterName(pp.name)}>{formatPosterName(pp.name)}</span>
                      <span className="text-[11px] font-bold text-black mt-1">₹40</span>
                      <div className="mt-2 flex items-center justify-between">
                        {pp.size && <span className="text-[9px] uppercase tracking-widest font-bold bg-[#F7F7F7] px-1.5 py-0.5 text-black border border-[#E5E5E5]">Size: {pp.size}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : isCheckingOut ? (
          /* CHECKOUT VIEW */
          <div className="max-w-xl mx-auto bg-white border border-[#E5E5E5] animate-in fade-in slide-in-from-bottom-4 duration-300 mt-8 sm:mt-12">
            <div className="p-8 sm:p-12 border-b border-[#E5E5E5]">
              <label className="block text-[10px] uppercase tracking-[0.15em] text-[#999] font-semibold mb-6">
                01 / Selected Items ({cartLines.reduce((sum, l) => sum + l.quantity, 0)}) - ₹{cartLines.reduce((sum, l) => sum + l.quantity, 0) * 40}
              </label>

              {cartLines.length === 0 ? (
                <div className="mt-4 p-8 bg-[#F7F7F7] border border-[#E5E5E5] text-center text-[#999] text-[11px] uppercase tracking-wider">
                  You haven't selected any posters yet.
                </div>
              ) : (
                <div className="mt-6 space-y-8 pb-4">
                  {[...SIZES, 'Stickers'].map(size => {
                    const linesForSize = cartLines.filter(l => {
                      const isSticker = l.poster.categoryHint === 'Stickers';
                      if (size === 'Stickers') return isSticker;
                      return !isSticker && l.size === size;
                    });
                    if (linesForSize.length === 0) return null;
                    return (
                      <div key={size}>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-black mb-4 flex flex-wrap items-center gap-2 break-words max-w-full">
                          {size} <span className="text-[#999] font-normal">({linesForSize.reduce((sum, l) => sum + l.quantity, 0)} items)</span>
                        </h4>
                        <div className="flex flex-wrap gap-4">
                          {linesForSize.map(l => (
                            <div key={`${l.poster.id}::${l.size}`} className="flex flex-col gap-2 w-24">
                              <div className="relative flex-shrink-0 w-24 border border-[#EEE] bg-[#F7F7F7] group flex items-center justify-center min-h-[120px] overflow-hidden">
                                <div className="flex w-full h-full items-center justify-center">
                                  <img
                                    src={l.poster.thumbnailLink}
                                    alt={formatPosterName(l.poster.name)}
                                    className="w-full h-auto max-h-[150px] opacity-90 group-hover:opacity-100 transition-all"
                                  />
                                </div>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col items-center justify-center gap-2 pointer-events-none">
                                  <span className="text-white text-[10px] opacity-0 group-hover:opacity-100 uppercase tracking-widest font-bold">Preview</span>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeLine(l.poster.id, l.size); }}
                                  className="absolute top-1 right-1 w-6 h-6 bg-white border border-[#E5E5E5] flex items-center justify-center text-[#999] hover:text-black hover:bg-[#F7F7F7] transition-colors z-10"
                                  title="Remove"
                                >
                                  ×
                                </button>
                                <div className="absolute bottom-1 right-1 bg-white border border-[#E5E5E5] px-1.5 py-0.5 text-[9px] font-bold z-10">
                                  {l.quantity}x
                                </div>
                              </div>
                              <div className="px-1 text-center">
                                <p className="text-[9px] font-bold uppercase truncate text-[#1A1A1A]">{formatPosterName(l.poster.name)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-8 sm:p-12">
              <label className="block text-[10px] uppercase tracking-[0.15em] text-[#999] font-semibold mb-6">02 / Customer Profile</label>
              <form onSubmit={handleSubmitOrder} className="space-y-6">
                {checkoutError && (
                  <div className="bg-red-50 text-red-600 p-3 text-xs border border-red-200 font-medium">
                    {checkoutError}
                  </div>
                )}
                <div className="border-b border-black pb-2 transition-colors focus-within:border-[#666]">
                  <label className="block text-[10px] text-[#999] uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    required
                    minLength={3}
                    className="w-full text-base font-medium bg-transparent focus:outline-none placeholder-[#CCC]"
                    placeholder="Enter your name"
                  />
                </div>
                <div className="border-b border-black pb-2 transition-colors focus-within:border-[#666]">
                  <label className="block text-[10px] text-[#999] uppercase tracking-wider mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    required
                    pattern="[0-9\s\-]*"
                    title="Please enter a valid 10-digit phone number"
                    className="w-full text-base font-medium bg-transparent focus:outline-none placeholder-[#CCC]"
                    placeholder="Enter your 10-digit phone number"
                  />
                </div>
                <div className="pt-6 flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || cartLines.length === 0}
                    className="w-full flex items-center justify-center gap-2 py-5 bg-black text-white text-[11px] uppercase tracking-[0.25em] font-bold hover:bg-[#333] transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Submit Selection
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateState({ isCheckingOut: false })}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-transparent border border-[#E5E5E5] text-black text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-[#F7F7F7] transition-all"
                  >
                    Back to Posters
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : isViewingWishlist ? (
          /* WISHLIST VIEW */
          <div>
            <header className="flex items-center justify-between mb-10 border-b border-[#E5E5E5] pb-6 sticky top-20 sm:top-24 bg-[#F7F7F7] z-25 pt-0 sm:pt-0">
              <div className="flex space-x-10">
                <span className="text-xs uppercase tracking-[0.2em] font-bold border-b-2 border-black pb-2 -mb-6">Your Wishlist</span>
              </div>
            </header>

            {wishlistedPosters.length === 0 ? (
              <div className="text-center py-20 border border-[#E5E5E5] bg-white">
                <Heart className="w-8 h-8 text-[#CCC] mx-auto mb-4" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2">Wishlist is empty</h3>
                <p className="text-[10px] text-[#999]">You haven't saved any posters to your wishlist yet.</p>
              </div>
            ) : (
              <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8", cartLines.length > 0 && !isCheckingOut ? "pb-32" : "")}>
                {wishlistedPosters.map(poster => {
                  const isWishlisted = wishlistedPosters.some(p => p.id === poster.id);
                  const previewMode = previewModes[poster.id] || 'portrait';
                  return (
                    <div
                      key={poster.id}
                      className="relative flex flex-col group h-full"
                    >
                      <div 
                        onClick={() => setPreviewingPoster(poster)}
                        className={cn(
                          "bg-[#F9F9F9] py-0 mb-4 relative overflow-hidden transition-all flex justify-center items-center h-[230px] sm:h-[300px] cursor-pointer mx-auto",
                          previewMode === 'landscape' ? "w-[85%]" : "w-full"
                        )}
                        onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                        onTouchEnd={(e) => handleTouchEnd(e, poster.id, previewMode)}
                      >
                        <img 
                          src={poster.thumbnailLink?.replace('=s220', '=s600')} 
                          alt={formatPosterName(poster.name)}
                          className="transition-all duration-500 w-full h-full object-cover ease-in-out group-hover:scale-105"
                        />
                        
                        <div className="absolute inset-x-0 bottom-4 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                          <span className="bg-white/95 text-black text-[9px] uppercase tracking-wider font-bold px-3 py-2 shadow-md border border-gray-100 rounded-sm">
                            Click on the poster to see more options
                          </span>
                        </div>
                        
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"></div>

                        <button
                          onClick={(e) => toggleWishlist(poster, e)}
                          className={cn(
                            "absolute bottom-3 left-3 sm:bottom-4 sm:left-4 p-1.5 sm:p-2 bg-white/95 hover:bg-white rounded-full shadow-md hover:scale-105 active:scale-90 transition-all pointer-events-auto z-10"
                          )}
                        >
                          <Heart className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all duration-300", isWishlisted ? "fill-red-500 text-red-500 scale-110" : "text-black")} />
                        </button>
                      </div>
                      
                      <div className="flex justify-between items-start flex-1 flex-col">
                        <div className="w-full relative cursor-pointer" onClick={() => setPreviewingPoster(poster)}>
                          <div className="flex justify-between items-start group/info">
                            <div className="truncate">
                              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-1 text-[#1A1A1A] truncate">{formatPosterName(poster.name)}</h3>
                                  <p className="text-[11px] font-bold text-black mt-1 mb-1">₹40</p>
                                  {poster.description && (
                                    <p className="text-[10px] text-[#999] uppercase tracking-wider truncate">
                                      <span className="font-bold text-black">{poster.description}</span>
                                    </p>
                                  )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewingPoster(poster);
                          }}
                          className="mt-3 w-full py-2 bg-black text-white text-[10px] uppercase font-bold tracking-wider hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* STICKY CHECKOUT BAR */}
            {cartLines.length > 0 && !isCheckingOut && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black p-4 px-6 sm:px-12 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase tracking-widest font-bold">
                    {cartLines.length > 0 ? (() => {
                      const totalQty = cartLines.reduce((sum, l) => sum + l.quantity, 0);
                      return `${totalQty} Item${totalQty !== 1 ? 's' : ''} Selected - ₹${totalQty * 40}`;
                    })() : ''}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => navigateState({ isViewingWishlist: false })} 
                    className="text-[10px] uppercase font-bold tracking-widest text-[#999] hover:text-black transition-colors px-4 py-3"
                  >
                    Continue Browsing
                  </button>
                  <button
                    onClick={() => navigateState({ isCheckingOut: true })}
                    className="bg-black text-white px-8 py-3 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-[#333] transition-colors flex items-center gap-2"
                  >
                    Checkout <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : isViewingMyOrders ? (
          /* MY ORDERS VIEW */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 sm:gap-0 sticky top-20 sm:top-24 bg-[#F7F7F7] z-25 pb-2 pt-0 sm:pt-0">
              <div className="flex space-x-10 border-b border-[#E5E5E5] pb-2 w-full">
                <span className="text-xs uppercase tracking-[0.2em] font-bold border-b-2 border-black pb-2 -mb-[10px]">Your Order History</span>
              </div>
            </header>
            
                <div className="space-y-6">
                  {selectedOrderFolder ? (
                    <div>
                      <button 
                        onClick={() => navigateState({ selectedOrderFolder: null })}
                        className="flex items-center gap-2 text-[10px] uppercase font-bold text-[#999] hover:text-black mb-6"
                      >
                        <ChevronLeft className="w-4 h-4" /> Back to orders
                      </button>
                      <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Order Summary</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {orderPosters.map(poster => (
                          <div key={poster.id} className="bg-[#F7F7F7] border border-[#E5E5E5] flex items-center justify-center min-h-[150px]">
                            <div className="flex w-full h-full justify-center items-center">
                              <img src={poster.thumbnailLink} alt={formatPosterName(poster.name)} className="w-full h-auto max-h-[250px] transform hover:scale-105 transition-transform duration-500" />
                            </div>
                          </div>
                        ))}
                        {orderPosters.length === 0 && !isLoadingOrders && (
                          <div className="col-span-2 text-center text-xs text-[#999] py-10">No posters found in this order.</div>
                        )}
                      </div>
                    </div>
                  ) : selectedSheetOrder ? (
                    <div>
                      <button 
                        onClick={() => navigateState({ selectedSheetOrder: null })}
                        className="flex items-center gap-2 text-[10px] uppercase font-bold text-[#999] hover:text-black mb-6"
                      >
                        <ChevronLeft className="w-4 h-4" /> Back to orders
                      </button>
                      <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Submitted Order Details</h3>
                      
                      <div className="space-y-6">
                        <div className="border border-[#E5E5E5] p-4 bg-[#F7F7F7]">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-[10px] text-[#999] uppercase tracking-widest block mb-1">Date</span>
                              <span className="font-bold">{selectedSheetOrder.date}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#999] uppercase tracking-widest block mb-1">Posters Count</span>
                              <span className="font-bold">{selectedSheetOrder.count}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#999] uppercase tracking-widest block mb-1">Customer Name</span>
                              <span className="font-bold">{selectedSheetOrder.customerName}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#999] uppercase tracking-widest block mb-1">Phone Number</span>
                              <span className="font-bold">{selectedSheetOrder.phone}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest mb-3 text-[#999]">My orders</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6">
                            {parsePostersStr(selectedSheetOrder.posters).map((pp, i) => {
                              const matchingFile = (allPosters.length > 0 ? allPosters : posters).find(f => formatPosterName(f.name).trim().toLowerCase() === pp.name.toLowerCase());
                              return (
                                <div key={i} className="flex flex-col group bg-white border border-[#E5E5E5] p-3 shadow-sm hover:shadow-md transition-shadow h-full">
                                  <div className="w-full bg-[#F7F7F7] border border-[#E5E5E5] relative mb-3 flex items-center justify-center min-h-[120px] h-full overflow-hidden">
                                    {matchingFile ? (
                                      <div className="flex w-full h-full items-center justify-center">
                                        <img src={matchingFile.thumbnailLink} alt={formatPosterName(pp.name)} className="w-full h-auto max-h-full transform group-hover:scale-105 transition-transform duration-500" />
                                      </div>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-center p-4 text-[10px] text-[#999] uppercase tracking-widest">
                                        No Image
                                      </div>
                                    )}
                                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur border border-[#E5E5E5] px-2 py-1 text-[10px] font-bold text-black tabular-nums">
                                      {pp.qty}x
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-bold text-black truncate w-full" title={formatPosterName(pp.name)}>{formatPosterName(pp.name)}</span>
                      <span className="text-[11px] font-bold text-black mt-1">₹40</span>
                                  <div className="mt-2 flex items-center justify-between">
                                    {pp.size && <span className="text-[9px] uppercase tracking-widest font-bold bg-[#F7F7F7] px-1.5 py-0.5 text-black border border-[#E5E5E5]">Size: {pp.size}</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {isLoadingOrders ? (
                        <div className="flex justify-center py-20">
                          <Loader2 className="w-8 h-8 animate-spin text-[#CCC]" />
                        </div>
                      ) : (myOrdersFolders.length === 0 && mySheetOrders.length === 0) ? (
                        <div className="text-center py-20 border border-[#E5E5E5] bg-[#F7F7F7]">
                          <ShoppingBag className="w-8 h-8 text-[#CCC] mx-auto mb-4" />
                          <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2">No Orders</h3>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {mySheetOrders.map((order, idx) => {
                            const parsed = parsePostersStr(order.posters);
                            return (
                            <div 
                              key={`sheet-${idx}`} 
                              className="border border-[#E5E5E5] p-4 flex flex-col gap-2 hover:border-black cursor-pointer transition-colors"
                              onClick={() => {
                                navigateState({ selectedSheetOrder: order });
                              }}
                            >
                              <div className="flex justify-between items-start">
                                <h4 className="text-xs font-bold text-gray-700">{order.date}</h4>
                                <span className="text-[10px] text-[#999] bg-[#F0F0F0] px-2 py-1 uppercase tracking-widest">Submitted</span>
                              </div>
                              <p className="text-[10px] text-gray-500 mt-2">
                                Posters: <span className="font-bold text-gray-800">{order.count}</span>
                              </p>
                              <div className="flex flex-row gap-2 mt-2 overflow-x-auto pb-2 scrollbar-hide">
                                {parsed.slice(0, 5).map((pp, i) => {
                                  const matchingFile = (allPosters.length > 0 ? allPosters : posters).find(f => formatPosterName(f.name).trim().toLowerCase() === pp.name.toLowerCase());
                                  if (matchingFile) {
                                    return <img key={i} src={matchingFile.thumbnailLink} alt="poster" className="w-12 h-16 object-cover border border-[#E5E5E5]" />;
                                  }
                                  return <div key={i} className="w-12 h-16 bg-[#F7F7F7] border border-[#E5E5E5] flex items-center justify-center text-[8px] text-[#999] text-center p-1">No Img</div>;
                                })}
                                {parsed.length > 5 && (
                                  <div className="w-12 h-16 bg-[#F7F7F7] border border-[#E5E5E5] flex items-center justify-center text-[10px] font-bold text-[#999]">
                                    +{parsed.length - 5}
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] text-[#999] uppercase tracking-widest mt-2 flex items-center gap-2">
                                View Details <ArrowRight className="w-3 h-3" />
                              </p>
                            </div>
                          )})}
                          {myOrdersFolders.map(folder => (
                            <div 
                              key={folder.id} 
                              className="border border-[#E5E5E5] p-4 flex flex-col gap-2 hover:border-black cursor-pointer transition-colors"
                              onClick={() => previewOrder(folder)}
                            >
                              <div className="flex justify-between items-start">
                                <h4 className="text-xs font-bold">{folder.name}</h4>
                                <span className="text-[10px] text-[#999] bg-[#F0F0F0] px-2 py-1 uppercase tracking-widest">Custom Upload</span>
                              </div>
                              <p className="text-[10px] text-[#999] uppercase tracking-widest mt-2 flex items-center gap-2">
                                View Order <ArrowRight className="w-3 h-3" />
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

          </div>
        ) : isViewingProfile ? (
          /* PROFILE VIEW */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-2xl mx-auto py-8 sm:py-12">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-4 border-b border-[#E5E5E5] sticky top-20 sm:top-24 bg-[#F7F7F7] z-25">
              <div className="flex space-x-10 pb-2 w-full">
                <span className="text-xs uppercase tracking-[0.2em] font-bold border-b-2 border-black pb-2 -mb-[10px]">Your Profile</span>
              </div>
            </header>
            
            <div className="bg-white border border-[#E5E5E5] p-8 sm:p-12 shadow-sm">
              <div className="w-12 h-12 bg-[#F7F7F7] border border-[#E5E5E5] flex items-center justify-center mx-auto mb-6 text-black rounded-none">
                <UserIcon className="w-5 h-5" />
              </div>
              
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#1A1A1A] mb-8 text-center">Profile Information</h2>
              
              {profileSaveSuccess && (
                <div className="bg-green-50 text-green-600 p-3 text-xs border border-green-200 font-medium mb-6 text-center animate-in fade-in">
                  {profileSaveSuccess}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#999] font-bold mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => {
                      setProfileName(e.target.value);
                      setProfileSaveSuccess('');
                    }}
                    className="w-full bg-[#F9F9F9] border border-[#E5E5E5] px-4 py-3 text-xs font-semibold focus:outline-none focus:border-black focus:bg-white transition-all"
                    placeholder="Enter your name"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#999] font-bold mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={clientEmail}
                    disabled
                    className="w-full bg-[#E5E5E5]/40 border border-[#E5E5E5] px-4 py-3 text-xs font-semibold text-[#666] cursor-not-allowed"
                    placeholder="Email ID"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#999] font-bold mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={profilePhone || ''}
                    onChange={(e) => {
                      setProfilePhone(e.target.value);
                      setProfileSaveSuccess('');
                    }}
                    className="w-full bg-[#F9F9F9] border border-[#E5E5E5] px-4 py-3 text-xs font-semibold focus:outline-none focus:border-black focus:bg-white transition-all"
                    placeholder={profilePhone ? "" : "Not provided yet"}
                  />
                  {!profilePhone && (
                    <p className="text-[10px] text-[#999] mt-1 italic">Adding a phone number helps us process and match your orders quickly.</p>
                  )}
                </div>
                
                <div className="pt-4">
                  <button
                    onClick={async () => {
                      setIsSubmitting(true);
                      setProfileSaveSuccess('');
                      try {
                        const sheetId = await getOrCreateUsersSheet();
                        const usersData = await fetchAllUsers(sheetId);
                        let targetIndex = userRowIndex;
                        if (targetIndex === null || targetIndex === -1) {
                          targetIndex = usersData.findIndex(row => row[0] === clientEmail.trim().toLowerCase());
                        }
                        if (targetIndex !== -1 && targetIndex !== null) {
                          const userRow = usersData[targetIndex];
                          const updatedRow = [...userRow];
                          updatedRow[5] = profileName.trim();
                          updatedRow[6] = profilePhone.trim();
                          await updateUserRow(sheetId, targetIndex, updatedRow);
                          setCustomerName(profileName.trim());
                          setCustomerPhone(profilePhone.trim());
                          setProfileSaveSuccess('Your profile has been updated successfully!');
                        } else {
                          // Fallback: append if not found by index or email
                          const dateStr = new Date().toLocaleString();
                          await appendUserRow(sheetId, [
                            clientEmail.trim().toLowerCase(), 
                            '', // password placeholder
                            dateStr, 
                            'N/A', 
                            'N/A',
                            profileName.trim(),
                            profilePhone.trim()
                          ]);
                          setCustomerName(profileName.trim());
                          setCustomerPhone(profilePhone.trim());
                          setProfileSaveSuccess('Your profile has been saved successfully!');
                        }
                      } catch (err) {
                        console.error('Error saving profile changes:', err);
                        setProfileSaveSuccess('Failed to save profile changes. Please try again.');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="w-full bg-black text-white py-4 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Save Profile Changes"
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-12 flex flex-col gap-4">
              <button
                onClick={() => navigateState({ isViewingProfile: false })}
                className="text-[10px] uppercase tracking-widest font-bold text-[#999] hover:text-black transition-colors"
              >
                Back to Collections
              </button>
            </div>
          </div>
        ) : !currentFolder ? (
          /* CATEGORIES (FOLDERS) VIEW */
          <div>
            <header className="flex flex-col-reverse sm:flex-row sm:items-center justify-between mb-14 gap-4 sm:gap-0 sticky top-20 sm:top-24 bg-[#F7F7F7] z-25 pb-4 pt-4">
              <div>
                <h2 className="text-xl font-light tracking-[0.2em] uppercase mb-2">
                  {selectedCategory ? selectedCategory : "Collections"}
                </h2>
                <p className="text-[10px] text-[#999] uppercase tracking-widest">
                  {selectedCategory ? "Select a folder to view catalogs" : "Select a category to view collections"}
                </p>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-[#999]" />
                  <input
                    type="text"
                    value={folderSearchQuery}
                    onChange={(e) => setFolderSearchQuery(e.target.value)}
                    placeholder={selectedCategory ? `Search in ${selectedCategory}...` : "Search collections..."}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#E5E5E5] focus:outline-none focus:border-black transition-colors"
                  />
                </div>
                {selectedCategory && (
                  <div className="flex items-center border border-[#E5E5E5] bg-[#F9F9F9] p-0.5 shrink-0">
                    <button
                      onClick={() => setFolderLayout('grid')}
                      className={cn("p-1.5 transition-colors", folderLayout === 'grid' ? "bg-white border border-[#E5E5E5] text-black shadow-sm" : "text-[#999] hover:text-black")}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setFolderLayout('list')}
                      className={cn("p-1.5 transition-colors", folderLayout === 'list' ? "bg-white border border-[#E5E5E5] text-black shadow-sm" : "text-[#999] hover:text-black")}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </header>

            {foldersError ? (
              <div className="bg-red-50 text-red-600 p-8 border border-red-200 text-center mb-8">
                <h3 className="text-sm font-bold mb-2">Error Loading Folders</h3>
                <p className="text-xs">{foldersError}</p>
              </div>
            ) : isLoadingFolders ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#CCC]" />
              </div>
            ) : folders.length === 0 ? (
              <div className="text-center py-20 border border-[#E5E5E5] bg-white">
                <Folder className="w-8 h-8 text-[#CCC] mx-auto mb-4" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2">No folders found</h3>
                <p className="text-[10px] text-[#999] max-w-sm mx-auto">Make sure your Google Drive has folders containing your poster images.</p>
              </div>
            ) : (() => {
              const query = folderSearchQuery.toLowerCase().trim();
              if (!query) return false;

              if (selectedCategory) {
                const isCatNameMatch = selectedCategory.toLowerCase().includes(query);
                if (isCatNameMatch) return false;
                
                const hasFolderMatch = folders.some(f => 
                  getFolderCategory(f) === selectedCategory && 
                  (f.name || '').toLowerCase().includes(query)
                );
                return !hasFolderMatch;
              } else {
                const hasAnyMatchedCategory = FOLDER_CATEGORIES.some(cat => {
                  const isCatNameMatch = cat.name.toLowerCase().includes(query);
                  const hasMatchingFoldersInCat = folders.some(f => 
                    getFolderCategory(f) === cat.name && 
                    (f.name || '').toLowerCase().includes(query)
                  );
                  return (isCatNameMatch && folders.some(f => getFolderCategory(f) === cat.name)) || hasMatchingFoldersInCat;
                });
                return !hasAnyMatchedCategory;
              }
            })() ? (
              <div className="text-center py-20 border border-[#E5E5E5] bg-white">
                <Search className="w-8 h-8 text-[#CCC] mx-auto mb-4" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2">No results</h3>
                <p className="text-[10px] text-[#999] max-w-sm mx-auto">No folders match your search query "{folderSearchQuery}".</p>
              </div>
            ) : !selectedCategory ? (
              /* CATEGORIES HOME LIST */
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
                  {[...FOLDER_CATEGORIES.map(c => c.name)].filter(n => n !== 'Stickers').sort((a,b) => a === 'Others' ? 1 : b === 'Others' ? -1 : a.localeCompare(b)).map(categoryName => {
                    const isCatNameMatch = categoryName.toLowerCase().includes(folderSearchQuery.toLowerCase().trim());
                    const allCategoryFolders = folders.filter(f => getFolderCategory(f) === categoryName);
                    
                    const categoryFolders = isCatNameMatch
                      ? allCategoryFolders
                      : allCategoryFolders.filter(f => (f.name || '').toLowerCase().includes(folderSearchQuery.toLowerCase().trim()));
                      
                    if (categoryFolders.length === 0) return null;
                    const cardPoster = categoryPosters[categoryName];

                    return (
                      <div
                        key={categoryName}
                        onClick={() => navigateState({ selectedCategory: categoryName })}
                        className={cn(
                          "group p-6 border transition-all hover:shadow-sm duration-300 flex flex-col justify-between cursor-pointer relative min-h-[140px] sm:min-h-[160px] overflow-hidden",
                          cardPoster
                            ? "border-[#E5E5E5] hover:border-black bg-cover bg-center"
                            : "bg-white border-[#E5E5E5] hover:border-black"
                        )}
                        style={
                          cardPoster
                            ? { backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.75)), url('${cardPoster.thumbnailLink?.replace('=s220', '=s600')}')` }
                            : undefined
                        }
                      >
                        {cardPoster && (
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 w-[72px] h-[100px] border border-white bg-white shadow-[2px_12px_24px_rgba(0,0,0,0.35)] rotate-3 overflow-hidden select-none pointer-events-none z-[1] transition-transform group-hover:rotate-[-2deg] group-hover:scale-105 duration-500">
                            {/* Poster Image */}
                            <img
                              src={cardPoster.thumbnailLink?.replace('=s220', '=s600')}
                              alt={formatPosterName(cardPoster.name)}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            {/* Tape effects */}
                            <div className="absolute -top-1 -left-2 w-7 h-2.5 bg-white/45 backdrop-blur-[0.5px] rotate-[-25deg] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-y border-white/30" />
                            <div className="absolute -top-1 -right-2 w-7 h-2.5 bg-white/45 backdrop-blur-[0.5px] rotate-[25deg] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-y border-white/30" />
                          </div>
                        )}

                        <div className={cn("relative z-10 flex flex-col justify-between h-full w-full", cardPoster && "max-w-[140px]")}>
                          <div className="flex justify-between items-start w-full gap-2">
                            <div className={cn(
                              "w-12 h-12 flex items-center justify-center border transition-colors rounded-none",
                              cardPoster
                                ? "bg-white/80 border-white/50 backdrop-blur-sm group-hover:bg-white group-hover:border-black"
                                : "border-[#EEE] group-hover:bg-[#F9F9F9] group-hover:border-black"
                            )}>
                              {getCategoryIcon(categoryName)}
                            </div>
                          </div>
                          <div className="mt-4">
                            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-[0.15em] text-black group-hover:translate-x-1 transition-transform duration-300 flex flex-wrap items-center gap-2 break-words whitespace-normal">
                              <span className="break-words">{categoryName}</span>
                              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </h3>
                            <p className="text-[10px] text-black/60 mt-1 line-clamp-1">
                              {categoryFolders.slice(0, 3).map(f => formatFolderDisplayName(f.name)).join(', ')}
                              {categoryFolders.length > 3 ? '...' : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* INDIVIDUAL CATEGORY SUB-FOLDERS VIEW */
              <div className="animate-in fade-in duration-300">
                <div className="mb-6 flex items-center justify-between">
                  <button
                    onClick={() => navigateState({ selectedCategory: null })}
                    className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-[#999] hover:text-black transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Categories
                  </button>
                </div>
                
                {(() => {
                  const categoryName = selectedCategory;
                  const isCatNameMatch = categoryName.toLowerCase().includes(folderSearchQuery.toLowerCase().trim());
                  const allCategoryFolders = folders
                    .filter(f => getFolderCategory(f) === categoryName)
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                  
                  const categoryFolders = isCatNameMatch
                    ? allCategoryFolders
                    : allCategoryFolders.filter(f => (f.name || '').toLowerCase().includes(folderSearchQuery.toLowerCase().trim()));
                  
                  if (categoryFolders.length === 0) {
                    return (
                      <div className="text-center py-20 border border-[#E5E5E5] bg-white">
                        <Search className="w-8 h-8 text-[#CCC] mx-auto mb-4" />
                        <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2">No results</h3>
                        <p className="text-[10px] text-[#999] max-w-sm mx-auto">No folders match your search within this category.</p>
                      </div>
                    );
                  }

                  const currentPage = categoryPages[categoryName] || 1;
                  
                  // Dynamically calculate items per page to fill exactly 2 rows in the grid
                  let columns = 6;
                  if (windowWidth < 640) {
                    columns = 3;
                  } else if (windowWidth < 768) {
                    columns = 4;
                  } else if (windowWidth < 1024) {
                    columns = 5;
                  } else {
                    columns = 6;
                  }
                  
                  const itemsPerPage = folderLayout === 'grid' ? (columns * 2) : 10;
                  const totalPages = Math.ceil(categoryFolders.length / itemsPerPage);
                  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
                  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const displayedFolders = categoryFolders.slice(startIndex, endIndex);

                  return (
                    <div>
                      {folderLayout === 'grid' ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                          {displayedFolders.map(folder => (
                            <SubFolderCard
                              key={folder.id}
                              folder={folder}
                              layout="grid"
                              onSelect={loadPosters}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {displayedFolders.map(folder => (
                            <SubFolderCard
                              key={folder.id}
                              folder={folder}
                              layout="list"
                              onSelect={loadPosters}
                            />
                          ))}
                        </div>
                      )}
                      
                      {totalPages > 1 && (
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t border-[#E5E5E5] pt-4 gap-4 sm:gap-0">
                          <div className="text-[9px] sm:text-[10px] text-[#999] uppercase tracking-widest text-center sm:text-left">
                            Showing {startIndex + 1}–{Math.min(endIndex, categoryFolders.length)} of {categoryFolders.length} folders
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap justify-center">
                            <button
                              disabled={safeCurrentPage === 1}
                              onClick={() => {
                                setCategoryPages(prev => ({ ...prev, [categoryName]: safeCurrentPage - 1 }));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-1 px-2 border border-[#E5E5E5] text-black hover:border-black transition-colors disabled:opacity-30 disabled:hover:border-[#E5E5E5] text-[9px] sm:text-[10px] flex items-center gap-1 uppercase tracking-wider font-bold"
                            >
                              <ChevronLeft className="w-3 h-3" /> Prev
                            </button>
                            
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                              <button
                                key={pageNum}
                                onClick={() => {
                                  setCategoryPages(prev => ({ ...prev, [categoryName]: pageNum }));
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={cn(
                                  "w-6 h-6 sm:w-7 sm:h-7 text-[9px] sm:text-[10px] font-bold transition-all border flex items-center justify-center",
                                  safeCurrentPage === pageNum 
                                    ? "bg-black border-black text-white" 
                                    : "border-[#E5E5E5] text-[#666] hover:border-black hover:text-black"
                                )}
                              >
                                {pageNum}
                              </button>
                            ))}

                            <button
                              disabled={safeCurrentPage === totalPages}
                              onClick={() => {
                                setCategoryPages(prev => ({ ...prev, [categoryName]: safeCurrentPage + 1 }));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-1 px-2 border border-[#E5E5E5] text-black hover:border-black transition-colors disabled:opacity-30 disabled:hover:border-[#E5E5E5] text-[9px] sm:text-[10px] flex items-center gap-1 uppercase tracking-wider font-bold"
                            >
                              Next <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          /* POSTERS (IMAGES) VIEW */
          <div>
            <header className="flex flex-col items-center justify-center mb-6 sticky top-20 sm:top-24 bg-[#F7F7F7] border-0 z-25 py-2 sm:py-4 gap-2 w-full">
              <div className="flex items-center justify-center gap-2 max-w-full px-4">
                <button 
                  onClick={() => {
                    navigateBack();
                  }}
                  className="p-1 hover:text-black transition-colors text-[#999] shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center truncate">
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.2em] font-bold truncate">{formatFolderDisplayName(currentFolder?.name)}</span>
                </div>
              </div>
            </header>

            {isLoadingPosters ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#CCC]" />
              </div>
            ) : posters.length === 0 ? (
              <div className="text-center py-20 border border-[#E5E5E5] bg-white">
                <ImageIcon className="w-8 h-8 text-[#CCC] mx-auto mb-4" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2">No posters found</h3>
                <p className="text-[10px] text-[#999]">This folder doesn't contain any images.</p>
              </div>
            ) : (() => {
              const posterColumns = windowWidth >= 768 ? 4 : windowWidth >= 640 ? 3 : 2;
              const posterItemsPerPage = posterColumns * 2;
              const currentFolderId = currentFolder ? currentFolder.id : 'unknown';
              const currentPosterPage = folderPosterPages[currentFolderId] || 1;
              const totalPosterPages = Math.ceil(posters.length / posterItemsPerPage);
              const safePosterPage = Math.min(currentPosterPage, Math.max(1, totalPosterPages));
              const startPosterIndex = (safePosterPage - 1) * posterItemsPerPage;
              const endPosterIndex = startPosterIndex + posterItemsPerPage;
              const displayedPosters = posters.slice(startPosterIndex, endPosterIndex);

              return (
                <div>
                  <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8", cartLines.length > 0 && !isCheckingOut ? "pb-32" : "")}>
                    {displayedPosters.map(poster => {
                      const previewMode = previewModes[poster.id] || 'portrait';
                      return (
                        <div
                          key={poster.id}
                          className="relative flex flex-col group h-full"
                        >
                          <div 
                            onClick={() => setPreviewingPoster(poster)}
                            className={cn(
                              "bg-[#F9F9F9] py-0 mb-4 relative overflow-hidden transition-all flex items-center justify-center h-[230px] sm:h-[300px] cursor-pointer mx-auto",
                              previewMode === 'landscape' ? "w-[85%]" : "w-full"
                            )}
                            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                            onTouchEnd={(e) => handleTouchEnd(e, poster.id, previewMode)}
                          >
                            {/* Note: Google Drive thumbnailLinks might require auth to load directly if the file isn't public, 
                                but standard thumbnailLinks are often publicly accessible for a short time or have a token. */}
                             <img 
                              src={poster.thumbnailLink?.replace('=s220', '=s600')} 
                              alt={formatPosterName(poster.name)}
                              className="transition-all duration-500 w-full h-full object-cover ease-in-out group-hover:scale-105"
                            />
                             <div className="absolute inset-x-0 bottom-4 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                               <span className="bg-white/95 text-black text-[9px] uppercase tracking-wider font-bold px-3 py-2 shadow-md border border-gray-100 rounded-sm">
                                 Click on the poster to see more options
                               </span>
                             </div>
                            
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"></div>

                            <button
                              onClick={(e) => toggleWishlist(poster, e)}
                              className={cn(
                                "absolute bottom-3 left-3 sm:bottom-4 sm:left-4 p-1.5 sm:p-2 bg-white/95 hover:bg-white rounded-full shadow-md hover:scale-105 active:scale-90 transition-all pointer-events-auto z-10"
                              )}
                            >
                              <Heart className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all duration-300", wishlistedPosters.some(p => p.id === poster.id) ? "fill-red-500 text-red-500 scale-110" : "text-black")} />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewingPoster(poster);
                              }}
                              className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-black text-white text-[9px] sm:text-[10px] uppercase font-bold tracking-wider rounded shadow-md hover:bg-[#333] hover:scale-105 active:scale-90 transition-all pointer-events-auto z-10 flex items-center gap-1.5"
                            >
                              <ShoppingBag className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> ADD
                            </button>
                          </div>
                          
                          <div className="flex justify-between items-start flex-1 flex-col">
                            <div className="w-full relative cursor-pointer" onClick={() => setPreviewingPoster(poster)}>
                              <div className="flex justify-between items-start group/info">
                                <div className="truncate">
                                  <h3 className="text-[11px] font-bold uppercase tracking-wider mb-1 text-[#1A1A1A] truncate">{formatPosterName(poster.name)}</h3>
                                  <p className="text-[11px] font-bold text-black mt-1 mb-1">₹40</p>
                                  {poster.description && (
                                    <p className="text-[10px] text-[#999] uppercase tracking-wider truncate">
                                      <span className="font-bold text-black">{poster.description}</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewingPoster(poster);
                              }}
                              className="mt-3 w-full py-2 bg-black text-white text-[10px] uppercase font-bold tracking-wider hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {totalPosterPages > 1 && (
                    <div className="mt-12 mb-16 flex flex-col sm:flex-row items-center justify-between border-t border-[#E5E5E5] pt-6 gap-4 sm:gap-0">
                      <div className="text-[9px] sm:text-[10px] text-[#999] uppercase tracking-widest text-center sm:text-left">
                        Showing {startPosterIndex + 1}–{Math.min(endPosterIndex, posters.length)} of {posters.length} posters
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        <button
                          disabled={safePosterPage === 1}
                          onClick={() => {
                            setFolderPosterPages(prev => ({ ...prev, [currentFolderId]: safePosterPage - 1 }));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-1 px-2 border border-[#E5E5E5] text-black hover:border-black transition-colors disabled:opacity-30 disabled:hover:border-[#E5E5E5] text-[9px] sm:text-[10px] flex items-center gap-1 uppercase tracking-wider font-bold"
                        >
                          <ChevronLeft className="w-3 h-3" /> Prev
                        </button>
                        
                        {Array.from({ length: totalPosterPages }, (_, i) => i + 1).map(pageNum => (
                          <button
                            key={pageNum}
                            onClick={() => {
                              setFolderPosterPages(prev => ({ ...prev, [currentFolderId]: pageNum }));
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={cn(
                              "w-6 h-6 sm:w-7 sm:h-7 text-[9px] sm:text-[10px] font-bold transition-all border flex items-center justify-center",
                              safePosterPage === pageNum 
                                ? "bg-black border-black text-white" 
                                : "border-[#E5E5E5] text-[#666] hover:border-black hover:text-black"
                            )}
                          >
                            {pageNum}
                          </button>
                        ))}

                        <button
                          disabled={safePosterPage === totalPosterPages}
                          onClick={() => {
                            setFolderPosterPages(prev => ({ ...prev, [currentFolderId]: safePosterPage + 1 }));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-1 px-2 border border-[#E5E5E5] text-black hover:border-black transition-colors disabled:opacity-30 disabled:hover:border-[#E5E5E5] text-[9px] sm:text-[10px] flex items-center gap-1 uppercase tracking-wider font-bold"
                        >
                          Next <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            
            {/* STICKY CHECKOUT BAR */}
            {cartLines.length > 0 && !isCheckingOut && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black p-4 px-6 sm:px-12 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase tracking-widest font-bold">
                    {cartLines.length > 0 ? (() => {
                      const totalQty = cartLines.reduce((sum, l) => sum + l.quantity, 0);
                      return `${totalQty} Item${totalQty !== 1 ? 's' : ''} Selected - ₹${totalQty * 40}`;
                    })() : ''}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {currentFolder && (
                    <button 
                      onClick={() => navigateState({ currentFolder: null })}
                      className="text-[10px] uppercase tracking-widest font-bold text-[#999] hover:text-black transition-colors px-4 py-3"
                    >
                      Back to Collections
                    </button>
                  )}
                  <button
                    onClick={() => navigateState({ isCheckingOut: true })}
                    className="bg-black text-white px-8 py-3 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-[#333] transition-colors flex items-center gap-2"
                  >
                    Checkout <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* CONTACT US MODAL */}
      {isViewingContactUs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsViewingContactUs(false)} />
          <div className="relative w-full max-w-2xl bg-[#F7F7F7] shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto flex flex-col">
            <header className="flex items-center justify-between p-6 border-b border-[#E5E5E5] bg-white sticky top-0 z-10 shrink-0">
              <span className="text-xs uppercase tracking-[0.2em] font-bold">Contact Us</span>
              <button 
                onClick={() => setIsViewingContactUs(false)}
                className="p-2 hover:bg-[#F0F0F0] rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </header>
            
            <div className="bg-white p-8 sm:p-12 text-center flex-1">
              <div className="flex items-center justify-center -space-x-2.5 mx-auto mb-6">
                <div className="w-10 h-10 bg-white border border-[#E5E5E5] flex items-center justify-center text-black rounded-full shadow-sm z-10">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="w-10 h-10 bg-white border border-[#E5E5E5] flex items-center justify-center text-black rounded-full shadow-sm z-20">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="w-10 h-10 bg-white border border-[#E5E5E5] flex items-center justify-center text-black rounded-full shadow-sm z-10">
                  <Instagram className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#1A1A1A] mb-4">Get In Touch</h2>
              <p className="text-xs text-gray-600 leading-relaxed max-w-md mx-auto mb-4 font-medium">
                For any queries or support, please reach out via email, phone or instagram.
              </p>
              <p className="text-xs text-black font-semibold uppercase tracking-wider mb-8">
                We do customisation too!
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left mt-8">
                <a 
                  href="mailto:abcdcreatorsofficial@abcdcreators.in" 
                  className="group border border-[#E5E5E5] p-5 hover:border-black transition-colors flex flex-col gap-1.5"
                >
                  <span className="text-[10px] uppercase tracking-widest text-[#999] group-hover:text-black transition-colors">Email</span>
                  <span className="text-xs font-bold truncate">abcdcreatorsofficial@abcdcreators.in</span>
                </a>
                <a 
                  href="tel:+917207733216" 
                  className="group border border-[#E5E5E5] p-5 hover:border-black transition-colors flex flex-col gap-1.5"
                >
                  <span className="text-[10px] uppercase tracking-widest text-[#999] group-hover:text-black transition-colors">Phone</span>
                  <span className="text-xs font-bold truncate">+91 7207733216</span>
                </a>
                <a 
                  href="https://instagram.com/abcdcreators" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="group border border-[#E5E5E5] p-5 hover:border-black transition-colors flex flex-col gap-1.5"
                >
                  <span className="text-[10px] uppercase tracking-widest text-[#999] group-hover:text-black transition-colors">Instagram</span>
                  <span className="text-xs font-bold truncate">@abcdcreators</span>
                </a>
              </div>

              {/* UPI QR PAYMENT SECTION */}
              <div className="mt-10 pt-8 border-t border-[#E5E5E5] flex flex-col items-center">
                <div className="bg-[#F9F9F9] border border-[#E5E5E5] p-6 max-w-xs w-full flex flex-col items-center shadow-sm">
                  <span className="text-[10px] uppercase tracking-widest text-[#999] mb-4 font-bold">UPI QR Code</span>
                  <div className="bg-white p-4 border border-[#E5E5E5] relative shadow-inner mb-4">
                    <img 
                      src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi%3A%2F%2Fpay%3Fpa%3D9666832605%40ybl%26pn%3DABCD%2520Creators%26cu%3DINR" 
                      alt="UPI QR Code" 
                      className="w-48 h-48 block"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-xs font-bold text-[#1A1A1A] tracking-wider mb-1 select-all select-text">9666832605@ybl</span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold text-center leading-relaxed">
                    Scan with BHIM, Google Pay, PhonePe, or any UPI app
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t border-[#E5E5E5] py-4 sm:py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-3">
              <BrandLogo size="xs" />
            </div>
            <p className="text-[9px] uppercase tracking-widest text-[#999] mt-1 font-[Verdana]">
              © {new Date().getFullYear()} ABCD CREATORS. ALL RIGHTS RESERVED.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[10px] uppercase tracking-widest font-bold">
            <button 
              onClick={() => {
                navigateState({
                  isSidebarOpen: false,
                  currentFolder: null,
                  isCheckingOut: false,
                  isViewingWishlist: false,
                  isViewingMyOrders: false,
                  isViewingContactUs: false,
                  selectedOrderFolder: null,
                  selectedSheetOrder: null,
                  adminViewingOrder: null
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={cn(
                "transition-colors",
                (!isCheckingOut && !isViewingWishlist && !isViewingMyOrders && !currentFolder) 
                  ? "text-black border-b border-black pb-0.5 font-black" 
                  : "text-[#999] hover:text-black"
              )}
            >
              Home
            </button>
            <button 
              onClick={() => {
                setIsViewingContactUs(true);
              }}
              className={cn(
                "transition-colors",
                isViewingContactUs 
                  ? "text-black border-b border-black pb-0.5 font-black" 
                  : "text-[#999] hover:text-black"
              )}
            >
              Contact Us
            </button>
          </div>
        </div>
      </footer>

      {/* SIDEBAR OVERLAY & DRAWER */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
            onClick={() => navigateState({ isSidebarOpen: false })}
          />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest">
                {sidebarView === 'menu' && 'Menu'}
                {sidebarView === 'edit_profile' && 'Edit Profile'}
                {sidebarView === 'my_orders' && 'My Orders'}
                {sidebarView === 'notifications' && 'Notifications'}
                {sidebarView === 'contact_us' && 'Contact Us'}
              </h2>
              <button 
                onClick={() => {
                  if (sidebarView !== 'menu') {
                    navigateState({ sidebarView: 'menu' });
                  } else {
                    navigateState({ isSidebarOpen: false });
                  }
                }}
                className="p-2 hover:bg-[#F0F0F0] rounded-full transition-colors"
              >
                {sidebarView !== 'menu' ? <ChevronLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {sidebarView === 'menu' && (
                <div className="space-y-4">
                  {clientEmail.trim() !== '' && (
                    <button onClick={() => navigateState({ sidebarView: 'edit_profile' })} className="w-full flex items-center gap-4 p-4 border border-[#E5E5E5] hover:border-black transition-colors text-left">
                      <UserIcon className="w-5 h-5 text-[#999]" />
                      <span className="text-xs uppercase tracking-widest font-bold">Edit Profile</span>
                    </button>
                  )}
                  <button onClick={openMyOrders} className="w-full flex items-center gap-4 p-4 border border-[#E5E5E5] hover:border-black transition-colors text-left">
                    <ShoppingBag className="w-5 h-5 text-[#999]" />
                    <span className="text-xs uppercase tracking-widest font-bold">My Orders</span>
                  </button>
                  <button onClick={() => navigateState({ sidebarView: 'notifications' })} className="w-full flex items-center gap-4 p-4 border border-[#E5E5E5] hover:border-black transition-colors text-left">
                    <Bell className="w-5 h-5 text-[#999]" />
                    <span className="text-xs uppercase tracking-widest font-bold">Notifications</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setIsViewingContactUs(true);
                    }} 
                    className="w-full flex items-center gap-4 p-4 border border-[#E5E5E5] hover:border-[#1A1A1A] transition-colors text-left"
                  >
                    <Phone className="w-5 h-5 text-[#999]" />
                    <span className="text-xs uppercase tracking-widest font-bold">Contact Us</span>
                  </button>
                  {clientEmail.trim() !== '' ? (
                    <button 
                      onClick={() => {
                        window.location.reload();
                      }} 
                      className="w-full flex items-center gap-4 p-4 pt-10 border-none transition-colors text-left text-red-600 hover:text-red-700 font-bold"
                    >
                      <span className="text-xs uppercase tracking-widest font-bold">Sign Out</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setNeedsAuth(true);
                        navigateState({ isSidebarOpen: false });
                      }} 
                      className="w-full flex items-center gap-4 p-4 pt-10 border-none transition-colors text-left text-neutral-600 hover:text-black font-bold"
                    >
                      <span className="text-xs uppercase tracking-widest font-bold">Sign In</span>
                    </button>
                  )}
                </div>
              )}

              {sidebarView === 'edit_profile' && (
                <div className="space-y-6">
                  <div className="border-b border-black pb-2 transition-colors focus-within:border-[#666]">
                    <label className="block text-[10px] text-[#999] uppercase tracking-wider mb-2">Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      className="w-full text-sm font-medium bg-transparent focus:outline-none placeholder-[#CCC]"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="border-b border-black pb-2 transition-colors focus-within:border-[#666]">
                    <label className="block text-[10px] text-[#999] uppercase tracking-wider mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={e => setProfilePhone(e.target.value)}
                      className="w-full text-sm font-medium bg-transparent focus:outline-none placeholder-[#CCC]"
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div className="border-b border-black pb-2 transition-colors focus-within:border-[#666]">
                    <label className="block text-[10px] text-[#999] uppercase tracking-wider mb-2">Email (Optional)</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={e => setProfileEmail(e.target.value)}
                      className="w-full text-sm font-medium bg-transparent focus:outline-none placeholder-[#CCC]"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div className="border-b border-black pb-2 transition-colors focus-within:border-[#666]">
                    <label className="block text-[10px] text-[#999] uppercase tracking-wider mb-2">City (Optional)</label>
                    <input
                      type="text"
                      value={profileCity}
                      onChange={e => setProfileCity(e.target.value)}
                      className="w-full text-sm font-medium bg-transparent focus:outline-none placeholder-[#CCC]"
                      placeholder="Enter your city"
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      setIsSubmitting(true);
                      try {
                        const sheetId = await getOrCreateUsersSheet();
                        const usersData = await fetchAllUsers(sheetId);
                        let targetIndex = userRowIndex;
                        if (targetIndex === null || targetIndex === -1) {
                          targetIndex = usersData.findIndex(row => row[0] === clientEmail.trim().toLowerCase());
                        }
                        if (targetIndex !== -1 && targetIndex !== null) {
                          const userRow = usersData[targetIndex];
                          const updatedRow = [...userRow];
                          updatedRow[5] = profileName.trim();
                          updatedRow[6] = profilePhone.trim();
                          await updateUserRow(sheetId, targetIndex, updatedRow);
                          setCustomerName(profileName.trim());
                          setCustomerPhone(profilePhone.trim());
                          navigateState({ sidebarView: 'menu' });
                        }
                      } catch (err) {
                        console.error('Error saving sidebar profile changes:', err);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-black text-white text-[10px] uppercase tracking-widest font-bold mt-6 hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              )}

              {sidebarView === 'notifications' && (
                <div className="text-center py-20 border border-[#E5E5E5] bg-[#F7F7F7] mt-4">
                  <Bell className="w-8 h-8 text-[#CCC] mx-auto mb-4" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2">No new notifications</h3>
                  <p className="text-[10px] text-[#999]">You're all caught up!</p>
                </div>
              )}

              {sidebarView === 'contact_us' && (
                <div className="space-y-6">
                  <div className="border border-[#E5E5E5] p-6 bg-[#F7F7F7] flex flex-col gap-1 text-center">
                    <span className="text-xs text-black font-semibold uppercase tracking-wider">We do customisation too!</span>
                  </div>
                  <div className="border border-[#E5E5E5] p-6 bg-[#F7F7F7] flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-[#999]">Website</span>
                    <a href="https://abcdcreators.in" target="_blank" rel="noreferrer" className="text-sm font-bold">abcdcreators.in</a>
                  </div>
                  <div className="border border-[#E5E5E5] p-6 bg-[#F7F7F7] flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-[#999]">Phone Number</span>
                    <a href="tel:+917207733216" className="text-sm font-bold">+91 7207733216</a>
                  </div>
                  <div className="border border-[#E5E5E5] p-6 bg-[#F7F7F7] flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-[#999]">Email ID</span>
                    <a href="mailto:abcdcreatorsofficial@abcdcreators.in" className="text-sm font-bold">abcdcreatorsofficial@abcdcreators.in</a>
                  </div>
                  <div className="border border-[#E5E5E5] p-6 bg-[#F7F7F7] flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-[#999]">Instagram</span>
                    <a href="https://instagram.com/abcdcreators" target="_blank" rel="noreferrer" className="text-sm font-bold">@abcdcreators</a>
                  </div>
                  <div className="border border-[#E5E5E5] p-6 bg-[#F7F7F7] flex flex-col items-center text-center">
                    <span className="text-[10px] uppercase tracking-widest text-[#999] mb-3 font-bold">Scan to Pay (UPI)</span>
                    <div className="bg-white p-3 border border-[#E5E5E5] mb-3 shadow-inner">
                      <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&amp;data=upi%3A%2F%2Fpay%3Fpa%3D9666832605%40ybl%26pn%3DABCD%2520Creators%26cu%3DINR" 
                        alt="UPI QR Code" 
                        className="w-36 h-36 block"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-xs font-bold text-[#1A1A1A] mb-1 select-all select-text">9666832605@ybl</span>
                    <span className="text-[8px] uppercase tracking-wider text-gray-500 font-semibold leading-normal">
                      Works with GPay, PhonePe, Paytm & more
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POSTER PREVIEW MODAL */}
      {previewingPoster && (() => {
        const poster = previewingPoster;
        const isSelected = isInCart(poster);
        const isWishlisted = wishlistedPosters.some(p => p.id === poster.id);
        const previewMode = previewModes[poster.id] || 'portrait';
        
        const activeList = isViewingWishlist ? wishlistedPosters : posters;
        const idx = activeList.findIndex(p => p.id === poster.id);
        const prevPoster = idx > 0 ? activeList[idx - 1] : null;
        const nextPoster = idx !== -1 && idx < activeList.length - 1 ? activeList[idx + 1] : null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div 
              className="absolute inset-0 cursor-default"
              onClick={() => setPreviewingPoster(null)}
            />
            <div className="relative w-full max-w-5xl bg-white shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[80vh] overflow-hidden z-10 animate-in zoom-in-95 duration-300">
              {/* Close Button positioned at the top-right corner of the entire preview modal */}
              <button
                onClick={() => setPreviewingPoster(null)}
                className="absolute top-4 right-4 z-40 p-1.5 bg-white/85 backdrop-blur-sm lg:hover:bg-white text-black hover:text-red-500 rounded-full shadow-md transition-all border border-gray-200 cursor-pointer"
                title="Close Preview (Esc)"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Left/Top: Image Preview Panel */}
              <div 
                className="flex-1 bg-[#F9F9F9] flex items-center justify-center relative p-6 md:p-12 border-b md:border-b-0 md:border-r border-[#E5E5E5] h-[55%] md:h-full min-h-[300px]"
                onTouchStart={(e) => {
                  (window as any).__touchStartX = e.touches[0].clientX;
                }}
                onTouchEnd={(e) => {
                  if ((window as any).__touchStartX === undefined || (window as any).__touchStartX === null) return;
                  const touchEndX = e.changedTouches[0].clientX;
                  const diffX = (window as any).__touchStartX - touchEndX;
                  if (diffX > 50 && nextPoster) {
                    setPreviewingPoster(nextPoster);
                  } else if (diffX < -50 && prevPoster) {
                    setPreviewingPoster(prevPoster);
                  }
                  (window as any).__touchStartX = null;
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
                <div className="w-full h-full flex items-center justify-center p-4 sm:p-6 md:p-8">
                  <img
                    src={poster.thumbnailLink?.replace('=s220', '=s800')}
                    alt={formatPosterName(poster.name)}
                    className="max-w-full max-h-full object-contain shadow-2xl bg-white rounded-[2px] transition-all duration-500 ease-in-out"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Badge of Layout format or Preview mode toggle */}
                <button
                  onClick={() => handlePreviewModeChange(poster.id, previewMode === 'landscape' ? 'portrait' : 'landscape')}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black text-white text-[9px] uppercase tracking-widest font-bold shadow-md hover:bg-[#333] transition-colors flex items-center gap-1.5"
                >
                  Layout: {previewMode}
                </button>
              </div>

              {/* Right/Bottom: Info and Selection Panel */}
              <div className="w-full md:w-[380px] p-6 sm:p-8 flex flex-col justify-between h-[45%] md:h-full overflow-y-auto bg-white">
                <div>
                  <div className="flex justify-between items-start mb-4 md:pr-8">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-[#999] font-bold">
                      {currentFolder ? formatFolderDisplayName(currentFolder.name) : (poster.categoryHint === 'Stickers' ? "Category Sticker" : "Category Poster")}
                    </span>
                  </div>

                  <h2 className="text-base sm:text-xl font-bold uppercase tracking-wider text-black mb-2 line-clamp-2">
                    {formatPosterName(poster.name)}
                  </h2>
                  <p className="text-sm font-bold text-black mb-4">₹40</p>
                  
                  {poster.description && (
                    <p className="text-[11px] sm:text-xs text-[#666] uppercase tracking-wider mb-6 font-[inherit]">
                      <span className="font-bold text-black">{poster.description}</span>
                    </p>
                  )}

                  <div className={cn("space-y-6", poster.categoryHint === 'Stickers' ? "mt-6" : "")}>
                    {/* Sizing Option */}
                    {poster.categoryHint !== 'Stickers' && (
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold text-[#999] mb-2">
                          Select Sizing
                        </label>
                        <select
                          value={posterSizes[poster.id] || ''}
                          onChange={(e) => handleSizeChange(poster.id, e.target.value)}
                          className="w-full border border-[#E5E5E5] text-[11px] uppercase p-3 font-bold text-black focus:outline-none focus:border-black bg-white appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width=%2212%22%20height=%2212%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath%20d=%22M3%204.5l3%203%203-3%22%20stroke=%22%23999%22%20stroke-width=%221.5%22%20fill=%22none%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_16px_center]"
                        >
                          <option value="" disabled>Select Size</option>
                          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    )}
                                    {/* Quantity Selector */}
                    <div>
                      <label className="block text-[9px] uppercase tracking-widest font-bold text-[#999] mb-2">
                        Select Quantity {poster.categoryHint === 'Stickers' && '(Min 4, Multiples of 4)'}
                      </label>
                      <div className={cn("flex items-center border border-[#E5E5E5] h-[44px] bg-white w-full max-w-[150px]", !hasChosenSize(poster) && "opacity-40 pointer-events-none")}>
                        <button
                          className="w-12 h-full flex items-center justify-center text-[#999] hover:text-black hover:bg-[#F7F7F7] transition-colors border-r border-[#E5E5E5] font-bold"
                          disabled={!hasChosenSize(poster)}
                          onClick={() => {
                            if (!hasChosenSize(poster)) return;
                            const isSticker = poster.categoryHint === 'Stickers';
                            const currentQty = isSelected ? lineQuantity(poster) : (isSticker ? 4 : 1);

                            let safeVal = 0;
                            if (isSticker) {
                              if (currentQty <= 4) {
                                safeVal = isSelected ? 0 : 8;
                              } else {
                                safeVal = currentQty - 4;
                              }
                            } else {
                              safeVal = Math.max(isSelected ? 0 : 1, currentQty - 1);
                            }
                            upsertLine(poster, effectiveSize(poster), safeVal);
                          }}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={isSelected ? "0" : (poster.categoryHint === 'Stickers' ? "4" : "1")}
                          max="100"
                          disabled={!hasChosenSize(poster)}
                          value={isSelected ? lineQuantity(poster) : (poster.categoryHint === 'Stickers' ? 4 : 1)}
                          onChange={(e) => {
                            if (!hasChosenSize(poster)) return;
                            const val = parseInt(e.target.value);
                            const isSticker = poster.categoryHint === 'Stickers';

                            if (!isNaN(val)) {
                              let safeVal = Math.max(isSelected ? 0 : (isSticker ? 4 : 1), val);
                              if (isSticker && safeVal > 0) {
                                if (safeVal < 4) safeVal = 4;
                                else if (safeVal % 4 !== 0) safeVal = safeVal + (4 - (safeVal % 4));
                              } else if (!isSticker) {
                                safeVal = Math.min(100, safeVal);
                              }

                              upsertLine(poster, effectiveSize(poster), safeVal);
                            }
                          }}
                          className="flex-1 w-0 h-full text-center text-xs font-bold text-black focus:outline-none focus:bg-[#F7F7F7] bg-transparent pb-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-0"
                        />
                        <button
                          className="w-12 h-full flex items-center justify-center text-[#999] hover:text-black hover:bg-[#F7F7F7] transition-colors border-l border-[#E5E5E5] font-bold"
                          disabled={!hasChosenSize(poster)}
                          onClick={() => {
                            if (!hasChosenSize(poster)) return;
                            const isSticker = poster.categoryHint === 'Stickers';
                            const currentQty = isSelected ? lineQuantity(poster) : (isSticker ? 4 : 1);

                            let newQty;
                            if (isSticker) {
                              newQty = currentQty === 0 ? 4 : currentQty + 4;
                            } else {
                              newQty = Math.min(100, currentQty + 1);
                            }

                            upsertLine(poster, effectiveSize(poster), newQty);
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="mt-8 pt-6 border-t border-[#E5E5E5]">
                  <div className="flex gap-3 flex-col sm:flex-row">
                    <button
                      disabled={!isSelected && !hasChosenSize(poster)}
                      onClick={() => {
                        if (!isSelected) {
                          toggleCartLine(poster);
                        }
                        setPreviewingPoster(null);
                      }}
                      className="flex-1 py-4 text-[10px] uppercase tracking-[0.2em] font-bold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-black text-white hover:bg-[#333] mb-0 mt-0"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {hasChosenSize(poster) ? "Add to Cart" : "Select a size first"}
                    </button>
                    <button
                      onClick={(e) => toggleWishlist(poster, e)}
                      className={cn(
                        "flex-1 py-4 text-[10px] uppercase tracking-[0.2em] font-bold transition-all duration-300 flex items-center justify-center gap-2",
                        isWishlisted 
                           ? "bg-white border border-black text-black hover:bg-gray-50 mb-0 mt-0" 
                           : "bg-black text-white hover:bg-[#333] mb-0 mt-0"
                      )}
                    >
                      <Heart className={cn("w-4 h-4 transition-transform active:scale-125", isWishlisted ? "fill-red-500 text-red-500" : "text-current")} />
                      {isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                    </button>
                  </div>
                  <p className="text-[9px] uppercase tracking-widest text-[#999] text-center mt-4">
                    High quality print with rich detail preservation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
