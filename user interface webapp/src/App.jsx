import React, { useState, useRef } from 'react';
import { 
  Bluetooth, Map, ShoppingCart, Apple, Milk, Coffee, Pizza, 
  ChevronLeft, Navigation, XCircle, CheckCircle2, AlertCircle, Search, X 
} from 'lucide-react';

// ============================================================================
// 1. DATA & CONFIGURATION
// ============================================================================
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

const SECTIONS = [
  { id: 'produce', name: 'Fresh Produce', color: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-800', icon: Apple, 
    position: { top: '88%', left: '35%', width: '60%', height: '12%' } }, 
  { id: 'dairy', name: 'Dairy & Chilled', color: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800', icon: Milk, 
    position: { top: '40%', left: '85%', width: '12%', height: '47%' } }, 
  { id: 'pantry', name: 'Pantry & Snacks', color: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-800', icon: Pizza, 
    position: { top: '2%', left: '13%', width: '68%', height: '80%' } }, 
  { id: 'beverage', name: 'Beverages', color: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-800', icon: Coffee, 
    position: { top: '2%', left: '85%', width: '12%', height: '37%' } }, 
  { id: 'essentials', name: 'Essentials', color: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800', icon: ShoppingCart, 
    position: { top: '2%', left: '1%', width: '10%', height: '82%' } }
];

const ITEMS = [
  { id: 1, name: 'Dole Premium Bananas', section: 'produce', x: 2, y: 0, inStock: true, tags: ['fruit', 'yellow', 'banana'] },
  { id: 2, name: 'Zespri SunGold Kiwis', section: 'produce', x: 2, y: 0, inStock: true, tags: ['fruit', 'green', 'kiwi'] },
  { id: 3, name: 'Driscoll\'s Strawberries', section: 'produce', x: 2, y: 0, inStock: false, tags: ['fruit', 'berry', 'red', 'strawberry'] },
  { id: 4, name: 'Chiquita Hass Avocados', section: 'produce', x: 3, y: 0, inStock: true, tags: ['fruit', 'green', 'guacamole', 'avocado'] },
  { id: 5, name: 'Fresh Express Baby Spinach', section: 'produce', x: 3, y: 0, inStock: true, tags: ['vegetable', 'salad', 'greens', 'leaf', 'spinach'] },
  { id: 6, name: 'Washington Gala Apples', section: 'produce', x: 3, y: 0, inStock: true, tags: ['fruit', 'red', 'crisp', 'apple'] },
  { id: 7, name: 'Meiji Fresh Milk 2L', section: 'dairy', x: 3, y: 1, inStock: true, tags: ['dairy', 'drink', 'cow', 'milk'] },
  { id: 8, name: 'Kraft Singles Cheese', section: 'dairy', x: 3, y: 2, inStock: true, tags: ['dairy', 'slice', 'sandwich', 'cheese'] },
  { id: 9, name: 'Chobani Greek Yogurt', section: 'dairy', x: 3, y: 3, inStock: false, tags: ['dairy', 'snack', 'healthy', 'yogurt'] },
  { id: 10, name: 'Lurpak Slightly Salted Butter', section: 'dairy', x: 3, y: 4, inStock: true, tags: ['dairy', 'spread', 'baking', 'butter'] },
  { id: 11, name: 'Philadelphia Cream Cheese', section: 'dairy', x: 3, y: 5, inStock: true, tags: ['dairy', 'spread', 'bagel', 'cheese'] },
  { id: 12, name: 'Yakult Probiotic Drink', section: 'dairy', x: 3, y: 6, inStock: false, tags: ['dairy', 'drink', 'probiotic', 'health'] },
  { id: 13, name: 'Lay\'s Classic Potato Chips', section: 'pantry', x: 1, y: 9, inStock: true, tags: ['snack', 'crisps', 'salty', 'chips'] },
  { id: 14, name: 'Nutella Hazelnut Spread', section: 'pantry', x: 2, y: 1, inStock: true, tags: ['spread', 'chocolate', 'sweet', 'hazelnut'] },
  { id: 15, name: 'Kellogg\'s Corn Flakes', section: 'pantry', x: 1, y: 4, inStock: true, tags: ['cereal', 'breakfast', 'morning', 'cornflakes'] },
  { id: 16, name: 'Heinz Tomato Ketchup', section: 'pantry', x: 2, y: 12, inStock: false, tags: ['sauce', 'condiment', 'tomato', 'ketchup'] },
  { id: 17, name: 'Barilla Spaghetti No. 5', section: 'pantry', x: 1, y: 5, inStock: true, tags: ['pasta', 'noodles', 'italian', 'spaghetti'] },
  { id: 18, name: 'Oreo Chocolate Cookies', section: 'pantry', x: 2, y: 8, inStock: true, tags: ['snack', 'sweet', 'biscuit', 'dessert', 'cookies'] },
  { id: 19, name: 'Coca-Cola Classic 1.5L', section: 'beverage', x: 3, y: 7, inStock: true, tags: ['coke', 'soda', 'pop', 'drink', 'cola'] },
  { id: 20, name: 'Evian Natural Mineral Water', section: 'beverage', x: 3, y: 9, inStock: true, tags: ['water', 'drink', 'hydration'] },
  { id: 21, name: 'Red Bull Energy Drink', section: 'beverage', x: 3, y: 10, inStock: false, tags: ['energy', 'drink', 'caffeine'] },
  { id: 22, name: 'Tropicana Orange Juice', section: 'beverage', x: 3, y: 11, inStock: true, tags: ['oj', 'juice', 'drink', 'breakfast', 'orange'] },
  { id: 23, name: 'Nescafe Gold Blend Coffee', section: 'beverage', x: 3, y: 13, inStock: true, tags: ['coffee', 'caffeine', 'drink', 'hot'] },
  { id: 24, name: 'Premium Toilet Paper 10pk', section: 'essentials', x: 0, y: 11, inStock: true, tags: ['bathroom', 'hygiene', 'paper', 'soft'] },
  { id: 25, name: 'Oral-B Toothbrush', section: 'essentials', x: 0, y: 10, inStock: true, tags: ['dental', 'teeth', 'hygiene', 'brush'] },
  { id: 26, name: 'Kleenex Tissue Box', section: 'essentials', x: 0, y: 9, inStock: true, tags: ['paper', 'nose', 'soft', 'hygiene', 'tissue'] },
  { id: 27, name: 'Pilot G2 Black Pen', section: 'essentials', x: 0, y: 8, inStock: true, tags: ['stationery', 'writing', 'office', 'school', 'pen'] },
  { id: 28, name: 'Pantene Shampoo 400ml', section: 'essentials', x: 0, y: 7, inStock: true, tags: ['hair', 'shower', 'bath', 'wash', 'soap'] },
  { id: 29, name: 'Dove Beauty Soap Bar', section: 'essentials', x: 0, y: 6, inStock: true, tags: ['body', 'wash', 'shower', 'bath', 'hygiene', 'soap'] },
  { id: 30, name: 'Colgate Total Toothpaste', section: 'essentials', x: 0, y: 5, inStock: true, tags: ['dental', 'teeth', 'hygiene', 'paste'] }
];

