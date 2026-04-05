import { useState, useEffect } from 'react';
import api from '../api';
import VegetableMap from '../components/VegetableMap';
import { Search, MapPin, TrendingDown, Loader2, Sparkles, IndianRupee, ChevronDown, Star, ShoppingCart, Trash2, Plus, Minus, Package, Truck, Store as StoreIcon, X } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';


interface Recommendation { vegetable: string; district: string; lat: number; lon: number; avg_price: number; predicted_price: number; }
interface SearchResult { vegetable: string; district: string; lat: number; lon: number; avg_price: number; }

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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'receipt'>('cart');
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const { items, addItem, removeItem, updateQuantity, getTotal } = useCartStore();

  const handleProceedCheckout = async () => {
    setIsProcessing(true);
    try {
       if (items.length === 0) {
           toast.error("Cart is empty");
           setIsProcessing(false);
           return;
       }
       for (const i of items) {
           if (!i.id || i.id === "undefined") {
               toast.error(`Invalid product ID detected for ${i.vegetable}. Please clear cart.`);
               setIsProcessing(false); return;
           }
           if (!i.farmer_id || i.farmer_id === "undefined") {
               toast.error(`Farmer mismatch: Item ${i.vegetable} has missing farmer ID. Please clear cart.`);
               setIsProcessing(false); return;
           }
           if (i.quantity <= 0) {
               toast.error(`Invalid quantity for ${i.vegetable}`);
               setIsProcessing(false); return;
           }
       }
       const req = { 
           user_id: localStorage.getItem('userLocation') || 'guest',
           items: items.map(i => ({ 
               product_id: String(i.id), 
               farmer_id: String(i.farmer_id), 
               quantity: Number(i.quantity), 
               price_per_kg: Number(i.price) 
           })),
           delivery_type: deliveryMethod === 'delivery' ? 'home_delivery' : 'pickup'
       };
       console.log("[DEBUG] Sending Validation Payload:", req);
       const res = await api.post('/farmer/checkout/validate', req);
       if (res.data.success) {
           setReceiptData({
             id: 'RCPT-' + Math.floor(Math.random() * 1000000),
             date: new Date().toLocaleString(),
             delivery: deliveryMethod,
             total: getTotal() + (deliveryMethod === 'delivery' ? Math.floor(12 + items.reduce((acc, i) => acc + i.quantity, 0) * 1.5) : 0),
             items: [...items]
           });
           setCheckoutStep('receipt');
       } else {
           toast.error(res.data.message || "Insufficient stock. Please update your cart.");
       }
    } catch (e: any) { 
        console.error("[DEBUG] Validation failed exactly due to Error:", e.response?.data || e.message);
        toast.error("Server error, try again"); 
    }
    setIsProcessing(false);
  };

  const handleConfirmOrder = async () => {
     setIsProcessing(true);
     try {
       for (const i of items) {
           if (!i.id || i.id === "undefined" || !i.farmer_id || i.farmer_id === "undefined" || i.quantity <= 0) {
               toast.error(`Validation failed for ${i.vegetable}. Action blocked.`);
               setIsProcessing(false); return;
           }
       }
       const req = { 
           user_id: localStorage.getItem('userLocation') || 'guest',
           items: items.map(i => ({ 
               product_id: String(i.id), 
               farmer_id: String(i.farmer_id), 
               quantity: Number(i.quantity), 
               price_per_kg: Number(i.price) 
           })),
           delivery_type: deliveryMethod === 'delivery' ? 'home_delivery' : 'pickup'
       };
       console.log("[DEBUG] Sending Confirmation Payload:", req);
       // Transaction step: Atomic deduction
       const res = await api.post('/farmer/checkout/confirm', req);
       
       if (res.data.success) {
            const receiptEl = document.getElementById("receipt-area");
            if (receiptEl) {
              try {
                const canvas = await html2canvas(receiptEl, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`AgriSmart_Receipt_${res.data.id || Date.now()}.pdf`);
              } catch (err) {
                console.error("PDF Generation failed", err);
              }
            }

            toast.success("Order Confirmed! Receipt Downloaded.");
            
            // Cleanup cart but leave receipt open for viewing
            items.forEach(i => removeItem(i.id, i.vegetable)); 
       } else {
           toast.error(res.data.message || "Order failed during confirmation.");
           setCheckoutStep('cart');
       }
     } catch (e: any) {
       console.error("[DEBUG] Confirmation Error Triggered:", e.response?.data || e.message);
       toast.error("Server error. Quantity was NOT reduced.");
     }
     setIsProcessing(false);
  };

  const handlePredict = async () => {
    if (!predVeg || !predDistrict) return;
    setPredLoading(true);
    setPredPrice(null);
    try {
      const now = new Date();
      const res = await api.post('/predict-price', {
        vegetable: predVeg,
        district: predDistrict,
        month: now.getMonth() + 1,
        year: now.getFullYear()
      });
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

    // Real-time polling every 5s
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get(`/vegetables?name=${searchQuery}&district=${searchDistrict}`);
        if (res.data.success) {
           // Stringify check prevents unnecessary re-renders
           if (JSON.stringify(res.data.results) !== JSON.stringify(searchResults)) {
              setSearchResults(res.data.results);
           }
        }
      } catch (err) {}
    }, 5000);

    return () => {
      clearTimeout(delayDebounceFn);
      clearInterval(pollInterval);
    };
  }, [searchQuery, searchDistrict, searchResults]);

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
    <>
      {/* ── Cart Float Button ────────────────────────────── */}
      <button 
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-28 right-4 sm:right-8 w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all z-[80] animate-glow-blue"
      >
        <ShoppingCart className="w-6 h-6" />
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0a0f1e]">
            {items.reduce((acc, current) => acc + current.quantity, 0)}
          </span>
        )}
      </button>

      {/* ── Cart Drawer ─────────────────────────────────── */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              style={{ zIndex: 99990 }}
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md glass flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
              style={{ background: 'rgba(10,15,30,0.98)', borderLeft: '1px solid rgba(59,130,246,0.3)', zIndex: 99999 }}
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-blue-500/10">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-black text-white">{checkoutStep === 'receipt' ? 'Order Receipt' : 'Your Basket'}</h2>
                </div>
                <button onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {checkoutStep === 'cart' ? (
                <>
                  <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
                {items.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                    <Package className="w-16 h-16 mb-4" />
                    <p className="text-lg font-bold">Your cart is empty</p>
                    <p className="text-sm">Add some fresh veggies to get started!</p>
                  </div>
                ) : (
                  items.map((item, idx) => (
                    <div key={`${item.id}-${item.vegetable}`} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4 animate-scale-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className="text-3xl">{getEmoji(item.vegetable)}</div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h4 className="font-bold text-white">{item.vegetable}</h4>
                          <button onClick={() => removeItem(item.id, item.vegetable)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{item.farmer_name}</p>
                        <div className="flex justify-between items-center mt-3">
                          <div className="flex items-center gap-3 bg-black/40 rounded-lg p-1 border border-white/5">
                            <button onClick={() => updateQuantity(item.id, item.vegetable, item.quantity - 1)} className="p-1 hover:text-blue-400">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.vegetable, item.quantity + 1)} className="p-1 hover:text-blue-400">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="font-black text-white">₹{item.price * item.quantity}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {items.length > 0 && (
                <div className="p-6 border-t border-white/5 bg-white/5 space-y-4">
                  {/* Delivery Selection */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button 
                      onClick={() => setDeliveryMethod('delivery')} 
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${deliveryMethod === 'delivery' ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 hover:border-white/20'}`}>
                      <Truck className="w-5 h-5 text-blue-400" />
                      <span className="text-[10px] font-bold uppercase">Home Delivery</span>
                    </button>
                    <button 
                      onClick={() => setDeliveryMethod('pickup')} 
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${deliveryMethod === 'pickup' ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 hover:border-white/20'}`}>
                      <StoreIcon className="w-5 h-5 text-slate-400" />
                      <span className="text-[10px] font-bold uppercase">Self Pickup</span>
                    </button>
                  </div>

                  {deliveryMethod === 'pickup' && (
                    <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-sm">
                      <p className="text-green-400 font-bold mb-2 text-xs">Pickup Locations</p>
                      {items.map(item => (
                         <div key={item.id} className="mb-2 last:mb-0 border-l-2 border-green-500/30 pl-2">
                           <p className="font-bold text-white text-[11px]">{item.vegetable} from {item.farmer_name}</p>
                           <p className="text-[10px] text-slate-400 mb-1">📍 {item.district}</p>
                           <div className="flex justify-between items-center text-[10px] bg-blue-500/10 p-1.5 rounded-lg border border-blue-500/20">
                             <span className="font-bold text-blue-400">📞 {item.mobile && item.mobile !== 'N/A' ? item.mobile : 'Contact provided post-booking'}</span>
                             <span className="text-slate-400">Call to arrange pickup</span>
                           </div>
                         </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-300 text-sm">
                    <span>Subtotal</span>
                    <span>₹{getTotal()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 text-sm">
                    <span>Delivery Charge {deliveryMethod === 'delivery' && <span className="text-[10px] text-slate-400 ml-1">(Distance-based)</span>}</span>
                    <span className="text-green-400 font-bold">{deliveryMethod === 'delivery' ? `₹${Math.floor(12 + items.reduce((acc, i) => acc + i.quantity, 0) * 1.5)}` : 'Free'}</span>
                  </div>
                  {deliveryMethod === 'delivery' && (
                    <div className="flex justify-between items-center text-slate-300 text-sm">
                      <span>Est. Arrival</span>
                      <span className="text-blue-300 font-bold text-xs">45-60 mins ⚡</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-white/10 pt-4 mb-4">
                    <span className="text-lg font-black text-white">Total</span>
                    <span className="text-2xl font-black text-green-400">₹{getTotal() + (deliveryMethod === 'delivery' ? Math.floor(12 + items.reduce((acc, i) => acc + i.quantity, 0) * 1.5) : 0)}</span>
                  </div>
                  <button onClick={handleProceedCheckout} disabled={isProcessing} className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50">
                    {isProcessing ? 'Validating Stock...' : 'Proceed to Checkout'}
                  </button>
                </div>
              )}
              </>
            ) : (
               <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar bg-white/5 pb-10">
                 <div id="receipt-area" className="bg-white text-black p-6 rounded-xl shadow-lg mb-6">
                   <h3 className="text-2xl font-black mb-2 text-center text-slate-800">AgriSmart</h3>
                   <h4 className="text-sm font-bold text-center text-slate-500 mb-6 border-b pb-4">OFFICIAL RECEIPT</h4>
                   
                   <p className="text-xs text-slate-500 flex justify-between"><span>Rcpt: {receiptData?.id}</span> <span>{receiptData?.date}</span></p>
                   
                   <div className="mt-6 space-y-3 border-b pb-6">
                     {receiptData?.items.map((it: any) => (
                       <div key={it.id} className="flex justify-between items-center text-sm font-medium">
                         <span>{it.quantity}kg x {it.vegetable} <span className="text-xs text-slate-400">({it.farmer_name})</span></span>
                         <span>₹{it.price * it.quantity}</span>
                       </div>
                     ))}
                   </div>
                   
                   <div className="mt-4 flex justify-between items-center text-slate-500 text-sm font-bold">
                     <span>Delivery ({receiptData?.delivery})</span>
                     <span>{receiptData?.delivery === 'delivery' ? `₹${receiptData.total - getTotal()}` : 'Free'}</span>
                   </div>

                   {receiptData?.delivery === 'pickup' && (
                     <div className="mt-4 bg-slate-50 p-3 rounded-lg text-xs border border-slate-200">
                       <p className="font-bold text-slate-700 mb-2 uppercase tracking-wider text-[10px]">Pickup Contact Details</p>
                       <div className="space-y-2">
                         {receiptData?.items.map((it: any) => (
                           <div key={`pickup-${it.id}`} className="flex justify-between border-b last:border-0 border-slate-100 pb-2 last:pb-0 text-slate-600">
                             <span className="font-bold">{it.farmer_name}</span>
                             <span className="font-bold text-blue-600">📞 {it.mobile && it.mobile !== 'N/A' ? it.mobile : 'Available Post-Booking'}</span>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                   <div className="mt-4 flex justify-between items-center font-black text-xl text-slate-800">
                     <span>TOTAL</span>
                     <span>₹{receiptData?.total}</span>
                   </div>
                 </div>

                 <button onClick={handleConfirmOrder} disabled={isProcessing} className="w-full py-4 rounded-2xl bg-green-500 text-white font-black hover:bg-green-400 transition-all shadow-xl shadow-green-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                   {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <IndianRupee className="w-5 h-5" />}
                   {isProcessing ? 'Processing Transaction...' : 'Confirm Order & Download PDF'}
                 </button>
                 <button onClick={() => setCheckoutStep('cart')} disabled={isProcessing} className="w-full py-4 mt-2 rounded-2xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50">
                   Back to Cart
                 </button>
               </div>
            )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="space-y-8 pb-12 animate-fade-in">
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
            className="p-5 rounded-2xl"
            style={{
              background: 'rgba(10,15,30,0.8)',
              border: '1px solid rgba(34,197,94,0.15)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-green-400" style={{ filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.6))' }} />
              Search Vegetables
            </h2>
            <div className="flex flex-col gap-3">
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

            <div className="mt-5 flex flex-col gap-2.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
              {searchResults.slice(0, 30).map((res: any, i) => (
                <div
                  key={i}
                  className="group flex flex-col p-3.5 rounded-xl transition-all duration-300 cursor-pointer"
                  style={{
                    background: 'rgba(15,23,42,0.6)',
                    border: '1px solid rgba(34,197,94,0.08)',
                    animationDelay: `${i * 0.03}s`,
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
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: 'rgba(34,197,94,0.15)', color: '#86efac', border: '1px solid rgba(34,197,94,0.2)' }}>Verified Farmer</span>
                  </div>

                  <div className="flex flex-col gap-1 py-2 border-y text-xs" style={{ borderColor: 'rgba(34,197,94,0.06)' }}>
                    <div className="flex justify-between">
                      <span style={{ color: 'rgba(100,116,139,0.8)' }}>Farmer:</span>
                      <span className="font-semibold text-slate-300">{res.farmer_name}</span>
                    </div>
                    {/* Privacy: Mobile numbers are hidden in the UI */}
                    {res.land_acres > 0 && (
                      <div className="flex justify-between">
                        <span style={{ color: 'rgba(100,116,139,0.8)' }}>🌾 Land:</span>
                        <span className="font-semibold text-slate-300">{res.land_acres} acres</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-2 gap-2">
                    <div className="flex flex-col">
                      <div className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: 'rgba(100,116,139,0.6)' }}>
                        Farmer Price
                      </div>
                      <span className="text-base font-black text-white">
                        <span style={{ color: '#fbbf24' }}>₹</span>
                        <span style={{ textShadow: '0 0 8px rgba(251,191,36,0.4)' }}>{res.avg_price}</span>
                        <span className="text-[10px] text-slate-400 font-normal ml-1">/kg</span>
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="text-[9px] uppercase tracking-wider font-semibold text-green-400/80">
                        Available Stock
                      </div>
                      <span className="text-sm font-bold text-green-300">
                        {res.quantity} kg
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <button 
                      onClick={() => {
                        // Strict data mapping from backend:
                        if (!res.id || !res.farmer_id) {
                          toast.error("Cannot add: Invalid product identification");
                          return;
                        }
                        addItem({
                          id: res.id,
                          vegetable: res.vegetable,
                          district: res.district,
                          quantity: 1,
                          price: res.avg_price || 40,
                          farmer_name: res.farmer_name,
                          farmer_id: res.farmer_id,
                          mobile: res.mobile
                        });
                        toast.success("Item added to cart successfully ✅");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Cart
                    </button>
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && !loadingSearch && (
                <div className="text-center py-10 px-4">
                  <Search className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(34,197,94,0.2)' }} />
                  <p className="text-sm" style={{ color: 'rgba(100,116,139,0.7)' }}>No matching vegetables found.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-3 animate-slide-in-right delay-150">
          <div
            className="rounded-2xl overflow-hidden h-full min-h-[400px]"
            style={{
              background: 'rgba(10,15,30,0.8)',
              border: '1px solid rgba(34,197,94,0.15)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <div className="p-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(34,197,94,0.1)' }}>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
              <span className="text-sm font-bold text-white">Live Vegetable Map</span>
              <span className="text-xs" style={{ color: 'rgba(100,116,139,0.7)' }}>· Andhra Pradesh</span>
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
    </>
  );
}
