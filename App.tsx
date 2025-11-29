
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './components/Button';
import { NavBar } from './components/NavBar';
import { LanguageCode, UserProfile, DiseaseResult, ScanRecord, ProfitCalculation, WeatherTip, WeatherData } from './types';
import { TRANSLATIONS } from './constants';
import { analyzePlantImage, generateAdvisory } from './services/geminiService';
import { saveScan, getHistory, saveUser, getUser, registerNewUser, findUserByPhone } from './services/storageService';

// --- Shared Components ---

const Header: React.FC<{ title: string, subtitle?: string, onBack?: () => void, rightElement?: React.ReactNode }> = ({ title, subtitle, onBack, rightElement }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-4">
      {onBack && (
        <button onClick={onBack} className="p-2 rounded-full bg-white/50 hover:bg-white transition-colors shadow-sm text-gray-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 font-medium">{subtitle}</p>}
      </div>
    </div>
    {rightElement}
  </div>
);

const Card: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void, variant?: 'glass' | 'solid' }> = ({ children, className = "", onClick, variant = 'solid' }) => (
  <div 
    onClick={onClick} 
    className={`rounded-2xl transition-all duration-300 ${
      variant === 'glass' ? 'glass shadow-glass' : 'bg-white shadow-lg shadow-gray-100'
    } ${onClick ? 'cursor-pointer active:scale-[0.98] hover:shadow-xl' : ''} ${className}`}
  >
    {children}
  </div>
);

// --- Helpers ---

const getWeatherConditionText = (code: number, t: Record<string, string>): { text: string, icon: React.ReactNode } => {
  // WMO Weather interpretation codes
  if (code === 0) return { text: t.clear, icon: <span className="text-yellow-400 text-3xl">☀️</span> };
  if (code >= 1 && code <= 3) return { text: t.cloudy, icon: <span className="text-gray-400 text-3xl">☁️</span> };
  if (code >= 45 && code <= 48) return { text: t.fog, icon: <span className="text-gray-300 text-3xl">🌫️</span> };
  if (code >= 51 && code <= 57) return { text: t.drizzle, icon: <span className="text-blue-300 text-3xl">🌦️</span> };
  if (code >= 61 && code <= 67) return { text: t.rain, icon: <span className="text-blue-500 text-3xl">🌧️</span> };
  if (code >= 80 && code <= 82) return { text: t.rain, icon: <span className="text-blue-600 text-3xl">🌧️</span> };
  if (code >= 95 && code <= 99) return { text: t.storm, icon: <span className="text-purple-500 text-3xl">⛈️</span> };
  return { text: t.clear, icon: <span className="text-yellow-400 text-3xl">☀️</span> };
};

