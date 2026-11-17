import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAIL } from '../constants';
import { 
  LogIn, 
  Shield, 
  Activity, 
  Heart, 
  Stethoscope, 
  User, 
  UserPlus, 
  Loader2, 
  Mail, 
  Lock, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export default function Login() {
  const { login, loginAsDemo, isFirebaseConfigured, loginWithEmail, signupWithEmail, user, profile, updateRole, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'Patient' | 'Doctor' | 'Dentist' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<'google' | 'login' | 'signup'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleDemoAccess = async (role: 'Doctor' | 'Dentist' | 'Patient') => {
    setIsSubmitting(true);
    setError('');
    try {
      await loginAsDemo(role);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSetup = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const finalRole = selectedRole === 'Doctor' ? 'Dentist' : selectedRole;
      if (!finalRole) {
        setError('Please select your role');
        setIsSubmitting(false);
        return;
      }
      await updateRole(finalRole as 'Patient' | 'Dentist');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to complete setup. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await login();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google login failed');
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else if (authMode === 'signup') {
        const finalRole = email === ADMIN_EMAIL ? 'Admin' : selectedRole;
        if (!finalRole) {
          setError('Please select a role');
          setIsSubmitting(false);
          return;
        }
        await signupWithEmail(email, password, name, finalRole as 'Patient' | 'Doctor' | 'Admin');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
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
    const isAdminEmail = user.email === ADMIN_EMAIL;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full text-center space-y-8"
        >
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-800">Welcome to Raihan Dental!</h2>
            <p className="text-slate-500 font-medium text-sm">
              Please select your role to access the dental portal.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {error && (
              <div className="col-span-2 p-4 bg-rose-50 text-rose-600 text-sm font-medium rounded-2xl border border-rose-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <button
              onClick={() => setSelectedRole('Dentist')}
              disabled={isSubmitting}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${selectedRole === 'Dentist' || selectedRole === 'Doctor' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedRole === 'Dentist' || selectedRole === 'Doctor' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <Stethoscope className="w-6 h-6" />
              </div>
              <span className="font-bold text-slate-700">Dentist</span>
            </button>

            <button
              onClick={() => setSelectedRole('Patient')}
              disabled={isSubmitting}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${selectedRole === 'Patient' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedRole === 'Patient' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <User className="w-6 h-6" />
              </div>
              <span className="font-bold text-slate-700">Patient</span>
            </button>
          </div>

          <button
            disabled={!selectedRole || isSubmitting}
            onClick={handleCompleteSetup}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Completing...
              </>
            ) : (
              'Enter Dental Portal'
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white/20 max-w-lg w-full relative z-10"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-200 rotate-3">
            <Activity className="w-10 h-10 text-white" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">Raihan Dental Clinic</h1>
            <p className="text-emerald-600 font-bold text-sm tracking-wide uppercase">Dental Clinic Management System</p>
          </div>

          <div className="w-full space-y-4">
            {authMode === 'google' ? (
              <div className="space-y-4 w-full">
                {error && (
                  <div className="p-4 bg-rose-50 text-rose-600 text-sm font-medium rounded-2xl border border-rose-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                <button
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 group disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      Continue with Google
                    </>
                  )}
                </button>
                <button
                  onClick={() => setAuthMode('login')}
                  className="w-full py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
                >
                  <Mail className="w-5 h-5" />
                  Continue with Email
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailAuth} className="w-full space-y-4 text-left">
                {error && (
                  <div className="p-4 bg-rose-50 text-rose-600 text-sm font-medium rounded-2xl border border-rose-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {authMode === 'signup' && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {authMode === 'signup' && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Select Role</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('Dentist')}
                        className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${selectedRole === 'Dentist' || selectedRole === 'Doctor' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                      >
                        Dentist
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRole('Patient')}
                        className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${selectedRole === 'Patient' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                      >
                        Patient
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                  {authMode === 'login' ? 'Sign In' : 'Create Account'}
                </button>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                    className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors text-center"
                  >
                    {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('google')}
                    className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors text-center"
                  >
                    Back to Google Login
                  </button>
                </div>
              </form>
            )}

            {/* Quick Instant Access for Dental Clinic Roles */}
            <div className="w-full pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Quick Clinic Access</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">Dental Demo</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleDemoAccess('Dentist')}
                  disabled={isSubmitting}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex items-center gap-3 group cursor-pointer text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 block">Dentist Access</span>
                    <span className="text-[10px] text-slate-400 font-medium">Dr. Raihan (BDS, MDS)</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoAccess('Patient')}
                  disabled={isSubmitting}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all flex items-center gap-3 group cursor-pointer text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 block">Patient Access</span>
                    <span className="text-[10px] text-slate-400 font-medium">John Doe</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-xs">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
