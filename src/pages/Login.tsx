import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { 
  Stethoscope, 
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
        await loginWithEmail(email, password);
      } else if (authMode === 'signup') {
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
      setError(err.message || 'Authentication failed. Please check your credentials.');
      setIsSubmitting(false);
    }
  };

  if (user && profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Loading clinic account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full relative z-10"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          
          {/* Logo icon */}
          <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-xs">
            <Stethoscope className="w-6 h-6" />
          </div>
          
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Raihan Dental Clinic
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              {authMode === 'login'
                ? "Sign in to access your dental consultations, appointments, and prescriptions."
                : "Register a patient account to request visits and track dental care records."}
            </p>
          </div>

          <div className="w-full space-y-4 pt-1">
            {/* Form Toggle */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(''); }}
                className={`py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  authMode === 'login' 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setError(''); }}
                className={`py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  authMode === 'signup' 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Patient Sign Up
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="w-full space-y-3.5 text-left">
              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-xl border border-rose-200 dark:border-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Patient Name (Sign Up only) */}
              {authMode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Patient Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none text-xs transition-colors"
                      placeholder="e.g. Johnathan Smith"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none text-xs transition-colors"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none text-xs transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Patient Fields for Sign Up */}
              {authMode === 'signup' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none text-xs transition-colors"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Gender
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer text-xs"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  <span>{authMode === 'login' ? 'Sign In' : 'Register Patient Account'}</span>
                </button>
              </div>

              {/* Switch link */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    setError('');
                  }}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {authMode === 'login' 
                    ? "New patient? Register your account" 
                    : "Already registered? Sign in to your account"}
                </button>
              </div>
            </form>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
            Dentist accounts are authorized and provisioned by clinic administration.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