const LANGUAGES_LIST = [
  { code: 'en', label: 'English', sub: 'Default' },
  { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
  { code: 'te', label: 'తెలుగు', sub: 'Telugu' },
  { code: 'ta', label: 'தமிழ்', sub: 'Tamil' },
  { code: 'kn', label: 'ಕನ್ನಡ', sub: 'Kannada' },
  { code: 'ml', label: 'മലയാളം', sub: 'Malayalam' },
  { code: 'mr', label: 'मराठी', sub: 'Marathi' },
  { code: 'bn', label: 'বাংলা', sub: 'Bengali' },
  { code: 'gu', label: 'ગુજરાતી', sub: 'Gujarati' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', sub: 'Punjabi' }
];

// --- Views ---

const LanguageView: React.FC<{ onSelect: (l: LanguageCode) => void }> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-teal-800 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
         <div className="absolute top-10 left-10 w-64 h-64 bg-yellow-300 rounded-full blur-[100px] animate-pulse-slow"></div>
         <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-300 rounded-full blur-[100px] animate-pulse-slow" style={{animationDelay: '1s'}}></div>
      </div>
  
      <div className="relative z-10 w-full max-w-sm flex flex-col max-h-screen py-8">
        <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-2xl mb-6 text-center shrink-0 animate-slide-up">
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-400 to-cyan-400 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-500/30 transform rotate-3">
             <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">AgriVision AI</h1>
          <p className="text-emerald-100 font-medium text-sm">Smart Farming Assistant</p>
        </div>
  
        <div className="overflow-y-auto no-scrollbar space-y-3 pb-safe px-1 flex-1">
          {LANGUAGES_LIST.map((lang, index) => (
            <button
              key={lang.code}
              onClick={() => onSelect(lang.code as LanguageCode)}
              className="w-full group bg-white hover:bg-emerald-50 active:bg-emerald-100 p-4 rounded-xl flex items-center justify-between transition-all duration-200 shadow-lg animate-slide-up"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
            >
              <div className="text-left">
                <span className="block font-bold text-gray-800 text-lg group-hover:text-emerald-700">{lang.label}</span>
                <span className="text-xs text-gray-400 font-medium">{lang.sub}</span>
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-gray-100 flex items-center justify-center text-gray-300 group-hover:border-emerald-500 group-hover:text-emerald-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12l5 5L20 7" /></svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const SettingsView: React.FC<{ user: UserProfile, onUpdateUser: (u: UserProfile) => void, onBack: () => void }> = ({ user, onUpdateUser, onBack }) => {
  const t = TRANSLATIONS[user.language];

  return (
    <div className="pb-24 px-6 pt-12 min-h-screen bg-surface">
      <Header title={t.settings} onBack={onBack} />

      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200 mb-6">
        <h3 className="font-bold text-gray-800 mb-4">{t.updateProfile}</h3>
        <div className="space-y-4">
           <div>
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Name</label>
             <input 
               type="text" 
               value={user.name} 
               onChange={(e) => onUpdateUser({...user, name: e.target.value})}
               className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-800 outline-none focus:border-primary"
             />
           </div>
        </div>
      </div>

      <h3 className="font-bold text-gray-900 mb-4 ml-2">{t.changeLang}</h3>
      <div className="space-y-3">
        {LANGUAGES_LIST.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onUpdateUser({...user, language: lang.code as LanguageCode})}
            className={`w-full p-4 rounded-xl flex items-center justify-between transition-all duration-200 shadow-sm border ${
              user.language === lang.code 
              ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' 
              : 'bg-white border-gray-100 hover:bg-gray-50'
            }`}
          >
            <div className="text-left">
              <span className={`block font-bold ${user.language === lang.code ? 'text-emerald-900' : 'text-gray-800'}`}>{lang.label}</span>
              <span className="text-xs text-gray-400 font-medium">{lang.sub}</span>
            </div>
            {user.language === lang.code && (
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12l5 5L20 7" /></svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const AuthView: React.FC<{ lang: LanguageCode, onLogin: (u: UserProfile) => void }> = ({ lang, onLogin }) => {
  const t = TRANSLATIONS[lang];
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [showOtpToast, setShowOtpToast] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = () => {
    setError('');
    
    // Validation
    if (authMode === 'register') {
      if (!name || name.length <= 6) {
        setError(t.errorNameShort);
        return;
      }
    }
    
    if (!phone || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      setError(t.errorPhoneInvalid);
      return;
    }

    // Check Existence
    const existingUser = findUserByPhone(phone);
    if (authMode === 'register' && existingUser) {
      setError(t.errorUserExists);
      return;
    }
    if (authMode === 'login' && !existingUser) {
      setError(t.errorUserNotFound);
      return;
    }

    setLoading(true);

    // Generate OTP
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    
    // Simulate SMS / Network
    setTimeout(() => {
        setLoading(false);
        setStep('otp');
        setShowOtpToast(code);
    }, 1000);
  };

  const handleVerifyOtp = () => {
    setLoading(true);
    setTimeout(() => {
        setLoading(false);
        if (otp === generatedOtp) {
            setShowOtpToast(null);
            if (authMode === 'register') {
                const newUser: UserProfile = { name, phone, language: lang };
                if (registerNewUser(newUser)) {
                onLogin(newUser);
                } else {
                    setError("Registration failed.");
                }
            } else {
                const existingUser = findUserByPhone(phone);
                if (existingUser) {
                    onLogin({...existingUser, language: lang}); // Update lang to current selection
                }
            }
        } else {
            setError(t.errorOtpInvalid);
        }
    }, 800);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden bg-slate-50">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700"></div>
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-lime-400 rounded-full blur-[100px] opacity-30 animate-pulse-slow"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-300 rounded-full blur-[100px] opacity-20 animate-pulse-slow" style={{animationDelay: '1s'}}></div>

      {/* Simulated SMS Notification */}
      {showOtpToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-gray-900/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-4 animate-slide-up border border-gray-700">
           <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shrink-0">
             <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
           </div>
           <div className="flex-1">
             <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">New Message</p>
             <p className="text-sm font-medium">Your OTP is <span className="font-mono text-lg font-bold text-green-400 tracking-widest">{showOtpToast}</span></p>
           </div>
           <button onClick={() => setShowOtpToast(null)} className="text-gray-500 hover:text-white">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
      )}

      {/* Main Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-emerald-900/20 overflow-hidden relative z-10 animate-slide-up">
        
        {/* Decorative Header Area */}
        <div className="h-28 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#059669 1px, transparent 1px)', backgroundSize: '16px 16px'}}></div>
             <div className="text-center relative z-10">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-lg mx-auto mb-2 flex items-center justify-center text-emerald-600 transform -rotate-3">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h1 className="font-extrabold text-emerald-900 text-lg tracking-tight">AgriVision AI</h1>
             </div>
        </div>

        <div className="p-8 pt-6">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                {step === 'otp' ? 'Verification' : (authMode === 'login' ? 'Welcome Back' : 'Join Us')}
            </h2>
            <p className="text-gray-500 text-sm mb-6 font-medium">
                {step === 'otp' ? `Enter the code sent to +91 ${phone}` : (authMode === 'login' ? 'Enter your details to access dashboard.' : 'Start your smart farming journey today.')}
            </p>

            {step === 'input' && (
                <div className="relative flex bg-gray-100 rounded-xl p-1 mb-8">
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-spring ${authMode === 'login' ? 'left-1' : 'left-[calc(50%+4px)]'}`}></div>
                    <button 
                        onClick={() => { setAuthMode('login'); setStep('input'); setError(''); }} 
                        className={`flex-1 relative z-10 py-2.5 text-sm font-bold transition-colors ${authMode === 'login' ? 'text-emerald-900' : 'text-gray-500'}`}
                    >
                        Login
                    </button>
                    <button 
                        onClick={() => { setAuthMode('register'); setStep('input'); setError(''); }} 
                        className={`flex-1 relative z-10 py-2.5 text-sm font-bold transition-colors ${authMode === 'register' ? 'text-emerald-900' : 'text-gray-500'}`}
                    >
                        Register
                    </button>
                </div>
            )}

            {step === 'input' ? (
                <div className="space-y-5">
                {authMode === 'register' && (
                    <div className="group">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block ml-1">{t.namePlaceholder}</label>
                        <div className="relative">
                            <div className="absolute left-4 top-3.5 text-gray-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <input 
                                type="text" 
                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-semibold text-gray-800 placeholder-gray-300"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Rahul Kumar"
                            />
                        </div>
                    </div>
                )}

                <div className="group">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block ml-1">{t.phonePlaceholder}</label>
                    <div className="relative">
                        <div className="absolute left-4 top-3.5 text-gray-500 font-bold border-r border-gray-300 pr-3 flex items-center gap-1">
                             <img src="https://flagcdn.com/w20/in.png" alt="IN" className="w-4 rounded-sm" />
                             +91
                        </div>
                        <input 
                            type="tel" 
                            maxLength={10}
                            className="w-full pl-[5.5rem] pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-semibold text-gray-800 tracking-widest placeholder-gray-300"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g,''))}
                            placeholder="0000000000"
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl animate-fade-in">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        {error}
                    </div>
                )}

                <Button onClick={handleSendOtp} fullWidth className="py-4 shadow-lg shadow-emerald-500/30 rounded-2xl text-lg mt-2" disabled={loading}>
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                            Sending...
                        </div>
                    ) : t.sendOtp}
                </Button>
                </div>
            ) : (
                <div className="space-y-6 animate-slide-up">
                    <div className="flex justify-center my-4">
                        <input 
                            type="text" 
                            maxLength={4}
                            autoFocus
                            className="w-full p-4 text-center text-4xl tracking-[0.5em] bg-white border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-gray-800 shadow-inner"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g,''))}
                            placeholder="••••"
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-xl">{error}</p>
                    )}

                    <Button onClick={handleVerifyOtp} fullWidth className="py-4 shadow-lg shadow-emerald-500/30 rounded-2xl text-lg" disabled={loading}>
                        {loading ? 'Verifying...' : t.verifyOtp}
                    </Button>

                    <div className="text-center pt-2">
                        <button onClick={() => {setStep('input'); setLoading(false);}} className="text-sm font-bold text-gray-400 hover:text-emerald-600 transition-colors">
                            Wrong number? <span className="underline">Change</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      <p className="absolute bottom-6 text-emerald-800/60 text-xs font-medium">
        &copy; {new Date().getFullYear()} AgriVision AI
      </p>
    </div>
  );
};

const HomeView: React.FC<{ lang: LanguageCode, user: UserProfile, setView: (v: string) => void }> = ({ lang, user, setView }) => {
  const t = TRANSLATIONS[lang];
  const [tips, setTips] = useState<WeatherTip[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(true);
  const [locError, setLocError] = useState(false);

  // Helper to load default tips if everything else fails
  const fetchDefaultData = async (location: string = "India") => {
    try {
      const defaultTips = await generateAdvisory("Current Season", location, lang);
      setTips(defaultTips);
    } catch (e) {
      console.error("Default data fetch failed", e);
    } finally {
      setLoadingLoc(false);
    }
  };

  const requestLocation = () => {
    setLoadingLoc(true);
    setLocError(false);
    setWeather(null);
    
    if (!navigator.geolocation) {
      setLocError(true);
      fetchDefaultData();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let locationName = "Your Location";
        
        // 1. Get Location Name
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
            headers: { 'Accept-Language': 'en' }
          });
          if (geoRes.ok) {
              const geoData = await geoRes.json();
              const address = geoData.address;
              const city = address?.city || address?.town || address?.village || address?.county || address?.state_district;
              const state = address?.state;
              if (city) locationName = `${city}, ${state || ''}`;
              else if (state) locationName = state;
          }
        } catch (geoError) {
          console.warn("Geocoding fetch failed.", geoError);
        }

        // 2. Get Weather Data
        try {
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`);
            if (weatherRes.ok) {
                const weatherData = await weatherRes.json();
                setWeather({
                  temp: weatherData.current.temperature_2m,
                  humidity: weatherData.current.relative_humidity_2m,
                  windSpeed: weatherData.current.wind_speed_10m,
                  conditionCode: weatherData.current.weather_code,
                  locationName: locationName
                });
            }
        } catch (weatherError) {
             console.error("Weather fetch failed", weatherError);
        }

        // 3. Get AI Advisory
        await fetchDefaultData(locationName);
      },
      (error) => {
        console.warn("Location denied/error", error);
        setLocError(true);
        fetchDefaultData();
      },
      { timeout: 15000, enableHighAccuracy: false }
    );
  };

  useEffect(() => {
    // Delay slightly to ensure view is mounted and ready for permission prompt
    const timer = setTimeout(() => {
        requestLocation();
    }, 500);
    return () => clearTimeout(timer);
  }, [lang]);

  const weatherCondition = weather ? getWeatherConditionText(weather.conditionCode, t) : { text: '--', icon: null };

  return (
    <div className="pb-24 px-6 pt-12 min-h-screen bg-surface">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 p-0.5 shadow-md">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-emerald-700 font-bold text-xl">
              {user.name[0]}
            </div>
          </div>
          <div>
            <p className="text-gray-500 font-medium text-sm">Welcome Back,</p>
            <h1 className="text-xl font-bold text-gray-900">{user.name.split(' ')[0]}</h1>
          </div>
        </div>
        
        {/* Settings Button */}
        <button 
          onClick={() => setView('settings')}
          className="p-3 rounded-2xl bg-white text-gray-500 shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
      </div>

      {/* Weather Card */}
      <div className="mb-8 rounded-[2rem] bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden transition-all duration-300">
         <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
         <div className="absolute bottom-[-10px] left-[20%] w-20 h-20 bg-white/10 rounded-full blur-xl"></div>

         <div className="relative z-10">
            {locError ? (
                <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <h3 className="font-bold text-lg mb-1">Enable Location</h3>
                    <p className="text-blue-100 text-sm mb-5 max-w-[220px] leading-relaxed opacity-90">
                      Get accurate weather forecasts and advisory for your farm.
                    </p>
                    <button 
                        onClick={requestLocation}
                        className="bg-white text-blue-600 px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-50 transition-all active:scale-95 flex items-center gap-2"
                    >
                        Allow Access
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                </div>
            ) : (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
                        <svg className="w-3.5 h-3.5 text-white/90" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                        <span className="text-xs font-medium tracking-wide">
                          {loadingLoc ? t.locating : weather?.locationName || (weather ? "Unknown Location" : t.locating)}
                        </span>
                    </div>
                    <div className="text-xs font-medium bg-white/20 px-2 py-1 rounded-lg">Today</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                        <div className="text-5xl font-bold mb-1 tracking-tighter">
                          {weather ? Math.round(weather.temp) : '--'}°
                        </div>
                        <div className="text-blue-100 font-medium text-sm flex items-center gap-2">
                          {weatherCondition.text}
                        </div>
                    </div>
                    <div className="transform scale-125">
                      {loadingLoc ? (
                        <svg className="w-12 h-12 text-white/50 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                      ) : weatherCondition.icon}
                    </div>
                  </div>

                  {weather && (
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                          <div>
                            <div className="text-[10px] text-blue-200 uppercase font-bold">{t.humidity}</div>
                            <div className="text-sm font-semibold">{weather.humidity}%</div>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <div>
                            <div className="text-[10px] text-blue-200 uppercase font-bold">{t.wind}</div>
                            <div className="text-sm font-semibold">{weather.windSpeed} km/h</div>
                          </div>
                      </div>
                    </div>
                  )}
                </>
            )}
         </div>
      </div>

      {/* Action Cards */}
      <div 
        onClick={() => setView('detect')}
        className="group relative h-40 rounded-[2rem] bg-gradient-to-r from-emerald-800 to-emerald-900 p-6 flex flex-col justify-between overflow-hidden cursor-pointer shadow-xl shadow-emerald-900/20 transition-transform active:scale-[0.98] mb-8"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500 rounded-full blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
        <div className="relative z-10 flex justify-between items-start">
           <div>
             <div className="inline-flex items-center gap-2 bg-emerald-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold text-emerald-300 mb-2 border border-emerald-500/20">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
               AI Scanner
             </div>
             <h2 className="text-2xl font-bold text-white">{t.detect}</h2>
           </div>
           <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-full flex items-center justify-center text-white">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
           </div>
        </div>
        <p className="relative z-10 text-emerald-100/70 text-sm">Tap to analyze leaf health</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card onClick={() => setView('profit')} className="p-4 flex flex-col items-center text-center gap-2 bg-white">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">{t.profit}</h3>
          </div>
        </Card>
        
        <Card onClick={() => setView('history')} className="p-4 flex flex-col items-center text-center gap-2 bg-white">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
           <div>
            <h3 className="font-bold text-gray-800 text-sm">{t.history}</h3>
          </div>
        </Card>
      </div>

      <div>
        <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
          {t.weatherTips} 
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        </h3>
        <div className="space-y-3">
          {loadingLoc && !locError ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-center">
               <span className="text-sm text-gray-400 animate-pulse">Loading localized forecast...</span>
            </div>
          ) : tips.length > 0 ? tips.map((tip, idx) => (
            <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-4 items-start">
               <div className={`mt-1 p-1.5 rounded-lg shrink-0 ${tip.type === 'alert' ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-500'}`}>
                 {tip.type === 'alert' ? 
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> : 
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                 }
               </div>
               <div>
                 <h4 className="font-bold text-gray-800 text-sm">{tip.title}</h4>
                 <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tip.description}</p>
               </div>
            </div>
          )) : (
             <div className="bg-white p-4 rounded-2xl text-center text-gray-400 text-sm">
                No advisory available.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DetectView: React.FC<{ lang: LanguageCode, onBack: () => void }> = ({ lang, onBack }) => {
  const t = TRANSLATIONS[lang];
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiseaseResult | null>(null);
  const [activeTab, setActiveTab] = useState<'treatment' | 'about'>('treatment');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null); 
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const base64Data = image.split(',')[1];
      const data = await analyzePlantImage(base64Data, lang);
      setResult(data);
      if (data.isPlant) {
        saveScan({
          id: Date.now().toString(),
          timestamp: Date.now(),
          imageUrl: image, 
          result: data
        });
      }
    } catch (error) {
      alert("Analysis failed. Please try again or check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setLoading(false);
  };

  const handleShare = async () => {
    if (!result) return;
    
    const shareText = `AgriVision AI Diagnosis\n\n🌱 Plant: ${result.cropName}\n🩺 Condition: ${result.diseaseName}\n⚠️ Severity: ${result.severity}\n\nCheck this out!`;
    
    try {
      if (navigator.share) {
        let shareData: ShareData = {
          title: 'AgriVision Diagnosis',
          text: shareText,
        };

        // Try adding file
        if (image) {
            try {
                const res = await fetch(image);
                const blob = await res.blob();
                const file = new File([blob], "plant_diagnosis.jpg", { type: blob.type });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    shareData.files = [file];
                }
            } catch (e) {
                console.warn("Could not create file for sharing", e);
            }
        }
        
        await navigator.share(shareData);
      } else {
        alert("Sharing is not available on this device.");
      }
    } catch (error) {
        console.error("Error sharing:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onBack} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        {image && !loading && !result && (
           <button onClick={reset} className="text-white text-sm font-semibold bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">Retake</button>
        )}
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-gray-900">
        {image ? (
          <>
            <img src={image} className={`w-full h-full object-cover transition-all duration-700 ${result ? 'h-1/2 mt-[-50vh] rounded-b-[2rem]' : ''}`} alt="Preview" />
            
            {/* Scanning Overlay */}
            {loading && (
              <div className="absolute inset-0 z-10">
                <div className="absolute top-0 w-full h-1 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-scan z-20"></div>
                <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[2px] animate-pulse"></div>
                <div className="absolute bottom-20 left-0 right-0 text-center">
                  <span className="inline-block px-4 py-2 rounded-full bg-black/50 backdrop-blur-md text-white font-mono text-sm animate-bounce">
                    Identifying Plant...
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center p-8 w-full max-w-sm">
            <h3 className="text-white text-3xl font-bold mb-8">Detect Disease</h3>
            
            <div className="space-y-4">
              <button 
                onClick={() => cameraInputRef.current?.click()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white p-5 rounded-2xl flex items-center justify-center gap-4 shadow-lg shadow-emerald-500/30"
              >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div className="text-left">
                  <span className="block font-bold text-lg">{t.camera}</span>
                  <span className="text-emerald-100 text-xs">Take a new photo</span>
                </div>
              </button>

              <button 
                onClick={() => galleryInputRef.current?.click()}
                className="w-full bg-gray-800 hover:bg-gray-700 active:scale-95 transition-all text-white p-5 rounded-2xl flex items-center justify-center gap-4 shadow-lg"
              >
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                 <div className="text-left">
                  <span className="block font-bold text-lg">{t.gallery}</span>
                  <span className="text-gray-400 text-xs">Pick from gallery</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={cameraInputRef} 
        accept="image/*" 
        capture="environment"
        onChange={handleFileChange} 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={galleryInputRef} 
        accept="image/*" 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Identify Button */}
      {image && !loading && !result && (
        <div className="absolute bottom-10 left-6 right-6 z-20">
          <Button onClick={processImage} fullWidth className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-glow py-4 text-lg rounded-2xl">
            {t.detect}
          </Button>
        </div>
      )}

      {/* Result Bottom Sheet */}
      {result && (
        <div className="absolute inset-x-0 bottom-0 top-[35%] bg-surface rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-30 overflow-y-auto animate-slide-up no-scrollbar">
          <div className="sticky top-0 bg-surface z-10 pt-4 pb-2 px-6">
            <div className="absolute top-4 right-6">
               <button 
                  onClick={handleShare}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 active:scale-95"
                  title="Share Result"
               >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
               </button>
            </div>
            <div className="w-16 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>
            
            {/* Plant & Disease Header */}
            {result.isHealthy ? (
              // Healthy Header View
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 animate-pulse-slow">
                   <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h1 className="text-2xl font-extrabold text-emerald-800 leading-tight mb-1">{t.healthyTitle}</h1>
                <p className="text-gray-500 font-medium">{result.cropName} is looking great!</p>
              </div>
            ) : (
              // Disease Header View
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                       Detected Plant
                     </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    {result.cropName} 
                    {result.isPlant && <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                  </h3>
                  <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mt-1">{result.diseaseName}</h1>
                </div>
                
                <div className="flex flex-col items-end shrink-0 mr-8">
                   <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.severity}</span>
                      <span className={`text-sm font-black uppercase tracking-wide ${
                         result.severity === 'High' ? 'text-red-500' :
                         result.severity === 'Medium' ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {result.severity}
                      </span>
                   </div>
                   
                   {/* Visual Severity Meter */}
                   <div className="flex gap-1.5 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                      <div className={`w-8 h-2.5 rounded-sm transition-all duration-500 ${
                         ['Low', 'Medium', 'High'].includes(result.severity)
                         ? (result.severity === 'High' ? 'bg-red-500' : result.severity === 'Medium' ? 'bg-amber-400' : 'bg-emerald-500')
                         : 'bg-gray-200'
                      }`}></div>
                      
                      <div className={`w-8 h-2.5 rounded-sm transition-all duration-500 ${
                         ['Medium', 'High'].includes(result.severity)
                         ? (result.severity === 'High' ? 'bg-red-500' : 'bg-amber-400')
                         : 'bg-gray-200'
                      }`}></div>
                      
                      <div className={`w-8 h-2.5 rounded-sm transition-all duration-500 ${
                         result.severity === 'High'
                         ? 'bg-red-500'
                         : 'bg-gray-200'
                      }`}></div>
                   </div>
                </div>
              </div>
            )}

            {/* Tabs (Only show if not healthy) */}
            {!result.isHealthy && (
              <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                <button 
                  onClick={() => setActiveTab('treatment')}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'treatment' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                >
                  Solution
                </button>
                <button 
                  onClick={() => setActiveTab('about')}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'about' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                >
                  Details
                </button>
              </div>
            )}
          </div>

          <div className="px-6 pb-24 space-y-6 animate-fade-in">
            {result.isHealthy ? (
               // Healthy Content
               <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
                  <h4 className="font-bold text-emerald-900 mb-4 flex items-center gap-2 text-lg">
                    {t.careTips}
                  </h4>
                  <ul className="space-y-4">
                    {result.prevention.length > 0 ? result.prevention.map((item, i) => (
                      <li key={i} className="flex gap-4 text-emerald-800 text-sm font-medium items-start">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 text-xs font-bold">
                          {i + 1}
                        </div>
                        {item}
                      </li>
                    )) : (
                      <li className="text-emerald-700 italic">Keep monitoring water and sunlight levels.</li>
                    )}
                  </ul>
               </div>
            ) : (
              // Disease Content
              activeTab === 'treatment' ? (
                <>
                   <div className="space-y-4">
                     <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <h4 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
                          <span className="text-xl">🌿</span> {t.organic}
                        </h4>
                        <ul className="space-y-3">
                          {result.organicTreatment.map((item, i) => (
                            <li key={i} className="flex gap-3 text-emerald-800 text-sm font-medium">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                     </div>

                     <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                        <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                          <span className="text-xl">🧪</span> {t.chemical}
                        </h4>
                        <ul className="space-y-3">
                          {result.chemicalTreatment.map((item, i) => (
                            <li key={i} className="flex gap-3 text-blue-800 text-sm font-medium">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                     </div>
                   </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-6">
                  <div>
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Causes</h5>
                    <p className="text-gray-700 text-sm leading-relaxed">{result.causes.join('. ')}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Prevention</h5>
                    <ul className="space-y-2">
                      {result.prevention.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-700">
                          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ProfitView: React.FC<{ lang: LanguageCode, onBack: () => void }> = ({ lang, onBack }) => {
  const t = TRANSLATIONS[lang];
  const [inputs, setInputs] = useState({ investment: '', revenue: '' });
  const [result, setResult] = useState<ProfitCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);

  const calculate = () => {
    setCalculating(true);
    setTimeout(() => {
      const inv = parseFloat(inputs.investment) || 0;
      const rev = parseFloat(inputs.revenue) || 0;
      const profit = rev - inv;
      setResult({
        totalInvestment: inv,
        expectedRevenue: rev,
        estimatedProfit: profit,
        profitPerAcre: profit, // Simplified for demo
        roi: inv > 0 ? (profit / inv) * 100 : 0
      });
      setCalculating(false);
    }, 1000);
  };

  return (
    <div className="pb-24 px-6 pt-12 min-h-screen bg-surface">
      <Header title={t.profit} onBack={onBack} />
      
      <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200 mb-6">
        <h3 className="font-bold text-gray-800 mb-4">{t.inputs}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">{t.investment} (₹)</label>
            <input 
              type="number" 
              value={inputs.investment}
              onChange={(e) => setInputs({...inputs, investment: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-800 outline-none focus:border-primary"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">{t.revenue} (₹)</label>
            <input 
              type="number" 
              value={inputs.revenue}
              onChange={(e) => setInputs({...inputs, revenue: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-800 outline-none focus:border-primary"
              placeholder="0"
            />
          </div>
          <Button onClick={calculate} fullWidth disabled={calculating} className="mt-2">
            {calculating ? t.calculating : t.calculate}
          </Button>
        </div>
      </div>

      {result && (
        <div className="bg-emerald-900 text-white p-6 rounded-3xl shadow-xl animate-slide-up">
           <div className="text-center mb-6">
             <p className="text-emerald-200 text-sm font-medium uppercase tracking-wide">{t.netProfit}</p>
             <h2 className={`text-4xl font-bold mt-1 ${result.estimatedProfit >= 0 ? 'text-white' : 'text-red-300'}`}>
               ₹{result.estimatedProfit.toLocaleString()}
             </h2>
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
               <p className="text-xs text-emerald-200 mb-1">ROI</p>
               <p className="font-bold text-xl">{result.roi.toFixed(1)}%</p>
             </div>
             <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
               <p className="text-xs text-emerald-200 mb-1">Margin</p>
               <p className="font-bold text-xl">{((result.estimatedProfit / result.expectedRevenue) * 100).toFixed(1)}%</p>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

const HistoryView: React.FC<{ lang: LanguageCode, onBack: () => void }> = ({ lang, onBack }) => {
  const t = TRANSLATIONS[lang];
  const history = getHistory();

  return (
    <div className="pb-24 px-6 pt-12 min-h-screen bg-surface">
      <Header title={t.history} onBack={onBack} />
      
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center opacity-50">
          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-gray-500 font-medium">{t.noHistory}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((scan) => (
            <div key={scan.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center">
               <img src={scan.imageUrl} alt="Scan" className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
               <div className="flex-1">
                 <h4 className="font-bold text-gray-900">{scan.result.cropName}</h4>
                 <p className={`text-sm font-medium ${scan.result.isHealthy ? 'text-emerald-600' : 'text-red-500'}`}>
                   {scan.result.diseaseName}
                 </p>
                 <p className="text-xs text-gray-400 mt-1">{new Date(scan.timestamp).toLocaleDateString()}</p>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState('language'); 
  const [lang, setLang] = useState<LanguageCode>('en');
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Check for saved user on load
    const savedUser = getUser();
    if (savedUser) {
      setUser(savedUser);
      setLang(savedUser.language);
      setView('home');
    }
  }, []);

  const handleLanguageSelect = (l: LanguageCode) => {
    setLang(l);
    setView('auth');
  };

  const handleLogin = (u: UserProfile) => {
    setUser(u);
    saveUser(u);
    setView('home');
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    saveUser(updatedUser);
    setLang(updatedUser.language);
  };

  if (view === 'language') return <LanguageView onSelect={handleLanguageSelect} />;
  if (view === 'auth') return <AuthView lang={lang} onLogin={handleLogin} />;
  if (!user) return null; // Should not happen

  return (
    <>
      {view === 'home' && <HomeView lang={lang} user={user} setView={setView} />}
      {view === 'detect' && <DetectView lang={lang} onBack={() => setView('home')} />}
      {view === 'profit' && <ProfitView lang={lang} onBack={() => setView('home')} />}
      {view === 'history' && <HistoryView lang={lang} onBack={() => setView('home')} />}
      {view === 'settings' && <SettingsView user={user} onUpdateUser={handleUpdateUser} onBack={() => setView('home')} />}
      
      {/* NavBar is only visible on main views */}
      {['home', 'profit', 'history'].includes(view) && (
        <NavBar currentView={view} setView={setView} lang={lang} />
      )}
    </>
  );
}