export default function App() {
  const [bleDevice, setBleDevice] = useState(null);
  const [bleCharacteristic, setBleCharacteristic] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const [activeSection, setActiveSection] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const connectBluetooth = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'SupermarketRobot' }, { name: 'Kart-E' }],
        optionalServices: [SERVICE_UUID]
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      setBleDevice(device);
      setBleCharacteristic(characteristic);
      setIsConnected(true);
      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setBleDevice(null);
        setBleCharacteristic(null);
      });
    } catch (error) {
      console.error(error);
      showToast("Bluetooth Connection Failed.");
    }
  };

  const navigateToItem = async () => {
    if (!isConnected || !bleCharacteristic || !selectedItem) {
      showToast("Please connect to Kart-E first before navigating!");
      return;
    }
    try {
      const command = `${selectedItem.x},${selectedItem.y}`;
      const encoder = new TextEncoder();
      await bleCharacteristic.writeValue(encoder.encode(command));
      setIsNavigating(true);
      setSelectedItem(null); 
      setSearchQuery(''); 
      setIsSearchFocused(false);
      setTimeout(() => setIsNavigating(false), 30000);
    } catch (error) {
      console.error(error);
    }
  };

  const stopRobot = async () => {
    if (isConnected && bleCharacteristic) {
      try {
        const encoder = new TextEncoder();
        await bleCharacteristic.writeValue(encoder.encode("stop"));
      } catch (error) {
        console.error(error);
      }
    }
    setIsNavigating(false);
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    setTimeout(() => {
      searchContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };
  
  const renderDashboard = () => {
    const searchResults = searchQuery.trim() === '' ? [] : ITEMS.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(q);
      const matchTag = item.tags && item.tags.some(tag => tag.toLowerCase().includes(q));
      return matchName || matchTag;
    });

    return (
      <div className={`flex flex-col items-center animate-in fade-in zoom-in duration-300 w-full transition-all ${isSearchFocused ? 'pb-[40vh]' : 'pb-4'}`}>
        
        {/* 1. STORE BLUEPRINT */}
        <div className="w-full flex flex-col items-center mb-6">
          <h2 className="text-lg font-black text-slate-800 mb-1 flex items-center gap-2 uppercase tracking-tight">
            <Map className="w-5 h-5 text-indigo-600" />
            Store Blueprint
          </h2>
          <p className="text-xs font-medium text-slate-400 mb-4 italic text-center">Tap a zone to browse section items</p>
          
          <div className="relative w-full max-w-[400px] aspect-[4/5] bg-slate-200 border-4 border-slate-800 rounded-3xl shadow-xl overflow-hidden mx-auto group">
            <img 
              src="/floorplan.jpg" 
              alt="Floorplan" 
              className="absolute inset-0 w-full h-full object-cover opacity-95"
              onError={(e) => {
                e.target.onerror = null; 
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500'%3E%3Crect width='100%25' height='100%25' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' font-family='sans-serif' fill='%2394a3b8'%3Efloorplan.jpg missing%3C/text%3E%3C/svg%3E";
              }}
            />

            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className="absolute flex items-center justify-center transition-all focus:outline-none z-10"
                  style={sec.position}
                >
                  <div className={`p-2 rounded-xl bg-white/95 shadow-lg border-2 ${sec.border} scale-90 active:scale-110 transition-transform`}>
                    <Icon className={`w-6 h-6 ${sec.text}`} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. SEARCH BAR (NOW COMPACT) */}
        <div 
          ref={searchContainerRef} 
          className="w-full max-w-md mx-auto scroll-mt-24 mb-4"
        >
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchQuery}
              onFocus={handleSearchFocus}
              onBlur={() => {
                // Short delay to allow clicking a result before focusing out
                setTimeout(() => {
                  if (!searchQuery) setIsSearchFocused(false);
                }, 150);
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 text-slate-800 pl-11 pr-11 py-4 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm font-semibold text-base"
            />
            {searchQuery && (
              <button 
                onClick={() => {setSearchQuery(''); setIsSearchFocused(false);}}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {searchQuery && (
            <div className="mt-3 flex flex-col gap-2 max-h-[45vh] overflow-y-auto pr-1 animate-in slide-in-from-top-2 duration-200 pb-4">
              {searchResults.length === 0 ? (
                <div className="text-center p-6 text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm italic font-medium">
                  No items found for "{searchQuery}"
                </div>
              ) : (
                searchResults.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => item.inStock && setSelectedItem(item)}
                    className={`p-4 rounded-2xl border-2 flex flex-row items-center justify-between transition-all text-left ${
                      item.inStock 
                        ? 'bg-white border-slate-100 hover:border-indigo-400 hover:shadow-md active:scale-[0.98]' 
                        : 'bg-slate-50 border-transparent opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <span className={`font-bold block ${item.inStock ? 'text-slate-800' : 'text-slate-400'}`}>
                        {item.name}
                      </span>
                      <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                        {SECTIONS.find(s => s.id === item.section)?.name}
                      </span>
                    </div>
                    {item.inStock ? (
                      <div className="flex items-center gap-1 text-emerald-600 text-xs font-black bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100">
                        GO
                      </div>
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-200" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSectionItems = () => {
    const section = SECTIONS.find(s => s.id === activeSection);
    const items = ITEMS.filter(i => i.section === activeSection);
    return (
      <div className="animate-in slide-in-from-right duration-300 w-full max-w-xl mx-auto">
        <button onClick={() => setActiveSection(null)} className="flex items-center gap-2 text-indigo-600 font-bold mb-6 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
          <ChevronLeft className="w-5 h-5" /> Back to Map
        </button>
        <div className={`flex items-center gap-4 p-5 rounded-3xl border-2 mb-6 ${section.color} border-slate-200 shadow-sm`}>
          <div className="p-3 bg-white rounded-2xl shadow-sm">
             <section.icon className={`w-8 h-8 ${section.text}`} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">{section.name}</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aisle Navigation</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {items.map(item => (
            <button key={item.id} onClick={() => item.inStock && setSelectedItem(item)} className={`p-5 rounded-2xl border-2 flex flex-row items-center justify-between transition-all text-left ${item.inStock ? 'bg-white border-slate-100 hover:border-indigo-400 active:scale-[0.98]' : 'bg-slate-50 opacity-50 cursor-not-allowed'}`}>
              <h3 className={`text-lg font-bold ${item.inStock ? 'text-slate-800' : 'text-slate-400'}`}>{item.name}</h3>
              {item.inStock ? <div className="text-emerald-700 text-sm font-black bg-emerald-100 px-3 py-1.5 rounded-xl uppercase">Start</div> : <span className="text-xs font-black text-slate-300 uppercase">Out</span>}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative overflow-x-hidden">
      
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300 w-[92%] max-w-xs pointer-events-none">
          <div className="bg-red-500 text-white px-5 py-4 rounded-3xl shadow-2xl font-bold flex items-center gap-3 border-2 border-white/20">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <span className="text-sm leading-tight">{toastMessage}</span>
          </div>
        </div>
      )}

      <header className="bg-[#1e1b4b] text-white p-4 shadow-xl sticky top-0 z-40 border-b border-indigo-500/20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 text-white p-2.5 rounded-2xl shadow-inner border border-white/10">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter">KART-E</h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.15em]">{isConnected ? 'System Live' : 'Offline'}</p>
              </div>
            </div>
          </div>
          <button onClick={connectBluetooth} className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 ${isConnected ? 'bg-emerald-500 text-white shadow-emerald-500/20 border-b-4 border-emerald-700' : 'bg-white text-indigo-900 border-b-4 border-slate-300'}`}>
            <Bluetooth className="w-4 h-4" /> {isConnected ? 'Linked' : 'Pair'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-5">
        {isNavigating && (
          <div className="mb-6 bg-indigo-600 text-white p-5 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-5 animate-in slide-in-from-top-8 duration-500 border border-white/10">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="p-3 bg-white/10 rounded-2xl animate-spin-slow shrink-0 border border-white/20">
                <Navigation className="w-7 h-7" />
              </div>
              <div>
                <p className="font-black text-xl tracking-tight leading-none mb-1">On our way!</p>
                <p className="text-xs font-medium text-indigo-200">Stick with me — we'll be there in no time!</p>
              </div>
            </div>
            <button onClick={stopRobot} className="w-full sm:w-auto px-8 py-4 bg-red-500 hover:bg-red-400 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 border-b-4 border-red-700">
              <XCircle className="w-5 h-5" /> STOP HERE
            </button>
          </div>
        )}
        {!activeSection ? renderDashboard() : renderSectionItems()}
      </main>

      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full overflow-hidden animate-in slide-in-from-bottom-20 duration-300 border border-slate-100">
            <div className="bg-indigo-600 p-8 text-white text-center relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Navigation className="w-32 h-32 -rotate-12 translate-x-8 -translate-y-8" />
              </div>
              <h3 className="text-3xl font-black tracking-tighter leading-none mb-2">Ready to Go?</h3>
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Navigation Request</p>
            </div>
            <div className="p-10 text-center">
              <p className="text-slate-400 font-bold text-xs uppercase mb-1">Destination:</p>
              <p className="text-2xl font-black text-slate-800 mb-10 leading-tight">{selectedItem.name}</p>
              <div className="flex flex-col gap-4">
                <button onClick={navigateToItem} className="w-full py-5 px-4 rounded-[1.25rem] font-black text-white bg-indigo-600 shadow-2xl shadow-indigo-600/30 transition-all active:scale-95 border-b-4 border-indigo-800">
                  START NAVIGATION
                </button>
                <button onClick={() => setSelectedItem(null)} className="w-full py-5 px-4 rounded-[1.25rem] font-black text-slate-400 bg-slate-100 hover:bg-slate-200 transition-colors uppercase text-xs tracking-widest">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}