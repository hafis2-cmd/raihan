import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  Calendar, 
  Activity, 
  AlertTriangle, 
  FileText, 
  Save, 
  Loader2,
  CheckCircle2,
  Edit3,
  X,
  Shield,
  Lock,
  Stethoscope,
  Phone,
  Heart,
  Pill,
  Building,
  ShieldCheck,
  HeartPulse
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function Profile() {
  const { profile, updateProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: '',
    image: '',

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

    // Dentist Fields
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

        // Dentist Fields
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updateData: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        image: formData.image || undefined,

        // Patient
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        gender: formData.gender || undefined,
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

        // Dentist
        specialty: 'General Dentistry',
        licenseNumber: formData.licenseNumber || undefined,
        education: formData.education || undefined,
        experience: formData.experience ? parseInt(formData.experience, 10) : undefined,
        location: formData.location || undefined,
        hospitalAffiliation: formData.hospitalAffiliation || undefined,
        consultationFee: formData.consultationFee ? parseFloat(formData.consultationFee) : undefined,
        workingHours: formData.workingHours || undefined,
        bio: formData.bio || undefined,
      };

      await updateProfile(updateData);
      setSaveSuccess(true);
      setIsEditing(false);
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
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {isDoctor ? 'Dentist Clinical Profile' : isPatient ? 'Patient Dental Profile' : 'System Administration'}
            </span>
            <span className="text-xs text-slate-400 font-medium">• Raihan Dental Health Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {isDoctor ? 'Dentist Clinical Profile' : isPatient ? 'Patient Dental Health Chart' : 'Platform Profile'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            {isDoctor 
              ? 'Configure your dental qualifications, dental council license number, clinic hours, and consultation fee.'
              : 'Maintain your personal medical background, drug allergies, dental history, and emergency contacts.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-xs",
              isEditing 
                ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200" 
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Identity Card & Summary */}
        <div className="space-y-4">
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-2xl border border-emerald-200 dark:border-emerald-800 overflow-hidden">
              {formData.image ? (
                <img src={formData.image} alt={formData.name || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                (formData.name || profile?.name || profile?.email || 'U').charAt(0).toUpperCase()
              )}
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{formData.name || 'User'}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.email}</p>
              {formData.phone && (
                <p className="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                  <Phone className="w-3 h-3" /> {formData.phone}
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-md text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                {isDoctor ? 'Chief Dental Surgeon' : 'Registered Patient'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              Change Password
            </button>
          </div>

          {/* Quick Snapshot Card */}
          {isDoctor ? (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">Clinical Snapshot</h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Degree</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formData.education || 'BDS, MDS'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Experience</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formData.experience ? `${formData.experience} Years` : '8+ Years'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">License No.</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{formData.licenseNumber || 'DDC-12345'}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Consultation Fee</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">${formData.consultationFee || '50'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <HeartPulse className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">Health Snapshot</h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Blood Group</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formData.bloodGroup || 'Not Set'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Age & Gender</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{formData.age ? `${formData.age} Yrs` : '-'} • {formData.gender || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Known Allergies</span>
                  <span className="font-medium text-rose-500 truncate max-w-[120px]">{formData.allergies || 'None'}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Emergency Contact</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{formData.emergencyContactName || 'Not Set'}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Detailed Clinical Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            
            {/* DENTIST FORM */}
            {isDoctor && (
              <>
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Professional Dental Credentials</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Dentist Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Dr. Raihan"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Dental License / Reg No.</label>
                      <input
                        type="text"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                        disabled={!isEditing}
                        placeholder="DDC-12345"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 font-mono disabled:opacity-75 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Qualifications</label>
                      <input
                        type="text"
                        value={formData.education}
                        onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                        disabled={!isEditing}
                        placeholder="BDS, MDS"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Experience (Years)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.experience}
                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                        disabled={!isEditing}
                        placeholder="8"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Clinic Details & Consultation Fee</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Consultation Fee ($ USD)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.consultationFee}
                        onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                        disabled={!isEditing}
                        placeholder="50"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 font-bold disabled:opacity-75 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Clinic Working Hours</label>
                      <input
                        type="text"
                        value={formData.workingHours}
                        onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                        disabled={!isEditing}
                        placeholder="09:00 AM - 05:00 PM, Mon-Sat"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Clinic Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={!isEditing}
                        placeholder="+1 (555) 234-5678"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Clinic Address</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Suite 101, Raihan Dental Health Center"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1 text-xs">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Bio & Clinical Practice Overview</label>
                    <textarea
                      rows={3}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      disabled={!isEditing}
                      placeholder="General dental practitioner focusing on preventive care, restorative fillings, root canals, and prosthetic restorations..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 resize-none disabled:opacity-75 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {/* PATIENT FORM */}
            {isPatient && (
              <>
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Personal & Demographic Data</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Patient Full Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Hafis Mohammed K"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 transition-colors font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={!isEditing}
                        placeholder="+1 (555) 000-0000"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Age</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        disabled={!isEditing}
                        placeholder="28"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        disabled={!isEditing}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 transition-colors"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        disabled={!isEditing}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Blood Group</label>
                      <select
                        value={formData.bloodGroup}
                        onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                        disabled={!isEditing}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 transition-colors font-bold"
                      >
                        <option value="">Select Blood Group</option>
                        {BLOOD_GROUPS.map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <Activity className="w-4 h-4 text-rose-500" />
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Clinical Background & Allergies</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        Drug & Material Allergies
                      </label>
                      <textarea
                        rows={2}
                        value={formData.allergies}
                        onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. Penicillin, Local Anesthetics (or 'None')"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500 resize-none disabled:opacity-75 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-amber-500" />
                        Systemic / Chronic Conditions
                      </label>
                      <textarea
                        rows={2}
                        value={formData.chronicConditions}
                        onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. Hypertension, Diabetes, Bleeding disorders (or 'None')"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 resize-none disabled:opacity-75 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Current Medications
                      </label>
                      <textarea
                        rows={2}
                        value={formData.currentMedications}
                        onChange={(e) => setFormData({ ...formData, currentMedications: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. Blood thinners, daily multivitamins"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 resize-none disabled:opacity-75 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Dental Treatment History
                      </label>
                      <textarea
                        rows={2}
                        value={formData.medicalHistory}
                        onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. Root canal in 2023, regular annual scaling, sensitive molars"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 resize-none disabled:opacity-75 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Emergency Contact & Insurance</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Emergency Contact</label>
                      <input
                        type="text"
                        value={formData.emergencyContactName}
                        onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Contact Full Name"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Relationship</label>
                      <input
                        type="text"
                        value={formData.emergencyContactRelation}
                        onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. Spouse / Parent"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Emergency Phone</label>
                      <input
                        type="tel"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                        disabled={!isEditing}
                        placeholder="+1 (555) 000-0000"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Save Buttons & Feedback */}
            {isEditing && (
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Profile Updates...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Your dental profile updates have been permanently saved.</span>
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
      }, 1200);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Change Password</h3>
              <p className="text-[11px] text-slate-400">Update your clinic account password</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        {success ? (
          <div className="p-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Password Updated!</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Your security credentials have been updated.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-xs shadow-xs cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
