import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import VegetableMap from '../components/VegetableMap';
import { Search, MapPin, TrendingDown, Loader2, Sparkles, IndianRupee, ChevronDown, Star, ShoppingCart, X, Plus, Truck } from 'lucide-react';

interface Recommendation { vegetable: string; district: string; lat: number; lon: number; avg_price: number; predicted_price: number; }
interface SearchResult { vegetable: string; district: string; lat: number; lon: number; avg_price: number; type?: any; farmer_name?: string; mobile?: string; whatsapp?: string; quantity?: number; }
interface CartItem extends SearchResult { cart_quantity: number; }

const VEG_EMOJIS: Record<string, string> = {
  Tomato: '🍅', Onion: '🧅', Carrot: '🥕', Brinjal: '🍆', Capsicum: '🫑',
  Cucumber: '🥒', Cabbage: '🥬', Potato: '🥔', Corn: '🌽', Spinach: '🌿',
  Cauliflower: '🥦', Peas: '🫛', Beans: '🫘', Radish: '🔴', Ginger: '🪤',
};
const getEmoji = (name: string) => {
  const key = Object.keys(VEG_EMOJIS).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return key ? VEG_EMOJIS[key] : '🥗';
};

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDistrict, setSearchDistrict] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [districts, setDistricts] = useState<{ district: string }[]>([]);
  const [vegetables, setVegetables] = useState<string[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [predVeg, setPredVeg] = useState('');
  const [predDistrict, setPredDistrict] = useState('');
  const [predPrice, setPredPrice] = useState<number | null>(null);
  const [predLoading, setPredLoading] = useState(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const cartTotalPrice = useMemo(() => cart.reduce((acc, item) => acc + (item.avg_price * item.cart_quantity), 0), [cart]);

  const addToCart = (item: SearchResult) => {
      setCart(prev => {
          const existing = prev.findIndex(c => c.vegetable === item.vegetable && c.district === item.district);
          if (existing >= 0) {
              const cp = [...prev];
              cp[existing].cart_quantity += 1;
              return cp;
          }
          return [...prev, { ...item, cart_quantity: 1 }];
      });
      setIsCartOpen(true);
  };

  const updateCartQuantity = (idx: number, delta: number) => {
      setCart(prev => {
          const cp = [...prev];
          const newQ = cp[idx].cart_quantity + delta;
          if (newQ > 0) cp[idx].cart_quantity = newQ;
          return cp;
      });
  };

  const removeFromCart = (idx: number) => {
      setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCheckout = () => {
      setIsCheckingOut(true);
      setTimeout(() => {
          alert('Order successfully placed! Track it from your dashboard.');
          setCart([]);
          setIsCartOpen(false);
          setDeliveryAddress('');
          setIsCheckingOut(false);
      }, 1500);
  };

  const handlePredict = async () => {

    if (!predVeg || !predDistrict) return;
    setPredLoading(true);
    setPredPrice(null);
    try {
      const now = new Date();
      const res = await api.get(`/predict-price?vegetable=${predVeg}&district=${predDistrict}&month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      if (res.data.success) setPredPrice(res.data.predicted_price);
    } catch (err) { console.error(err); }
    finally { setPredLoading(false); }
  };

  const userLocation = localStorage.getItem('userLocation') || 'Guntur';

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await api.get(`/recommendations?district=${userLocation}`);
        if (res.data.success) setRecommendations(res.data.recommendations);
      } catch (err) { console.error(err); }
      finally { setLoadingRecs(false); }
    };
    const fetchInitialMapData = async () => {
      try {
        const [res, distRes] = await Promise.all([api.get('/vegetables'), api.get('/districts')]);
        if (res.data.success) setSearchResults(res.data.results);
        if (distRes.data.success) setDistricts(distRes.data.districts);
        const vegRes = await api.get('/vegetables-list');
        if (vegRes.data.success) setVegetables(vegRes.data.vegetables);
      } catch (err) { console.error(err); }
    };
    fetchRecommendations();
    fetchInitialMapData();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await api.get(`/vegetables?name=${searchQuery}&district=${searchDistrict}`);
        if (res.data.success) setSearchResults(res.data.results);
      } catch (err) { console.error(err); }
      finally { setLoadingSearch(false); }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchDistrict]);

  // ── Background Auto-Sync ────────────────────────────────────
  useEffect(() => {
     const syncInterval = setInterval(async () => {
        try {
           const res = await api.get(`/vegetables?name=${searchQuery}&district=${searchDistrict}`);
           if (res.data.success) {
               // Only update if there's actually a difference, to prevent unnecessary map re-renders
               setSearchResults(prev => JSON.stringify(prev) !== JSON.stringify(res.data.results) ? res.data.results : prev);
           }
        } catch (e) { console.error('Silent sync failed', e); }
     }, 3000); // 3-second live heartbeat

     return () => clearInterval(syncInterval);
  }, [searchQuery, searchDistrict]);

  const selectStyle = {
    background: 'rgba(10,15,30,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
    borderRadius: '12px',
    padding: '12px 16px',
    width: '100%',
    outline: 'none',
    appearance: 'none' as const,
    fontFamily: 'inherit',
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in relative">
      {/* ── Floating Cart Button ────────────────────────────── */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="fixed z-40 bottom-6 right-28 p-4 rounded-full btn-neon flex items-center justify-center shadow-2xl transition-transform hover:scale-110"
        style={{ background: 'linear-gradient(135deg, #16a34a, #059669)', border: '1px solid #4ade80' }}
      >
        <ShoppingCart className="w-6 h-6 text-white" />
        {cart.length > 0 && (
           <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-[#0a0f1e]">
             {cart.length}
           </span>
        )}
      </button>

      {/* ── Cart Sidebar Panel ────────────────────────────── */}
      {isCartOpen && (
         <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
            <div className="relative w-full max-w-md h-full bg-[#0f172a] border-l border-green-500/20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] flex flex-col animate-slide-in-right">
               <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#1e293b]">
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                     <ShoppingCart className="w-6 h-6 text-green-400" />
                     Your Cart
                  </h2>
                  <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                     <X className="w-6 h-6" />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {cart.length === 0 ? (
                     <div className="text-center py-20 text-slate-500">
                        <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Your cart is empty.</p>
                     </div>
                  ) : (
                     cart.map((item, i) => (
                        <div key={i} className="flex gap-4 p-4 rounded-2xl bg-[#1e293b] border border-white/5 relative group">
                           <div className="text-3xl bg-slate-800 p-2 rounded-xl border border-white/5">{getEmoji(item.vegetable)}</div>
                           <div className="flex-1">
                              <h4 className="font-bold text-white mb-1">{item.vegetable}</h4>
                              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1"><MapPin className="w-3 h-3"/> {item.district}</p>
                              <div className="flex items-center justify-between">
                                 <span className="text-green-400 font-bold text-sm">₹{item.avg_price}/kg</span>
                                 <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-1 border border-white/5">
                                    <button onClick={() => updateCartQuantity(i, -1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white">-</button>
                                    <span className="text-xs font-bold w-4 text-center">{item.cart_quantity}</span>
                                    <button onClick={() => updateCartQuantity(i, 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white">+</button>
                                 </div>
                              </div>
                           </div>
                           <button onClick={() => removeFromCart(i)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-4 h-4"/>
                           </button>
                        </div>
                     ))
                  )}
               </div>

               {cart.length > 0 && (
                  <div className="p-6 bg-[#1e293b] border-t border-white/10">
                     <div className="mb-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Delivery Address</label>
                        <textarea
                           value={deliveryAddress}
                           onChange={e => setDeliveryAddress(e.target.value)}
                           className="w-full bg-[#0f172a] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-green-500/50 outline-none resize-none"
                           rows={3}
                           placeholder="Enter your exact delivery location..."
                        />
                     </div>
                     <div className="flex justify-between items-center mb-6">
                        <span className="text-slate-400 font-medium">Total Estimable Cost</span>
                        <span className="text-2xl font-black text-white tracking-tight">₹{cartTotalPrice.toLocaleString('en-IN')}</span>
                     </div>
                     <button
                        onClick={handleCheckout}
                        disabled={!deliveryAddress.trim() || isCheckingOut}
                        className="w-full py-4 rounded-xl font-black text-white btn-neon ripple-effect disabled:opacity-50 flex shadow-[0_0_20px_rgba(34,197,94,0.3)] justify-center items-center gap-2"
                     >
                        {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin"/> : <Truck className="w-5 h-5"/>}
                        {isCheckingOut ? 'Processing...' : 'Place Order for Delivery'}
                     </button>
                  </div>
               )}
            </div>
         </div>
      )}

      {/* ── AI Price Predictor Banner ──────────────────────── */}
      <div
        className="relative overflow-hidden rounded-3xl p-8 shimmer-line"
        style={{
          background: 'linear-gradient(135deg, rgba(22,163,74,0.25) 0%, rgba(5,150,105,0.2) 40%, rgba(37,99,235,0.15) 100%)',
          border: '1px solid rgba(34,197,94,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 60px rgba(34,197,94,0.05)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Decorative orb */}
        <div className="absolute -top-10 -right-10 w-48 h-48 orb orb-green animate-float-slow" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 orb orb-blue animate-float" style={{ animationDelay: '1s', opacity: 0.15 }} />

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="p-2 rounded-xl animate-glow"
              style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              <Sparkles className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-white font-black text-xl">AI Price Predictor</h2>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              Live ML Model
            </span>
          </div>
          <p className="text-sm mb-6" style={{ color: 'rgba(148,163,184,0.8)' }}>
            Get real-time price estimates from our Random Forest ML model for today's market.
          </p>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'rgba(134,239,172,0.7)' }}>Vegetable</label>
              <div className="relative">
                <select value={predVeg} onChange={e => setPredVeg(e.target.value)} style={selectStyle}>
                  <option value="" style={{ background: '#0a0f1e' }}>Select vegetable...</option>
                  {vegetables.map(v => <option key={v} value={v} style={{ background: '#0a0f1e' }}>{v}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(134,239,172,0.6)' }} />
              </div>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'rgba(134,239,172,0.7)' }}>District</label>
              <div className="relative">
                <select value={predDistrict} onChange={e => setPredDistrict(e.target.value)} style={selectStyle}>
                  <option value="" style={{ background: '#0a0f1e' }}>Select district...</option>
                  {districts.map(d => <option key={d.district} value={d.district} style={{ background: '#0a0f1e' }}>{d.district}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(134,239,172,0.6)' }} />
              </div>
            </div>
            <button
              onClick={handlePredict}
              disabled={!predVeg || !predDistrict || predLoading}
              className="px-8 py-3 rounded-xl font-black text-white btn-neon ripple-effect disabled:opacity-50 flex items-center gap-2"
            >
              {predLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Predict Price
            </button>

            {predPrice !== null && !predLoading && (
              <div
                className="flex items-center gap-2 rounded-xl px-5 py-3 animate-scale-in"
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.4)',
                  boxShadow: '0 0 30px rgba(34,197,94,0.2)',
                }}
              >
                <IndianRupee className="w-5 h-5 text-yellow-400" style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.8))' }} />
                <span className="text-3xl font-black text-white">{predPrice}</span>
                <span className="text-sm font-medium" style={{ color: 'rgba(134,239,172,0.7)' }}>/kg</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Search & Map ──────────────────────────────────── */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Search Panel */}
        <div className="lg:col-span-1 space-y-4 animate-slide-in-left delay-100">
          <div
            className="p-5 rounded-2xl flex flex-col h-[600px]"
            style={{
              background: 'rgba(10,15,30,0.8)',
              border: '1px solid rgba(34,197,94,0.15)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-green-400" style={{ filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.6))' }} />
              Active Listings
            </h2>
            <div className="flex flex-col gap-3 flex-shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(134,239,172,0.5)' }} />
                <input
                  type="text"
                  placeholder="e.g. Tomato, Onion..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input-dark pl-10"
                />
              </div>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(134,239,172,0.5)' }} />
                <select value={searchDistrict} onChange={e => setSearchDistrict(e.target.value)} style={{ ...selectStyle, paddingLeft: '2.25rem', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <option value="" style={{ background: '#0a0f1e' }}>All Districts</option>
                  {districts.map(d => <option key={d.district} value={d.district} style={{ background: '#0a0f1e' }}>{d.district}</option>)}
                </select>
                {loadingSearch && <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'rgba(134,239,172,0.6)' }} />}
              </div>
            </div>

            <div className="mt-5 flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 custom-scrollbar">
              {searchResults.map((res: any, i) => (
                <div
                  key={i}
                  className="group flex flex-col p-3.5 rounded-xl transition-all duration-300"
                  style={{
                    background: 'rgba(15,23,42,0.6)',
                    border: '1px solid rgba(34,197,94,0.08)',
                    animationDelay: `${Math.min(i * 0.03, 0.5)}s`,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'rgba(34,197,94,0.08)';
                    el.style.borderColor = 'rgba(34,197,94,0.25)';
                    el.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'rgba(15,23,42,0.6)';
                    el.style.borderColor = 'rgba(34,197,94,0.08)';
                    el.style.transform = 'translateX(0)';
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getEmoji(res.vegetable)}</span>
                      <div>
                        <h4 className="font-bold text-white text-sm">{res.vegetable}</h4>
                        <div className="flex items-center gap-1 text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>
                          <MapPin className="w-2.5 h-2.5" /> {res.district}
                        </div>
                      </div>
                    </div>
                    {res.type === 'CSV Farmer' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: 'rgba(34,197,94,0.15)', color: '#86efac', border: '1px solid rgba(34,197,94,0.2)' }}>Listed</span>
                    ) : res.type === 'Farmer' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: 'rgba(249,115,22,0.15)', color: '#fdba74', border: '1px solid rgba(249,115,22,0.2)' }}>Registered</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}>Market</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 py-1 text-xs mb-2">
                    {res.farmer_name && (
                       <div className="flex items-center gap-1 text-slate-400">
                          <span className="opacity-70">By</span> <span className="font-medium text-slate-300">{res.farmer_name}</span>
                       </div>
                    )}
                    {res.quantity > 0 && (
                       <div className="flex items-center gap-1 mt-1">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-500/10 border border-green-500/20 text-green-400">
                             {res.quantity} kg Available
                          </span>
                       </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-auto pt-2 border-t" style={{ borderColor: 'rgba(34,197,94,0.1)' }}>
                    <span className="text-base font-black text-white">
                      {res.avg_price > 0 ? (
                        <span>
                          <span style={{ color: '#fbbf24' }}>₹</span>
                          <span style={{ textShadow: '0 0 8px rgba(251,191,36,0.4)' }}>{res.avg_price}</span><span className="text-[10px] text-slate-500 font-medium ml-0.5">/kg</span>
                        </span>
                      ) : <span className="text-xs text-slate-500 font-medium tracking-wide">TBD</span>}
                    </span>
                    
                    {res.avg_price > 0 && (
                       <button
                          onClick={() => addToCart(res)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-500/20 hover:bg-green-500/40 border border-green-500/30 transition-colors flex items-center gap-1"
                       >
                          <Plus className="w-3 h-3" /> Add
                       </button>
                    )}
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && !loadingSearch && (
                <div className="text-center py-10 px-4">
                  <Search className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(34,197,94,0.2)' }} />
                  <p className="text-sm" style={{ color: 'rgba(100,116,139,0.7)' }}>No matching crops found.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-3 animate-slide-in-right delay-150">
          <div
            className="rounded-2xl overflow-hidden h-full min-h-[600px] relative"
            style={{
              background: 'rgba(10,15,30,0.8)',
              border: '1px solid rgba(34,197,94,0.15)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <div className="p-4 flex items-center justify-between absolute top-0 left-0 right-0 z-10" style={{ background: 'linear-gradient(to bottom, rgba(15,23,42,0.9), transparent)' }}>
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
                  <span className="text-sm font-bold text-white shadow-black drop-shadow-md">Live Crop Density Map</span>
               </div>
            </div>
            <VegetableMap locations={searchResults} />
          </div>
        </div>
      </div>

      {/* ── AI Recommendations ────────────────────────────── */}
      <div className="animate-slide-up delay-300">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="p-2 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(99,102,241,0.2))',
              border: '1px solid rgba(96,165,250,0.3)',
              boxShadow: '0 0 20px rgba(59,130,246,0.2)',
            }}
          >
            <TrendingDown className="w-5 h-5" style={{ color: '#93c5fd' }} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Recommended Near You</h2>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.8)' }}>AI picks based on your location: <span style={{ color: '#86efac' }}>{userLocation}</span></p>
          </div>
        </div>

        {loadingRecs ? (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#22c55e', filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.6))' }} />
              <p className="text-sm" style={{ color: 'rgba(100,116,139,0.7)' }}>Fetching AI recommendations...</p>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="group relative rounded-2xl p-5 overflow-hidden card-lift"
                style={{
                  background: 'rgba(10,15,30,0.8)',
                  border: '1px solid rgba(34,197,94,0.1)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  animationDelay: `${i * 0.1}s`,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'rgba(34,197,94,0.3)';
                  el.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4), 0 0 30px rgba(34,197,94,0.1)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'rgba(34,197,94,0.1)';
                  el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                }}
              >
                {/* BG accent */}
                <div
                  className="absolute top-0 right-0 w-20 h-20 rounded-bl-full transition-all duration-500 group-hover:scale-150"
                  style={{ background: 'rgba(34,197,94,0.05)' }}
                />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{
                        background: 'rgba(34,197,94,0.1)',
                        border: '1px solid rgba(34,197,94,0.2)',
                      }}
                    >
                      {getEmoji(rec.vegetable)}
                    </div>
                    <span
                      className="text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"
                      style={{
                        background: 'rgba(59,130,246,0.15)',
                        border: '1px solid rgba(96,165,250,0.25)',
                        color: '#93c5fd',
                      }}
                    >
                      <Star className="w-2.5 h-2.5" /> AI Pick
                    </span>
                  </div>

                  <h3 className="text-base font-black text-white mb-1">{rec.vegetable}</h3>
                  <p className="text-xs flex items-center gap-1 mb-4" style={{ color: 'rgba(100,116,139,0.7)' }}>
                    <MapPin className="w-3 h-3" /> {rec.district}
                  </p>

                  <div className="pt-3 border-t" style={{ borderColor: 'rgba(34,197,94,0.08)' }}>
                    <p className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'rgba(100,116,139,0.6)' }}>Predicted Price</p>
                    <p className="text-2xl font-black text-white">
                      <span style={{ color: '#fbbf24', textShadow: '0 0 8px rgba(251,191,36,0.4)' }}>₹</span>
                      {rec.predicted_price}
                      <span className="text-xs font-medium ml-1" style={{ color: 'rgba(100,116,139,0.6)' }}>/kg</span>
                    </p>
                    {/* Progress bar (decorative) */}
                    <div className="progress-bar mt-3">
                      <div
                        className="progress-fill"
                        style={{ '--progress': `${Math.min((rec.predicted_price / 100) * 100, 100)}%` } as React.CSSProperties}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
