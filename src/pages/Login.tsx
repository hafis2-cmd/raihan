import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, 
  User, 
  Loader2, 
  Mail, 
  Lock, 
  ArrowRight,
  AlertCircle,
  Phone,
  Calendar
} from 'lucide-react';

export default function Login() {
  const { loginWithEmail, signupWithEmail, user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Public Patient Registration & Common Login Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  
  const [error, setError] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (authMode === 'login') {
        // Unified login: Both Dentists and Patients log in here.
        // Role is determined strictly by the database account record.
        await loginWithEmail(email, password);
      } else if (authMode === 'signup') {
        // Public registration: Strictly for Patients only.
        // Public users cannot register as Dentists.
        if (!name.trim()) {
          setError('Please enter your full name.');
          setIsSubmitting(false);
          return;
        }

        await signupWithEmail(email, password, name, 'Patient', {
          phone,
          dob,
          gender
        });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your details.');
      setIsSubmitting(false);
    }
  };

  if (user && profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-600">Loading your clinic dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Background ambient accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white/20 max-w-lg w-full relative z-10"
      >
        <div className="flex flex-col items-center text-center space-y-5">
          {/* Logo icon */}
          <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-200 rotate-3">
            <Activity className="w-8 h-8 text-white" />
          </div>
          
          {/* Interface Heading & Description */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-snug uppercase">
              RAIHAN – DENTAL CLINIC MANAGEMENT SYSTEM
            </h1>
            <p className="text-slate-500 font-medium text-xs sm:text-sm max-w-sm mx-auto">
              {authMode === 'login'
                ? "Welcome back! Sign in to access your dental clinic account."
                : "Create your patient account to access dental appointments, consultations, prescriptions, and treatment records."}
            </p>
          </div>

          <div className="w-full space-y-4 pt-1">
            {/* Form Toggle: Sign In vs Patient Registration */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(''); }}
                className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${authMode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setError(''); }}
                className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${authMode === 'signup' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Patient Sign Up
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="w-full space-y-4 text-left">
              {error && (
                <div className="p-4 bg-rose-50 text-rose-600 text-xs sm:text-sm font-medium rounded-2xl border border-rose-100 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Patient Name (Sign Up only) */}
              {authMode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                    Patient Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                      placeholder="e.g. Johnathan Smith"
                    />
                  </div>
                </div>
              )}

              {/* Email Address (Common) */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {/* Password (Common) */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              {/* Patient Additional Fields: Phone, DOB, Gender (Sign Up only) */}
              {authMode === 'signup' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                        Gender
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                        className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 disabled:opacity-50 cursor-pointer text-sm mt-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
                {authMode === 'login' ? 'Sign In to Portal' : 'Register New Account'}
              </button>

              {/* Mode switch helper link */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    setError('');
                  }}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  {authMode === 'login' 
                    ? "New patient? Create your patient account" 
                    : "Already registered? Sign In to your account"}
                </button>
              </div>
            </form>
          </div>

          <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
            Dentist accounts are securely provisioned by clinic administration. Contact management for credential access.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
