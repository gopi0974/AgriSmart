import { useState, useEffect } from 'react';
import api from '../api';
import { PackageOpen, MapPin, Scale, Plus, Loader2, Navigation, CheckCircle2, Sprout, IndianRupee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VoiceAssistant from '../components/VoiceAssistant';
import toast, { Toaster } from 'react-hot-toast';

export default function FarmerDetails() {
  const [districts, setDistricts] = useState<{ district: string }[]>([]);
  const [vegetables, setVegetables] = useState<string[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({ district: '', vegetable: '', quantity: '', price: '' });
  const [predictedPrice, setPredictedPrice] = useState<number | null>(null);
  const [checkingPrice, setCheckingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  const navigate = useNavigate();

    const farmerId = localStorage.getItem('userId') || '';
    const farmerName = localStorage.getItem('name') || '';
    const farmerMobile = localStorage.getItem('mobile') || '';

  useEffect(() => {
    const loadData = async () => {
      try {
        const [distRes, vegRes, cropsRes] = await Promise.all([
          api.get('/districts'),
          api.get('/vegetables-list'),
          api.get(`/farmer/crops?farmer_id=${farmerId}`),
        ]);
        if (distRes.data.success) setDistricts(distRes.data.districts);
        if (vegRes.data.success) setVegetables(vegRes.data.vegetables);
        if (cropsRes.data.success) {
          const fetchedCrops = cropsRes.data.crops;
          setCrops(fetchedCrops);
          
          // Background load predictions for validation constraints
          const now = new Date();
          const preds: Record<string, number> = {};
          await Promise.all(fetchedCrops.map(async (c: any) => {
            try {
              const pRes = await api.post('/predict-price', {
                vegetable: c.vegetable, district: c.district, month: now.getMonth() + 1, year: now.getFullYear()
              });
              if (pRes.data.success) preds[c.id] = pRes.data.predicted_price;
            } catch (e) {}
          }));
          setPredictions(preds);
        }
      } catch (err) { console.error('Error loading data', err); }
      finally { setFetching(false); }
    };
    loadData();

    // Auto-poll to sync quantities if consumers buy stock
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get(`/farmer/crops?farmer_id=${farmerId}`);
        if (res.data.success) setCrops(res.data.crops);
      } catch (err) {}
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [farmerId]);

  useEffect(() => {
    const fetchPrediction = async () => {
      if (formData.district && formData.vegetable) {
        setCheckingPrice(true);
        try {
          const now = new Date();
          const res = await api.post('/predict-price', {
            vegetable: formData.vegetable,
            district: formData.district,
            month: now.getMonth() + 1,
            year: now.getFullYear()
          });
          if (res.data.success) setPredictedPrice(res.data.predicted_price);
        } catch (err) { console.error(err); }
        finally { setCheckingPrice(false); }
      } else {
        setPredictedPrice(null);
      }
    };
    fetchPrediction();
  }, [formData.district, formData.vegetable]);

  useEffect(() => {
    if (predictedPrice !== null && formData.price) {
      const p = parseFloat(formData.price);
      if (p < predictedPrice - 10 || p > predictedPrice + 10) {
        setPriceError(`⚠️ Price must be between ₹${(predictedPrice - 10).toFixed(2)} and ₹${(predictedPrice + 10).toFixed(2)}`);
      } else {
        setPriceError(null);
      }
    } else {
      setPriceError(null);
    }
  }, [formData.price, predictedPrice]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported by your browser'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
        setLocating(false);
      },
      (error) => { console.error('Error getting location', error); alert('Could not get exact location.'); setLocating(false); }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (priceError) return;
    setLoading(true);
    try {
      const res = await api.post('/farmer/details', {
        farmer_id: farmerId,
        name: farmerName,
        mobile: farmerMobile,
        district: formData.district,
        vegetable: formData.vegetable,
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price || "0"),
        lat: location?.lat,
        lon: location?.lon,
      });
      if (res.data.success) {
        setCrops([...crops, res.data.entry]);
        setFormData({ ...formData, quantity: '', price: '' });
        setLocation(null);
        toast.success("Crop listed successfully! 🌾");
      } else {
        toast.error("Failed to list crop.");
      }
    } catch (err) { console.error(err); toast.error("Server error"); }
    finally { setLoading(false); }
  };

  const handleVoiceCommand = (res: any) => {
    if (res.intent === 'add_crop') {
      const { vegetable, quantity, district } = res.data;
      
      // Find exact matches from the current lists to ensure the <select> works
      const matchedVeg = vegetables.find(v => v.toLowerCase() === vegetable?.toLowerCase()) || vegetable;
      const matchedDist = districts.find(d => d.district.toLowerCase() === district?.toLowerCase())?.district || district;

      setFormData(prev => ({
        ...prev,
        vegetable: matchedVeg || prev.vegetable,
        quantity: quantity || prev.quantity,
        district: matchedDist || prev.district
      }));
      
      // Visual feedback: glow fields
      setActiveVoiceField('all');
      setTimeout(() => setActiveVoiceField(null), 3000);
    } else if (res.intent === 'navigate') {
      navigate(res.data.path);
    }
  };

  const handleDelete = async (cropId: string) => {
    try {
      const res = await api.delete(`/farmer/crops/${cropId}?farmer_id=${farmerId}`);
      if (res.data.success) {
        setCrops(crops.filter(c => c.id !== cropId));
        toast.success("Listing deleted.");
      } else {
        toast.error("Failed to delete.");
      }
    } catch (err) { console.error('Error deleting crop', err); toast.error("Error deleting"); }
  };

  const handleUpdate = async (cropId: string, diff: {price?: number, quantity?: number}) => {
    // 1. Safe functional update to avoid stale closures and race conditions (Optimistic)
    setCrops(prevCrops => prevCrops.map(c => c.id === cropId ? { ...c, ...diff } : c));

    // 2. Derive payload safely
    const currentCrop = crops.find(c => c.id === cropId);
    if (!currentCrop) return;
    const req = { ...currentCrop, ...diff, farmer_id: farmerId };

    try {
      const res = await api.put(`/farmer/crops/${cropId}`, req);
      if (res.data.success) {
        // Optional re-sync with server
        setCrops(prev => prev.map(c => c.id === cropId ? { ...c, ...res.data.entry, id: cropId } : c));
        // Silently success to not spam toast on fast clicks
      } else {
        toast.error("Failed to sync.", { id: 'sync-err' });
      }
    } catch (err) { console.error('Error updating crop', err); toast.error("Error syncing", { id: 'sync-err' }); }
  };

  const selectStyle = {
    background: 'rgba(10,15,30,0.8)',
    border: '1px solid rgba(34,197,94,0.2)',
    color: 'white',
    borderRadius: '10px',
    padding: '10px 14px',
    width: '100%',
    outline: 'none',
    appearance: 'none' as const,
    fontFamily: 'inherit',
    fontSize: '0.875rem',
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center mt-20 flex-col gap-4">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#22c55e', filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.6))' }} />
        <p className="text-sm" style={{ color: 'rgba(100,116,139,0.7)' }}>Loading your farm profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <Toaster position="top-center" reverseOrder={false} toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      {/* Page header */}
      <div className="flex items-center gap-4 mb-2">
        <div
          className="p-3 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(22,163,74,0.3), rgba(5,150,105,0.2))',
            border: '1px solid rgba(34,197,94,0.3)',
            boxShadow: '0 0 20px rgba(34,197,94,0.2)',
          }}
        >
          <Sprout className="w-6 h-6 text-green-400 veg-bounce" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Farmer Dashboard</h1>
          <p className="text-sm" style={{ color: 'rgba(100,116,139,0.7)' }}>Manage your crops and reach buyers across AP</p>
        </div>
      </div>

      {/* Add Crop Form */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(10,15,30,0.85)',
          border: '1px solid rgba(34,197,94,0.15)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Card header */}
        <div className="p-6 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(34,197,94,0.1)', background: 'rgba(34,197,94,0.05)' }}>
          <div
            className="p-2 rounded-xl"
            style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            <Plus className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Add New Crop Availability</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(100,116,139,0.7)' }}>List your harvest so consumers can find you</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid md:grid-cols-4 gap-5">
            {/* District */}
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'rgba(134,239,172,0.8)' }}>
                <MapPin className="w-4 h-4" /> District
              </label>
              <select required value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} 
                style={selectStyle} className={activeVoiceField === 'all' ? 'input-glow' : ''}>
                <option value="" style={{ background: '#0a0f1e' }}>Select District...</option>
                {districts.map(d => <option key={d.district} value={d.district} style={{ background: '#0a0f1e' }}>{d.district}</option>)}
              </select>
            </div>

            {/* Vegetable */}
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'rgba(134,239,172,0.8)' }}>
                <PackageOpen className="w-4 h-4" /> Vegetable
              </label>
              <select required value={formData.vegetable} onChange={e => setFormData({ ...formData, vegetable: e.target.value })} 
                style={selectStyle} className={activeVoiceField === 'all' ? 'input-glow' : ''}>
                <option value="" style={{ background: '#0a0f1e' }}>Select Crop...</option>
                {vegetables.map(v => <option key={v} value={v} style={{ background: '#0a0f1e' }}>{v}</option>)}
              </select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'rgba(134,239,172,0.8)' }}>
                <Scale className="w-4 h-4" /> Quantity (kg)
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 500"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                className={`input-dark ${activeVoiceField === 'all' ? 'input-glow' : ''}`}
              />
            </div>

            {/* Price (Farmer sets own price) */}
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'rgba(134,239,172,0.8)' }}>
                <IndianRupee className="w-4 h-4" /> Your Price (₹/kg)
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 45"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                className={`input-dark ${activeVoiceField === 'all' ? 'input-glow' : ''} ${priceError ? 'border-red-500/50 focus:border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : ''}`}
              />
              {priceError && <p className="text-[10px] text-red-400 mt-1">{priceError}</p>}
            </div>
          </div>

          {/* Predicted Price block logic (moved above GPS) */}
          {formData.district && formData.vegetable && (
            <div className="mt-5 p-4 rounded-2xl flex items-center justify-between" style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(59,130,246,0.3)' }}>
              <div>
                <h4 className="font-bold text-white text-sm">Predicted Base Price</h4>
                <p className="text-xs text-blue-200/70">Our ML model suggests a realistic market price based on {formData.district} data.</p>
              </div>
              <div className="text-right">
                {checkingPrice ? (
                  <p className="text-sm text-blue-300 animate-pulse font-bold">Calculating...</p>
                ) : predictedPrice !== null ? (
                  <div className="text-2xl font-black text-blue-400">₹{predictedPrice.toFixed(2)}<span className="text-xs text-blue-200/50">/kg</span></div>
                ) : null}
              </div>
            </div>
          )}

          {/* Location bar */}
          <div
            className="mt-5 p-4 rounded-2xl flex items-center justify-between transition-all duration-300"
            style={{
              background: location ? 'rgba(34,197,94,0.08)' : 'rgba(15,23,42,0.6)',
              border: location ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(34,197,94,0.1)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-xl transition-all duration-300"
                style={{
                  background: location ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)',
                  border: location ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(34,197,94,0.15)',
                  boxShadow: location ? '0 0 12px rgba(34,197,94,0.3)' : 'none',
                }}
              >
                {location
                  ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                  : <Navigation className="w-5 h-5" style={{ color: 'rgba(134,239,172,0.7)' }} />
                }
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">GPS Location</h4>
                <p className="text-xs" style={{ color: 'rgba(100,116,139,0.7)' }}>
                  {location
                    ? `✅ Captured: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`
                    : 'Help consumers find exactly where your crop is.'
                  }
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGetLocation}
              disabled={locating || location !== null}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ripple-effect"
              style={location ? {
                background: 'rgba(34,197,94,0.2)',
                border: '1px solid rgba(34,197,94,0.35)',
                color: '#86efac',
              } : {
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.2)',
                color: '#86efac',
              }}
            >
              {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : location ? '📍 Fixed' : 'Get Location'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !!priceError}
            className="w-full mt-5 py-3 px-6 rounded-xl font-black text-white flex items-center justify-center gap-2 btn-neon ripple-effect disabled:opacity-60 transition-all"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Listing crop...' : '🌾 List Crop for Sale'}
          </button>
        </form>
      </div>

      <div className="flex justify-center -my-2 mb-4 animate-bounce-slow">
        <VoiceAssistant onCommand={handleVoiceCommand} contextDistrict={formData.district || 'Guntur'} />
      </div>

      {/* Active Listings */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(10,15,30,0.85)',
          border: '1px solid rgba(34,197,94,0.15)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(34,197,94,0.1)', background: 'rgba(34,197,94,0.05)' }}>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <PackageOpen className="w-5 h-5 text-green-400" />
            Your Active Listings
          </h2>
          {crops.length > 0 && (
            <span
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}
            >
              {crops.length} Crop{crops.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {crops.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-5xl mb-3 opacity-30 animate-float">📦</div>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.6)' }}>You haven't listed any crops yet.</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(100,116,139,0.4)' }}>Add your first crop using the form above.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(34,197,94,0.06)' }}>
            {crops.map((c, i) => (
              <div
                key={c.id || i}
                className="p-5 flex items-center justify-between transition-all duration-300"
                style={{ animationDelay: `${i * 0.05}s` }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.04)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(22,163,74,0.2), rgba(5,150,105,0.15))',
                      border: '1px solid rgba(34,197,94,0.2)',
                      color: '#4ade80',
                    }}
                  >
                    {c.vegetable.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-white">{c.vegetable}</h3>
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'rgba(100,116,139,0.7)' }}>
                      <MapPin className="w-3 h-3" /> {c.district}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 mt-3 sm:mt-0">
                  <div className="flex items-center gap-2">
                    {c.price > 0 && (
                      <div className="flex items-center">
                        <span 
                          className="inline-block px-3 py-1 rounded-l-full text-sm font-bold"
                          style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRight: 'none', color: '#fcd34d' }}
                        >
                          ₹{c.price}/kg
                        </span>
                        <div className="flex flex-col items-center border border-yellow-500/30 rounded-r-full overflow-hidden">
                           <button onClick={() => {
                             const pred = predictions[c.id];
                             if (pred && c.price + 1 > pred + 10) return toast.error(`Max price is ₹${(pred + 10).toFixed(0)}`);
                             handleUpdate(c.id, {price: c.price + 1});
                           }} className="bg-yellow-500/20 hover:bg-yellow-500/40 px-1.5 py-[2px] leading-none text-yellow-300">+</button>
                           <button onClick={() => {
                             const pred = predictions[c.id];
                             if (pred && c.price - 1 < pred - 10) return toast.error(`Min price is ₹${Math.max(1, pred - 10).toFixed(0)}`);
                             handleUpdate(c.id, {price: Math.max(1, c.price - 1)});
                           }} className="bg-yellow-500/20 hover:bg-yellow-500/40 px-1.5 py-[2px] leading-none text-yellow-300">-</button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center">
                      <span
                        className="inline-block px-3 py-1 rounded-l-full text-sm font-bold"
                        style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRight: 'none', color: '#86efac' }}
                      >
                        {c.quantity} kg
                      </span>
                      <div className="flex flex-col items-center border border-green-500/30 rounded-r-full overflow-hidden">
                         <button onClick={() => handleUpdate(c.id, {quantity: c.quantity + 1})} className="bg-green-500/20 hover:bg-green-500/40 px-1.5 py-[2px] leading-none text-green-300">+</button>
                         <button onClick={() => handleUpdate(c.id, {quantity: Math.max(1, c.quantity - 1)})} className="bg-green-500/20 hover:bg-green-500/40 px-1.5 py-[2px] leading-none text-green-300">-</button>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(c.id)} className="text-[10px] text-red-400 hover:text-red-300 underline underline-offset-2">
                    Delete Listing
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
