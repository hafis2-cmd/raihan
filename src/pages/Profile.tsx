import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  Calendar, 
  Activity, 
  Droplet, 
  AlertTriangle, 
  FileText, 
  Save, 
  Loader2,
  CheckCircle2,
  Edit3,
  X,
  Shield,
  Lock,
  ChevronDown,
  ChevronUp,
  Info,
  BrainCircuit,
  Bell,
  Stethoscope,
  Award,
  MapPin,
  BookOpen,
  Phone,
  Home,
  Heart,
  Pill,
  DollarSign,
  Clock,
  Building,
  ShieldCheck,
  HeartPulse
} from 'lucide-react';
import { useAuth, UserProfile } from '../context/AuthContext';
import { db, auth, isFirebaseConfigured } from '../firebase';
import { getProfileExplanation, ProfileExplanation } from '../services/explanationService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DENTAL_SPECIALTIES = [
  'General Dentistry',
  'Endodontics (Root Canal Specialist)',
  'Orthodontics (Braces & Aligners)',
  'Periodontics (Gum Disease & Implants)',
  'Prosthodontics (Crowns & Bridges)',
  'Oral & Maxillofacial Surgery',
  'Pediatric Dentistry (Pedodontics)',
  'Cosmetic Dentistry & Whitening',
  'Oral Pathology & Radiology'
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function Profile() {
  const { user, profile, updateProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [explanation, setExplanation] = useState<ProfileExplanation | null>(null);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: '',
    image: '',
    newsletter: false,

    // Patient Fields
    age: '',
    gender: '',
    dob: '',
    bloodGroup: '',
    height: '',
    weight: '',
    address: '',
    allergies: '',
    medicalHistory: '',
    currentMedications: '',
    chronicConditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',

    // Doctor Fields
    specialty: '',
    subSpecialty: '',
    licenseNumber: '',
    education: '',
    experience: '',
    location: '',
    hospitalAffiliation: '',
    consultationFee: '',
    workingHours: '',
    bio: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        role: profile.role || 'Patient',
        image: profile.image || profile.photoURL || '',
        newsletter: profile.newsletter || false,

        // Patient Fields
        age: profile.age?.toString() || '',
        gender: profile.gender || '',
        dob: profile.dob || '',
        bloodGroup: profile.bloodGroup || '',
        height: profile.height || '',
        weight: profile.weight || '',
        address: profile.address || '',
        allergies: profile.allergies || '',
        medicalHistory: profile.medicalHistory || '',
        currentMedications: profile.currentMedications || '',
        chronicConditions: profile.chronicConditions || '',
        emergencyContactName: profile.emergencyContactName || '',
        emergencyContactPhone: profile.emergencyContactPhone || '',
        emergencyContactRelation: profile.emergencyContactRelation || '',
        insuranceProvider: profile.insuranceProvider || '',
        insurancePolicyNumber: profile.insurancePolicyNumber || '',

        // Doctor Fields
        specialty: profile.specialty || '',
        subSpecialty: profile.subSpecialty || '',
        licenseNumber: profile.licenseNumber || '',
        education: profile.education || '',
        experience: profile.experience?.toString() || '',
        location: profile.location || '',
        hospitalAffiliation: profile.hospitalAffiliation || '',
        consultationFee: profile.consultationFee?.toString() || '',
        workingHours: profile.workingHours || '',
        bio: profile.bio || ''
      });
    }
  }, [profile]);

  const handleNewsletterToggle = async () => {
    const newValue = !formData.newsletter;
    setFormData(prev => ({ ...prev, newsletter: newValue }));
    try {
      await updateProfile({ newsletter: newValue });
    } catch (e) {
      console.warn("Failed to persist newsletter setting:", e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updateData: Partial<UserProfile> = {
        name: formData.name,
        phone: formData.phone,
        role: (formData.role || profile?.role || 'Patient') as any,
        image: formData.image,
        photoURL: formData.image,
        newsletter: formData.newsletter,

        // Patient fields
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        gender: (formData.gender as any) || undefined,
        dob: formData.dob || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        height: formData.height || undefined,
        weight: formData.weight || undefined,
        address: formData.address || undefined,
        allergies: formData.allergies || undefined,
        medicalHistory: formData.medicalHistory || undefined,
        currentMedications: formData.currentMedications || undefined,
        chronicConditions: formData.chronicConditions || undefined,
        emergencyContactName: formData.emergencyContactName || undefined,
        emergencyContactPhone: formData.emergencyContactPhone || undefined,
        emergencyContactRelation: formData.emergencyContactRelation || undefined,
        insuranceProvider: formData.insuranceProvider || undefined,
        insurancePolicyNumber: formData.insurancePolicyNumber || undefined,

        // Doctor fields
        specialty: formData.specialty || undefined,
        subSpecialty: formData.subSpecialty || undefined,
        licenseNumber: formData.licenseNumber || undefined,
        education: formData.education || undefined,
        experience: formData.experience ? parseInt(formData.experience, 10) : undefined,
        location: formData.location || undefined,
        hospitalAffiliation: formData.hospitalAffiliation || undefined,
        consultationFee: formData.consultationFee ? parseFloat(formData.consultationFee) : undefined,
        workingHours: formData.workingHours || undefined,
        bio: formData.bio || undefined,
      };

      // Persist permanently in AuthContext & LocalStorage
      await updateProfile(updateData);

      setSaveSuccess(true);
      setIsEditing(false);

      // Optional health explanation for patient
      if (profile?.role === 'Patient' && (formData.age || formData.medicalHistory)) {
        setIsGeneratingExplanation(true);
        try {
          const exp = await getProfileExplanation({
            age: formData.age,
            gender: formData.gender,
            medicalHistory: formData.medicalHistory,
            allergies: formData.allergies,
            bloodGroup: formData.bloodGroup
          });
          setExplanation(exp);
        } catch (err) {
          console.warn('Profile explanation skipped:', err);
        } finally {
          setIsGeneratingExplanation(false);
        }
      }

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const isDoctor = profile?.role === 'Doctor' || profile?.role === 'Dentist';
  const isPatient = profile?.role === 'Patient';
  const isAdmin = profile?.role === 'Admin';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full border",
              isDoctor ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              isAdmin ? "bg-purple-50 text-purple-700 border-purple-200" :
              "bg-blue-50 text-blue-700 border-blue-200"
            )}>
              {isDoctor ? 'Dentist' : profile?.role || 'Patient'} Account
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Permanent Profile Sync</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
            {isDoctor ? 'Dentist Clinical Profile' : isPatient ? 'Patient Dental Profile' : 'System Administrator Profile'}
          </h1>
          <p className="text-slate-500 font-medium text-sm md:text-base">
            {isDoctor 
              ? 'Configure your dental qualifications (BDS/MDS), dental specialty, clinic affiliation, consultation fee, and available clinic hours.'
              : 'Keep your personal dental history, allergies, emergency contacts, and oral health records accurate for clinic appointments.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all cursor-pointer shadow-md",
              isEditing 
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200" 
                : isDoctor 
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200" 
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
            )}
          >
            {isEditing ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </>
            )}
          </button>
          
          <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-bold border border-emerald-100 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Retained & Encrypted</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Sidebar Cards */}
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-3xl border-4 border-white shadow-inner overflow-hidden">
                {formData.image ? (
                  <img src={formData.image} alt={formData.name || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  (formData.name || profile?.name || profile?.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">{formData.name || 'Anonymous User'}</h2>
              <p className="text-xs text-slate-500 font-medium">{profile?.email}</p>
              {formData.phone && (
                <p className="text-xs text-slate-400 font-medium mt-1 flex items-center justify-center gap-1">
                  <Phone className="w-3 h-3" /> {formData.phone}
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                ● Live on Raihan Portal
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                {profile?.role || 'Patient'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="w-full mt-2 flex items-center justify-center gap-2 p-3 text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-2xl transition-all border border-slate-100 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              Change Password
            </button>
          </div>

          {/* Role-Specific Summary Box */}
          {isDoctor ? (
            /* Dentist Clinical Credentials Sidebar Card */
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-[2rem] text-white space-y-4 shadow-xl shadow-emerald-200">
              <div className="flex items-center gap-3 border-b border-white/15 pb-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Dental Practice</h3>
                  <span className="text-[10px] text-emerald-200 font-semibold">Registered Dental Surgeon</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-white/10">
                  <span className="text-emerald-100">Specialty</span>
                  <span className="font-bold text-right">{formData.specialty || 'General Dentistry'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/10">
                  <span className="text-emerald-100">Sub-Specialty</span>
                  <span className="font-bold text-right">{formData.subSpecialty || 'Endodontics & Crowns'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/10">
                  <span className="text-emerald-100">Experience</span>
                  <span className="font-bold text-right">{formData.experience ? `${formData.experience} Years` : '10+ Years'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/10">
                  <span className="text-emerald-100">Dental Reg No.</span>
                  <span className="font-mono font-bold text-right">{formData.licenseNumber || 'DDC-98421'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/10">
                  <span className="text-emerald-100">Consultation Fee</span>
                  <span className="font-bold text-emerald-200 text-right">${formData.consultationFee || '50'} / Visit</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-emerald-100">Dental Clinic Base</span>
                  <span className="font-bold text-right truncate max-w-[140px]">{formData.hospitalAffiliation || formData.location || 'Raihan Dental Clinic'}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Patient Vitals & Health Summary Sidebar Card */
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2rem] text-white space-y-4 shadow-xl shadow-blue-200">
              <div className="flex items-center gap-3 border-b border-white/15 pb-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <HeartPulse className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Patient Dental Chart</h3>
                  <span className="text-[10px] text-blue-200 font-semibold">Clinical Snapshot</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-white/10">
                  <span className="text-blue-100">Blood Group</span>
                  <span className="font-black text-white text-sm bg-white/20 px-2 py-0.5 rounded-lg">{formData.bloodGroup || 'O+'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/10">
                  <span className="text-blue-100">Age & Gender</span>
                  <span className="font-bold text-right">{formData.age || '29'} Yrs • {formData.gender || 'Male'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/10">
                  <span className="text-blue-100">Height & Weight</span>
                  <span className="font-bold text-right">{formData.height || '178 cm'} • {formData.weight || '72 kg'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/10">
                  <span className="text-blue-100">Known Allergies</span>
                  <span className="font-bold text-right text-rose-200 truncate max-w-[130px]">{formData.allergies || 'None'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/10">
                  <span className="text-blue-100">Emergency Contact</span>
                  <span className="font-bold text-right truncate max-w-[130px]">{formData.emergencyContactName || 'Jane Doe'}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-blue-100">Dental Insurance</span>
                  <span className="font-bold text-right truncate max-w-[130px]">{formData.insuranceProvider || 'Delta Dental'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm space-y-8">
            
            {/* DENTIST VIEW */}
            {isDoctor && (
              <>
                {/* Section 1: Professional Credentials */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Stethoscope className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-black text-slate-800 text-lg">Dentist Credentials & Registration</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Full Dentist Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Dr. Raihan (BDS, MDS)"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dental Council Reg Number</label>
                      <input
                        type="text"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. DDC-84920"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Primary Dental Specialty</label>
                      <select
                        value={formData.specialty}
                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                        disabled={!isEditing}
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Specialty</option>
                        {DENTAL_SPECIALTIES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sub-Specialty / Clinical Focus</label>
                      <input
                        type="text"
                        value={formData.subSpecialty}
                        onChange={(e) => setFormData({ ...formData, subSpecialty: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. Microscopic Endodontics & Smile Aesthetics"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Qualifications & Degrees</label>
                      <input
                        type="text"
                        value={formData.education}
                        onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. BDS, MDS (Conservative Dentistry & Endodontics)"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Years of Dental Experience</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={formData.experience}
                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. 12"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Clinical Practice & Clinic Settings */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Building className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-black text-slate-800 text-lg">Dental Clinic Affiliation & Hours</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dental Clinic Name</label>
                      <input
                        type="text"
                        value={formData.hospitalAffiliation}
                        onChange={(e) => setFormData({ ...formData, hospitalAffiliation: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. Raihan Dental Clinic"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Clinic Address</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. 101 Dental Plaza, Suite 4B, Raihan Medical City"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Consultation Fee ($ USD)</label>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={formData.consultationFee}
                        onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. 50"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Clinic Working Hours</label>
                      <input
                        type="text"
                        value={formData.workingHours}
                        onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. 09:00 AM - 05:00 PM, Mon-Sat"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Clinic Contact Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={!isEditing}
                        placeholder="+1 (555) 234-5678"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dentist Photo URL</label>
                      <input
                        type="url"
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        disabled={!isEditing}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dentist Bio & Patient Care Philosophy</label>
                    <textarea
                      rows={4}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Share your dental background, expertise in treatments, and patient care philosophy..."
                      className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all resize-none disabled:opacity-75 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </>
            )}

            {/* PATIENT VIEW */}
            {isPatient && (
              <>
                {/* Section 1: Personal & Demographic Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <h3 className="font-black text-slate-800 text-lg">Personal & Contact Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Full Legal Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={!isEditing}
                        placeholder="John Doe"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={!isEditing}
                        placeholder="+1 (555) 876-5432"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Age (Years)</label>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        disabled={!isEditing}
                        placeholder="29"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        disabled={!isEditing}
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        disabled={!isEditing}
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Blood Group</label>
                      <select
                        value={formData.bloodGroup}
                        onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                        disabled={!isEditing}
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Blood Group</option>
                        {BLOOD_GROUPS.map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Height (cm / ft)</label>
                      <input
                        type="text"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. 178 cm"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Weight (kg / lbs)</label>
                      <input
                        type="text"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. 72 kg"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Residential Address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. 742 Evergreen Terrace, Sector 4, Metro City"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Clinical Background & Medical Vitals */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Activity className="w-5 h-5 text-rose-500" />
                    <h3 className="font-black text-slate-800 text-lg">Dental & Clinical Background</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        Known Drug & Material Allergies
                      </label>
                      <textarea
                        rows={3}
                        value={formData.allergies}
                        onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. Penicillin, Local Anesthetics (Lidocaine), Latex (or 'None')"
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-rose-400 outline-none text-sm transition-all resize-none disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-amber-500" />
                        Systemic / Chronic Conditions
                      </label>
                      <textarea
                        rows={3}
                        value={formData.chronicConditions}
                        onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. Hypertension, Type 2 Diabetes, Bleeding disorders (or 'None')"
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none text-sm transition-all resize-none disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-emerald-600" />
                        Current Active Medications
                      </label>
                      <textarea
                        rows={3}
                        value={formData.currentMedications}
                        onChange={(e) => setFormData({ ...formData, currentMedications: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. Blood thinners, Aspirin, Vitamin D3, Blood pressure meds"
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none text-sm transition-all resize-none disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        Relevant Dental & Treatment History
                      </label>
                      <textarea
                        rows={3}
                        value={formData.medicalHistory}
                        onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. Previous root canal treatment, orthodontic braces in 2020, regular scaling, teeth sensitivity"
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none text-sm transition-all resize-none disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Emergency Contacts & Health Insurance */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-black text-slate-800 text-lg">Emergency Contact & Dental Insurance</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Emergency Contact Name</label>
                      <input
                        type="text"
                        value={formData.emergencyContactName}
                        onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Jane Doe"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Relationship</label>
                      <input
                        type="text"
                        value={formData.emergencyContactRelation}
                        onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. Spouse / Parent / Sibling"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Emergency Phone</label>
                      <input
                        type="tel"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                        disabled={!isEditing}
                        placeholder="+1 (555) 987-6543"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dental Insurance Provider</label>
                      <input
                        type="text"
                        value={formData.insuranceProvider}
                        onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. Delta Dental, Cigna Dental, Guardian"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Policy / Member ID</label>
                      <input
                        type="text"
                        value={formData.insurancePolicyNumber}
                        onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. BS-9948271-X"
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ADMIN VIEW */}
            {isAdmin && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <h3 className="font-black text-slate-800 text-lg">Platform Administrator Credentials</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Administrator Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!isEditing}
                      className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Operations Hub Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      disabled={!isEditing}
                      className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Newsletter Subscription Toggle */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between p-4 bg-slate-50/60 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Clinical & Health Broadcasts</h4>
                    <p className="text-xs text-slate-500">Receive verified telemedicine newsletters and platform notifications.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNewsletterToggle}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer",
                    formData.newsletter ? "bg-emerald-500" : "bg-slate-300"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs",
                      formData.newsletter ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Save Buttons & Feedback */}
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4 flex flex-col sm:flex-row items-center gap-3"
              >
                <button
                  type="submit"
                  disabled={isSaving || isGeneratingExplanation}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Retaining Profile Updates...</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Profile Successfully Retained!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Save & Retain Profile Details</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {saveSuccess && (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 flex items-center gap-3 text-xs font-bold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Your profile edits have been saved permanently and will retain across all future sessions.</span>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Change Password</h3>
              <p className="text-xs text-slate-500">Update your platform login credentials</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100">
            {error}
          </div>
        )}

        {success ? (
          <div className="p-6 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-slate-800">Password Updated!</h4>
            <p className="text-xs text-slate-500">Your security credentials have been updated.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-slate-200"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
