import { useState, useEffect } from 'react';
import api from '../api';
import { PackageOpen, MapPin, Scale, Plus, Loader2, Navigation, CheckCircle2, Sprout, Sparkles, IndianRupee, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VoiceAssistant from '../components/VoiceAssistant';

export default function FarmerDetails() {
  const [districts, setDistricts] = useState<{ district: string }[]>([]);
  const [vegetables, setVegetables] = useState<string[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({ district: '', vegetable: '', quantity: '' });
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  
  // ML Form Integration states
  const [mlBasePrice, setMlBasePrice] = useState<number | null>(null);
  const [adjustedPrice, setAdjustedPrice] = useState<number | null>(null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  const [predVeg, setPredVeg] = useState('');
  const [predDistrict, setPredDistrict] = useState('');
  const [predPrice, setPredPrice] = useState<number | null>(null);
  const [predLoading, setPredLoading] = useState(false);

  const navigate = useNavigate();

    const farmerId = localStorage.getItem('userId') || '';
    const farmerName = localStorage.getItem('name') || '';
    const farmerMobile = localStorage.getItem('mobile') || '';

  const fetchFarmerCrops = async () => {
      try {
          const cropsRes = await api.get(`/farmer/crops?farmer_id=${farmerId}`);
          if (cropsRes.data.success) setCrops(cropsRes.data.crops);
      } catch (err) { console.error('Error fetching crops', err); }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [distRes, vegRes] = await Promise.all([
          api.get('/districts'),
          api.get('/vegetables-list')
        ]);
        if (distRes.data.success) setDistricts(distRes.data.districts);
        if (vegRes.data.success) setVegetables(vegRes.data.vegetables);
        await fetchFarmerCrops();
      } catch (err) { console.error('Error loading data', err); }
      finally { setFetching(false); }
    };
    loadData();
  }, [farmerId]);

  useEffect(() => {
    if (formData.vegetable && formData.district) {
      const getPrice = async () => {
        setIsFetchingPrice(true);
        try {
            const now = new Date();
            const res = await api.get(`/predict-price?vegetable=${formData.vegetable}&district=${formData.district}&month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
            if (res.data.success) {
                setMlBasePrice(res.data.predicted_price);
                // Only initialize if not already set, to prevent overriding user edits if they quickly tab
                setAdjustedPrice(res.data.predicted_price);
            }
        } catch (e) { console.error(e); } finally { setIsFetchingPrice(false); }
      };
      getPrice();
    } else {
      setMlBasePrice(null);
      setAdjustedPrice(null);
    }
  }, [formData.vegetable, formData.district]);

  const handleAdjustPrice = (delta: number) => {
     if (mlBasePrice && adjustedPrice !== null) {
         const newPrice = adjustedPrice + delta;
         if (newPrice >= mlBasePrice - 10 && newPrice <= mlBasePrice + 10) {
             setAdjustedPrice(newPrice);
         }
     }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/farmer/details', {
        farmer_id: farmerId,
        name: farmerName,
        mobile: farmerMobile,
        district: formData.district,
        vegetable: formData.vegetable,
        quantity: parseFloat(formData.quantity),
        price_per_kg: adjustedPrice || mlBasePrice || 40,
        lat: location?.lat,
        lon: location?.lon,
      });
      if (res.data.success) {
        setFormData({ ...formData, quantity: '' });
        setLocation(null);
        await fetchFarmerCrops();
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUpdateQuantity = async (cropId: string, newQuantity: number) => {
      if (newQuantity <= 0) {
          handleDeleteCrop(cropId);
          return;
      }
      // Optimistic Update
      setCrops(prev => prev.map(c => c.id === cropId ? { ...c, quantity: newQuantity } : c));
      
      try {
          await api.put(`/farmer/crops/${cropId}`, { farmer_id: farmerId, quantity: newQuantity });
      } catch (e: any) { 
          console.error(e); 
          const msg = e.response?.data?.detail || e.message || 'Update failed';
          alert(`Modification failed: ${msg}`);
          // Revert if failed
          await fetchFarmerCrops();
      }
  }

  const handleDeleteCrop = async (cropId: string) => {
      if (!confirm("Are you sure you want to remove this listing?")) return;
      // Optimistic Delete
      const previousCrops = [...crops];
      setCrops(prev => prev.filter(c => c.id !== cropId));

      try {
          await api.delete(`/farmer/crops/${cropId}?farmer_id=${farmerId}`);
      } catch (e) { 
          console.error(e);
          setCrops(previousCrops);
      }
  }

  const handleVoiceCommand = (res: any) => {
    if (res.intent === 'add_crop') {
      const { vegetable, quantity, district } = res.data;
      
      const matchedVeg = vegetables.find(v => v.toLowerCase() === vegetable?.toLowerCase()) || vegetable;
      const matchedDist = districts.find(d => d.district.toLowerCase() === district?.toLowerCase())?.district || district;

      setFormData(prev => ({
        ...prev,
        vegetable: matchedVeg || prev.vegetable,
        quantity: quantity || prev.quantity,
        district: matchedDist || prev.district
      }));
      
      setActiveVoiceField('all');
      setTimeout(() => setActiveVoiceField(null), 3000);
    } else if (res.intent === 'navigate') {
      navigate(res.data.path);
    }
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

      <div
        className="relative overflow-hidden rounded-3xl p-8 mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(22,163,74,0.15) 0%, rgba(5,150,105,0.1) 40%, rgba(37,99,235,0.1) 100%)',
          border: '1px solid rgba(34,197,94,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 60px rgba(34,197,94,0.05)',
        }}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 orb orb-green animate-float-slow" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl animate-glow" style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)' }}>
              <Sparkles className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-white font-black text-xl">Market Price Predictor</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(34,197,94,0.15)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)' }}>
              Live ML Model
            </span>
          </div>
          <p className="text-sm mb-6" style={{ color: 'rgba(148,163,184,0.8)' }}>
            Check the AI-predicted market price for your crops before listing them.
          </p>

          <div className="flex flex-wrap gap-4 items-end">
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

      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(10,15,30,0.85)',
          border: '1px solid rgba(34,197,94,0.15)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
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
          <div className="grid md:grid-cols-3 gap-5">
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
          </div>
          
          {/* Automatic ML Pricing Display */}
          {(mlBasePrice || isFetchingPrice) && (
             <div className="mt-5 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}>
                {isFetchingPrice ? (
                   <div className="flex items-center gap-2 text-green-400 font-medium">
                      <Loader2 className="w-5 h-5 animate-spin"/> Fetching ML price prediction for {formData.vegetable}...
                   </div>
                ) : (
                   <>
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-green-500/20 border border-green-500/30 rounded-xl">
                            <Sparkles className="w-5 h-5 text-green-400" />
                         </div>
                         <div>
                            <h4 className="text-sm font-bold text-white mb-0.5">Predicted Market Value: <span className="text-green-400">₹{mlBasePrice}/kg</span></h4>
                            <p className="text-xs text-slate-400">You can adjust this price internally up to ±₹10.</p>
                         </div>
                     </div>
                     
                     <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                         <button 
                             type="button"
                             onClick={() => handleAdjustPrice(-1)} 
                             disabled={adjustedPrice === null || adjustedPrice <= mlBasePrice! - 10}
                             className="w-8 h-8 flex items-center justify-center bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40 disabled:opacity-30 disabled:cursor-not-allowed"
                         >-</button>
                         <div className="w-20 text-center font-black text-xl text-white">
                            ₹{adjustedPrice}
                         </div>
                         <button 
                             type="button"
                             onClick={() => handleAdjustPrice(1)} 
                             disabled={adjustedPrice === null || adjustedPrice >= mlBasePrice! + 10}
                             className="w-8 h-8 flex items-center justify-center bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/40 disabled:opacity-30 disabled:cursor-not-allowed"
                         >+</button>
                     </div>

                     {formData.quantity && !isNaN(Number(formData.quantity)) && adjustedPrice && (
                         <div className="ml-auto text-right">
                             <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Estimated Value</div>
                             <div className="text-2xl font-black text-yellow-400">₹{(adjustedPrice * Number(formData.quantity)).toLocaleString('en-IN')}</div>
                         </div>
                     )}
                   </>
                )}
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
            disabled={loading}
            className="w-full mt-5 py-3 px-6 rounded-xl font-black text-white flex items-center justify-center gap-2 btn-neon ripple-effect disabled:opacity-60 transition-all"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Listing crop...' : '🌾 List Crop for Sale'}
          </button>
        </form>
      </div>

      <VoiceAssistant onCommand={handleVoiceCommand} contextDistrict={formData.district || 'Guntur'} />

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
                key={i}
                className="p-5 flex items-center justify-between transition-all duration-300 group"
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
                    <div className="flex items-center gap-2">
                        <h3 className="font-black text-white">{c.vegetable}</h3>
                        <span className="text-[10px] text-green-400 font-bold ml-2">₹{c.price_per_kg || 40}/kg</span>
                    </div>
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'rgba(100,116,139,0.7)' }}>
                      <MapPin className="w-3 h-3" /> {c.district}
                    </p>
                  </div>
                </div>
                
                {/* Controls Area */}
                <div className="flex items-center gap-6">
                  {/* Quantity Adjusters */}
                  <div className="flex items-center gap-2 bg-[#0a0f1e] px-2 py-1 rounded-lg border border-white/10">
                      <button 
                         onClick={() => handleUpdateQuantity(c.id, c.quantity - 1 > 0 ? c.quantity - 1 : 0)}
                         className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                      >
                         -
                      </button>
                      <span className="text-xs font-bold w-14 text-center text-green-400">
                        {c.quantity} kg
                      </span>
                      <button 
                         onClick={() => handleUpdateQuantity(c.id, c.quantity + 1)}
                         className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                      >
                         +
                      </button>
                  </div>

                  {/* Delete / Indicator */}
                  <div className="flex items-center gap-3 w-8 justify-end">
                      <button 
                          onClick={() => handleDeleteCrop(c.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-500 hover:bg-red-500/20 rounded-lg hover:rotate-12"
                          title="Remove Listing"
                      >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                      </button>
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse group-hover:opacity-0 transition-opacity absolute" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
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
