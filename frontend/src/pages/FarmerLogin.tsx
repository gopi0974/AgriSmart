import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Sprout, Mail, Lock, User, Phone, Loader2, ArrowRight, Leaf } from 'lucide-react';

const VEGGIES = ['🌾', '🥦', '🍅', '🌽', '🌱'];

export default function FarmerLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: '', email: '', password: '', mobile: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Initial validation
    const identifier = formData.email.trim();
    if (!isLogin && !identifier && !formData.mobile) {
      setError('Please provide either an Email or a Mobile Number for your profile');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/farmer/login' : '/farmer/signup';
      
      // 2. Prepare robust payload 
      const payload = isLogin 
        ? { email: identifier, password: formData.password }
        : { ...formData, email: identifier };

      const res = await api.post(endpoint, payload);

      if (res.data.success) {
        if (!isLogin) {
          setIsLogin(true);
          setError('Profile created! You can now access your dashboard by signing in.');
          setFormData(prev => ({ ...prev, password: '' }));
        } else {
          // 3. Persist session data
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('role', 'farmer');
          localStorage.setItem('name', res.data.name || 'Farmer');
          localStorage.setItem('userId', res.data.farmer_id);
          localStorage.setItem('mobile', res.data.mobile || '');
          
          navigate('/farmer/details');
        }
      } else {
        // Handle explicit "error" messages from backend 
        setError(res.data.message || 'Login details incorrect. Please try again.');
      }
    } catch (err: any) {
      console.error('Farmer Access Error:', err);
      if (err.code === 'ERR_NETWORK') {
        setError('Server is offline. Please wait while we reconnect.');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Access Denied: Invalid email or password.');
      } else {
        setError(err.response?.data?.message || 'A technical error occurred (500). Please try later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[85vh] relative">
      {/* Floating emojis */}
      {VEGGIES.map((v, i) => (
        <div key={i} className="absolute text-3xl select-none pointer-events-none" style={{
          top: `${10 + i * 18}%`,
          left: i % 2 === 0 ? `${5 + i * 3}%` : `${85 - i * 2}%`,
          animation: `float ${3 + i * 0.6}s ease-in-out infinite`,
          animationDelay: `${i * 0.5}s`,
          opacity: 0.25,
          filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.5))',
        }}>{v}</div>
      ))}

      {/* Neon orbs */}
      <div className="orb orb-green w-80 h-80 -top-20 -left-20 animate-float-slow" />
      <div className="orb orb-blue w-64 h-64 -bottom-10 -right-20 animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        {/* Card */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(10,15,30,0.85)',
            border: '1px solid rgba(34,197,94,0.2)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.05)',
          }}
        >
          {/* Header */}
          <div className="relative p-8 text-center overflow-hidden" style={{
            background: 'linear-gradient(135deg, rgba(22,163,74,0.25) 0%, rgba(5,150,105,0.2) 100%)',
            borderBottom: '1px solid rgba(34,197,94,0.15)',
          }}>
            {/* Spin ring bg */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className="w-48 h-48 crop-ring" />
            </div>

            <div className="relative z-10">
              <div
                className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 animate-glow"
                style={{
                  background: 'linear-gradient(135deg, #16a34a, #059669)',
                  boxShadow: '0 0 30px rgba(34,197,94,0.5)',
                }}
              >
                <Sprout className="w-8 h-8 text-white veg-bounce" />
              </div>
              <h2 className="text-2xl font-black text-white">Farmer Portal</h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(134,239,172,0.7)' }}>Manage your harvest and reach buyers</p>

              {/* Neon leaf tag */}
              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold" style={{
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: '#86efac',
              }}>
                <Leaf className="w-3 h-3" /> AI-Powered Agriculture
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-8">
            {/* Toggle tabs */}
            <div className="flex p-1 rounded-xl mb-6" style={{
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(34,197,94,0.1)',
            }}>
              {['Sign In', 'Sign Up'].map((tab, i) => {
                const active = (i === 0) === isLogin;
                return (
                  <button
                    key={tab}
                    className="flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300"
                    style={active ? {
                      background: 'linear-gradient(135deg, #16a34a, #059669)',
                      color: 'white',
                      boxShadow: '0 4px 15px rgba(34,197,94,0.3)',
                    } : {
                      background: 'transparent',
                      color: 'rgba(148,163,184,0.7)',
                    }}
                    onClick={() => setIsLogin(i === 0)}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Error/Success banner */}
            {error && (
              <div
                className="p-3 text-sm rounded-xl mb-4 animate-slide-in-left font-medium"
                style={error.includes('created') ? {
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  color: '#86efac',
                } : {
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#fca5a5',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {!isLogin && (
                <>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(134,239,172,0.6)' }} />
                    <input
                      type="text"
                      placeholder="Full Name"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="input-dark input-with-icon"
                    />
                  </div>
                 <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(134,239,172,0.6)' }} />
                    <input
                      type="tel"
                      placeholder="Mobile Number"
                      value={formData.mobile}
                      onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                      className="input-dark input-with-icon"
                    />
                  </div>
                </>
              )}

              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(134,239,172,0.6)' }} />
                <input
                  type={isLogin ? "text" : "email"}
                  placeholder={isLogin ? "Email Address or Mobile Number" : "Email Address"}
                  {...(isLogin ? { required: true } : {})}
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="input-dark input-with-icon"
                />
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(134,239,172,0.6)' }} />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="input-dark input-with-icon"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 mt-2 ripple-effect btn-neon disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {isLogin ? 'Enter Farmer Portal' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
