import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Calendar, 
  ChevronRight, 
  Stethoscope, 
  FileText, 
  Clock, 
  X, 
  Loader2,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  AlertCircle,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth, getRegisteredPatients } from '../context/AuthContext';
import { getLocalAppointments, Appointment } from '../services/appointmentService';
import { 
  getLocalConsultations, 
  getLocalPrescriptions, 
  DentalConsultation, 
  DentalPrescription 
} from '../services/dentalService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PatientRecord {
  email: string;
  name: string;
  phone?: string;
  photoURL?: string;
  image?: string;
  age?: number;
  gender?: string;
  dob?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  dentalHistory?: string;
  lastVisit?: string;
  totalVisits: number;
}

export default function Patients() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const isDentist = profile?.role === 'Doctor' || profile?.role === 'Dentist';

  // Guard: Immediately redirect non-dentists away from patient records
  useEffect(() => {
    if (profile && !isDentist && profile.role !== 'Admin') {
      navigate('/');
    }
  }, [profile, isDentist, navigate]);

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [patientConsultations, setPatientConsultations] = useState<DentalConsultation[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<DentalPrescription[]>([]);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);

  // Load and merge patient data
  useEffect(() => {
    const allAppts = getLocalAppointments();
    const allCons = getLocalConsultations();
    const allRx = getLocalPrescriptions();

    // Map of patients (starting empty)
    const patientMap = new Map<string, PatientRecord>();

    // 1. Populate from registered patient accounts
    const registeredPatients = getRegisteredPatients();
    registeredPatients.forEach(p => {
      patientMap.set(p.email.toLowerCase(), {
        email: p.email,
        name: p.name,
        phone: p.phone,
        photoURL: p.photoURL || p.image || '',
        age: p.age,
        gender: p.gender,
        dob: p.dob,
        address: p.address,
        dentalHistory: p.dentalHistory,
        allergies: p.allergies,
        totalVisits: 0
      });
    });

    // Merge from stored profiles
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('raihan_profile_')) {
        try {
          const stored = JSON.parse(localStorage.getItem(key) || '{}');
          if (stored.email && stored.role !== 'Doctor' && stored.role !== 'Dentist') {
            const emailLower = stored.email.toLowerCase();
            const existing: PatientRecord = patientMap.get(emailLower) || {
              email: stored.email,
              name: stored.name || 'Patient',
              totalVisits: 0
            };
            patientMap.set(emailLower, {
              ...existing,
              name: stored.name || existing.name,
              phone: stored.phone || existing.phone,
              photoURL: stored.photoURL || stored.image || existing.photoURL || '',
              age: stored.age || existing.age,
              gender: stored.gender || existing.gender,
              dob: stored.dob || existing.dob,
              address: stored.address || existing.address,
              bloodGroup: stored.bloodGroup || existing.bloodGroup,
              allergies: stored.allergies || existing.allergies,
              dentalHistory: stored.dentalHistory || stored.medicalHistory || existing.dentalHistory
            });
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // Merge visits from appointments
    allAppts.forEach(app => {
      if (app.patient_email) {
        const emailLower = app.patient_email.toLowerCase();
        const p = patientMap.get(emailLower) || {
          email: app.patient_email,
          name: app.patient_name || 'Patient',
          phone: app.patient_phone,
          age: app.patient_age,
          gender: app.patient_gender,
          bloodGroup: app.patient_blood_group,
          totalVisits: 0
        };
        p.totalVisits = (p.totalVisits || 0) + 1;
        if (!p.lastVisit || new Date(app.appointment_date) > new Date(p.lastVisit)) {
          p.lastVisit = app.appointment_date;
        }
        patientMap.set(emailLower, p);
      }
    });

    setPatients(Array.from(patientMap.values()));
  }, []);

  // When a patient is selected, fetch their full dental records
  useEffect(() => {
    if (!selectedPatient) {
      setPatientConsultations([]);
      setPatientPrescriptions([]);
      setPatientAppointments([]);
      return;
    }

    const emailLower = selectedPatient.email.toLowerCase().trim();
    const allCons = getLocalConsultations();
    const allRx = getLocalPrescriptions();
    const allAppts = getLocalAppointments();

    setPatientConsultations(allCons.filter(c => (c.patient_email || '').toLowerCase().trim() === emailLower));
    setPatientPrescriptions(allRx.filter(p => (p.patient_email || '').toLowerCase().trim() === emailLower));
    setPatientAppointments(allAppts.filter(a => (a.patient_email || '').toLowerCase().trim() === emailLower));
  }, [selectedPatient]);

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.phone || '').includes(searchQuery)
  );

  if (!isDentist && profile?.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
            <X className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Access Restricted</h2>
          <p className="text-slate-500">Only authorized dental practitioners can access patient records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              Clinical Roster
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Patient Directory
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-normal text-sm">
            Access complete dental records, past clinical procedures, prescriptions, and visit histories.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors w-72 shadow-xs"
          />
        </div>
      </div>

      {/* Patient Cards Grid */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Patients Found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs max-w-xs mx-auto">
              {searchQuery ? "No patients match your search criteria." : "No registered dental patients on record yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPatients.map(patient => (
            <motion.div
              key={patient.email}
              onClick={() => setSelectedPatient(patient)}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between space-y-4 cursor-pointer group"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-base border border-emerald-100 dark:border-emerald-800/60 shrink-0 overflow-hidden">
                      {patient.photoURL ? (
                        <img src={patient.photoURL} alt={patient.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        patient.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{patient.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{patient.email}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {patient.gender || 'Patient'} {patient.age ? `• ${patient.age} yrs` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 text-xs">
                  {patient.phone && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{patient.phone}</span>
                    </div>
                  )}
                  {patient.lastVisit && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Last Visit: <strong className="text-slate-800 dark:text-slate-200">{patient.lastVisit}</strong></span>
                    </div>
                  )}
                  {patient.dentalHistory && (
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Dental History</span>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic">
                        "{patient.dentalHistory}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span>View Dental Chart</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] text-slate-400">
                  {patient.totalVisits} visit(s)
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Comprehensive Dental Patient Chart Modal */}
      <AnimatePresence>
        {selectedPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-lg border border-emerald-100 dark:border-emerald-800/60 shrink-0 overflow-hidden">
                    {selectedPatient.photoURL ? (
                      <img src={selectedPatient.photoURL} alt={selectedPatient.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      selectedPatient.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{selectedPatient.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60">
                        Dental Record
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedPatient.email} {selectedPatient.phone ? `• ${selectedPatient.phone}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-xs">
                
                {/* Demographics & Relevant Dental History */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Bio & Contact Details */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Patient Demographics
                    </span>
                    <div className="space-y-1.5 text-slate-700 dark:text-slate-300 font-medium">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Age / Gender:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedPatient.age || 'N/A'} yrs • {selectedPatient.gender || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date of Birth:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedPatient.dob || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Blood Group:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedPatient.bloodGroup || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Address:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-right truncate max-w-[200px]">{selectedPatient.address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dental History & Allergies */}
                  <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl space-y-2 border border-emerald-100 dark:border-emerald-800/60">
                    <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block">
                      Clinical Background & Allergies
                    </span>
                    <div className="space-y-2 text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Dental History:</span>
                        <p className="font-medium text-slate-800 dark:text-slate-200 italic">
                          "{selectedPatient.dentalHistory || 'No prior dental complications reported.'}"
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Known Drug / Anesthetic Allergies:</span>
                        <p className="font-semibold text-rose-700 dark:text-rose-400">
                          {selectedPatient.allergies || 'No known allergies reported.'}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Previous Dental Consultations & Treatments */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Treatment & Consultation History</h4>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {patientConsultations.length} procedure(s)
                    </span>
                  </div>

                  {patientConsultations.length === 0 ? (
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No consultation records on file.</p>
                      <p className="text-xs text-slate-400">Document treatments using the Dental Consultations page.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {patientConsultations.map(c => (
                        <div key={c.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60">
                              {c.treatment_category}
                            </span>
                            <span className="font-medium text-slate-500 text-[11px]">{c.consultation_date}</span>
                          </div>
                          <p className="text-slate-900 dark:text-slate-100 font-medium">Diagnosis: <strong>{c.diagnosis}</strong></p>
                          <p className="text-slate-600 dark:text-slate-300 text-xs">Performed: {c.treatment_performed}</p>
                          {c.follow_up_instructions && (
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] italic">Post-op: {c.follow_up_instructions}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prescriptions Issued */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Issued Prescriptions</h4>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {patientPrescriptions.length} prescription(s)
                    </span>
                  </div>

                  {patientPrescriptions.length === 0 ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center text-slate-400 text-xs">
                      No prescriptions on file for this patient.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {patientPrescriptions.map(rx => (
                        <div key={rx.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                          <div className="flex justify-between font-medium text-slate-800 dark:text-slate-200">
                            <span>Date: {rx.prescription_date}</span>
                            <span className="text-slate-400 text-[11px]">By {rx.dentist_name}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-xs">
                            Medications: {rx.medications.map(m => `${m.medicine_name} (${m.dosage}, ${m.frequency})`).join(' • ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Appointment History */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Appointment History</h4>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {patientAppointments.length} appointment(s)
                    </span>
                  </div>

                  {patientAppointments.length === 0 ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center text-slate-400 text-xs">
                      No appointment records on file.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      {patientAppointments.map(app => (
                        <div key={app.id} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">{app.appointment_date} at {app.appointment_time}</span>
                            <p className="text-slate-500 dark:text-slate-400 text-xs">Reason: {app.reason}</p>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-medium capitalize",
                            app.status === 'ACCEPTED' ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" :
                            app.status === 'PENDING' ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" :
                            "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          )}>
                            {app.status.toLowerCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    onClick={() => {
                      setSelectedPatient(null);
                      navigate('/prescriptions', { state: { patientEmail: selectedPatient.email, patientName: selectedPatient.name } });
                    }}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Prescription</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedPatient(null);
                      navigate('/consultations');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Record Consultation</span>
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
