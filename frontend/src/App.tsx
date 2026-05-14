import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import FarmerLogin from './pages/FarmerLogin';
import ConsumerLogin from './pages/ConsumerLogin';
import FarmerDetails from './pages/FarmerDetails';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import GlobalChatbot from './components/GlobalChatbot';

function App() {
  const ProtectedRoute = ({ children, allowedRole }: { children: JSX.Element, allowedRole: string }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token) return <Navigate to="/" replace />;
    if (role !== allowedRole) return <Navigate to="/" replace />;
    return children;
  };

  return (
    <div className="min-h-screen flex flex-col relative z-10 w-full overflow-x-hidden">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/farmer/login" element={<FarmerLogin />} />
          <Route path="/consumer/login" element={<ConsumerLogin />} />
          
          <Route 
            path="/farmer/details" 
            element={
              <ProtectedRoute allowedRole="farmer">
                <FarmerDetails />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/home" 
            element={
              <ProtectedRoute allowedRole="consumer">
                <HomePage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/settings" 
            element={<SettingsPage />} 
          />
        </Routes>
      </main>
      
      {/* Universal Chatbot Overlay */}
      <GlobalChatbot />
    </div>
  );
}

export default App;
