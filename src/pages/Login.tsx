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
  AlertCircle,
  Phone,
  Calendar,
  Building,
  Award
} from 'lucide-react';

const DENTAL_SPECIALTIES = [
  'General Dentistry',
  'Endodontics (Root Canal Specialist)',
  'Orthodontics (Braces & Aligners)',
  'Periodontics (Gum Care & Implants)',
  'Prosthodontics (Crowns & Bridges)',
  'Oral & Maxillofacial Surgery',
  'Pediatric Dentistry (Pedodontics)',
  'Cosmetic Dentistry & Whitening'
];

export default function Login() {
  const { isFirebaseConfigured, loginWithEmail, signupWithEmail, user, profile, updateRole, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'Patient' | 'Dentist'>('Patient');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Dentist-specific onboarding fields
  const [qualification, setQualification] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialty, setSpecialty] = useState('General Dentistry');
  const [clinicName, setClinicName] = useState('Raihan Dental Clinic');
  
  // Patient-specific onboarding fields
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  
  const [error, setError] = useState('');

  const handleCompleteSetup = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      if (!selectedRole) {
        setError('Please select your role');
        setIsSubmitting(false);
        return;
      }
      await updateRole(selectedRole);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to complete setup. Please try again.');
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
        if (!selectedRole) {
          setError('Please select a role (Dentist or Patient)');
          setIsSubmitting(false);
          return;
        }

        if (selectedRole === 'Dentist') {
          if (!qualification.trim()) {
            setError('Please enter your dental qualification (e.g. BDS, MDS, DDS)');
            setIsSubmitting(false);
            return;
          }
          if (!licenseNumber.trim()) {
            setError('Please enter your dental council registration number');
            setIsSubmitting(false);
            return;
          }
        }

        await signupWithEmail(email, password, name, selectedRole, {
          phone,
          qualification: selectedRole === 'Dentist' ? qualification : undefined,
          licenseNumber: selectedRole === 'Dentist' ? licenseNumber : undefined,
          specialty: selectedRole === 'Dentist' ? specialty : undefined,
          hospitalAffiliation: selectedRole === 'Dentist' ? clinicName : undefined,
          dob: selectedRole === 'Patient' ? dob : undefined,
          gender: selectedRole === 'Patient' ? gender : undefined
        });
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
              Please select your role to access the dental clinic portal.
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
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${selectedRole === 'Dentist' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedRole === 'Dentist' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
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
        className="bg-white/90 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white/20 max-w-lg w-full relative z-10"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-200 rotate-3">
            <Activity className="w-10 h-10 text-white" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">Raihan Dental Clinic</h1>
            <p className="text-emerald-600 font-bold text-xs sm:text-sm tracking-wide uppercase">Dental Clinic Management System</p>
          </div>

          <div className="w-full space-y-4">
            {/* Form Toggle */}
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
                Create Account
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="w-full space-y-4 text-left">
              {error && (
                <div className="p-4 bg-rose-50 text-rose-600 text-sm font-medium rounded-2xl border border-rose-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {authMode === 'signup' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Account Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('Dentist')}
                      className={`py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${selectedRole === 'Dentist' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                    >
                      <Stethoscope className="w-4 h-4" />
                      Dentist
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('Patient')}
                      className={`py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${selectedRole === 'Patient' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                    >
                      <User className="w-4 h-4" />
                      Patient
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'signup' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    {selectedRole === 'Dentist' ? 'Dentist Full Name' : 'Patient Full Name'}
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                      placeholder={selectedRole === 'Dentist' ? 'Dr. Sarah Connor' : 'Johnathan Smith'}
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
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                    placeholder="name@example.com"
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
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              {authMode === 'signup' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              )}

              {/* Dentist-Specific Registration Details */}
              {authMode === 'signup' && selectedRole === 'Dentist' && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Qualification</label>
                      <input
                        type="text"
                        required
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        placeholder="e.g. BDS, MDS, DDS"
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Reg / License No.</label>
                      <input
                        type="text"
                        required
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="e.g. DDC-98421"
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Specialization</label>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {DENTAL_SPECIALTIES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 font-medium">
                    Note: Newly registered dentists enter with verification status pending credential confirmation.
                  </div>
                </div>
              )}

              {/* Patient-Specific Registration Details */}
              {authMode === 'signup' && selectedRole === 'Patient' && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Date of Birth</label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 disabled:opacity-50 cursor-pointer text-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
                {authMode === 'login' ? 'Sign In to Portal' : 'Register New Account'}
              </button>

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
                    ? "New to Raihan Dental Clinic? Create an Account" 
                    : "Already registered? Sign In to your account"}
                </button>
              </div>
            </form>
          </div>

          <p className="text-[11px] text-slate-400 max-w-xs">
            Raihan Dental Clinic System • Protected Health Information
          </p>
        </div>
      </motion.div>
    </div>
  );
}
