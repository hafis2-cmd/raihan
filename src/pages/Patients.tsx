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
import { useAuth } from '../context/AuthContext';
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

const DEFAULT_PATIENTS: PatientRecord[] = [
  {
    email: 'patient@telemed.com',
    name: 'John Doe',
    phone: '+1 (555) 876-5432',
    age: 29,
    gender: 'Male',
    dob: '1995-04-12',
    address: '742 Evergreen Terrace, Sector 4, Metro City',
    bloodGroup: 'O+',
    allergies: 'Penicillin (mild), Local Anesthetic (None)',
    dentalHistory: 'Routine dental scaling 6 months ago. Occasional sensitivity to cold drinks on upper right molar.',
    lastVisit: '2026-11-10',
    totalVisits: 2
  },
  {
    email: 'sarah.miller@example.com',
    name: 'Sarah Miller',
    phone: '+1 (555) 345-6789',
    age: 34,
    gender: 'Female',
    dob: '1990-08-22',
    address: '104 Park Avenue, Suite 12, Metro City',
    bloodGroup: 'A+',
    allergies: 'None reported',
    dentalHistory: 'Orthodontic braces treatment completed in 2021. Wearing clear night retainer.',
    lastVisit: '2026-10-15',
    totalVisits: 3
  },
  {
    email: 'robert.chen@example.com',
    name: 'Robert Chen',
    phone: '+1 (555) 456-7890',
    age: 46,
    gender: 'Male',
    dob: '1978-02-14',
    address: '58 Orchard Lane, Metro City',
    bloodGroup: 'B+',
    allergies: 'Aspirin, Ibuprofen (gastric upset)',
    dentalHistory: 'Composite filling on tooth #25. Smoker for 15 years; prone to coffee/tea stains.',
    lastVisit: '2026-09-28',
    totalVisits: 1
  }
];

export default function Patients() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const isDentist = profile?.role === 'Doctor' || profile?.role === 'Dentist';

  const [patients, setPatients] = useState<PatientRecord[]>(DEFAULT_PATIENTS);
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

    // Map of patients
    const patientMap = new Map<string, PatientRecord>();
    DEFAULT_PATIENTS.forEach(p => patientMap.set(p.email.toLowerCase(), { ...p }));

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
              name: stored.name || stored.email.split('@')[0],
              totalVisits: 0
            };
            patientMap.set(emailLower, {
              ...existing,
              name: stored.name || existing.name,
              phone: stored.phone || existing.phone,
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
          name: app.patient_name || app.patient_email.split('@')[0],
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Dental Patient Records
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Clinical Roster</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
            My Dental Patients
          </h1>
          <p className="text-slate-500 font-medium text-sm md:text-base">
            Access complete patient dental charts, past treatments performed, clinical prescriptions, and visit histories.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all w-72 shadow-xs"
          />
        </div>
      </div>

      {/* Patient Cards Grid */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
            <Users className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-800">No Patients Found</h3>
            <p className="text-slate-500 text-xs max-w-xs mx-auto">
              {searchQuery ? "No patients match your search criteria." : "No registered dental patients found."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map(patient => (
            <motion.div
              key={patient.email}
              onClick={() => setSelectedPatient(patient)}
              className="bg-white p-6 rounded-[2.5rem] border border-slate-200/90 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all flex flex-col justify-between space-y-5 cursor-pointer group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xl border border-emerald-100 shrink-0 group-hover:scale-105 transition-transform">
                      {patient.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-base">{patient.name}</h4>
                      <p className="text-xs text-slate-400 font-medium">{patient.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                        {patient.gender || 'Patient'} {patient.age ? `• ${patient.age} yrs` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50/70 rounded-2xl space-y-1.5 text-xs">
                  {patient.phone && (
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{patient.phone}</span>
                    </div>
                  )}
                  {patient.lastVisit && (
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Last Visit: <strong>{patient.lastVisit}</strong></span>
                    </div>
                  )}
                  {patient.dentalHistory && (
                    <div className="pt-1 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dental History</span>
                      <p className="text-[11px] text-slate-600 line-clamp-2 italic font-medium">
                        "{patient.dentalHistory}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  <span>View Dental Chart</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 font-black text-2xl">
                    {selectedPatient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-slate-800">{selectedPatient.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        Dental Patient Chart
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {selectedPatient.email} {selectedPatient.phone ? `• ${selectedPatient.phone}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 text-xs">
                
                {/* Section 1: Demographics & Relevant Dental History */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Bio & Contact Details */}
                  <div className="p-5 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      Patient Demographics
                    </span>
                    <div className="space-y-1.5 text-slate-700 font-medium">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Age / Gender:</span>
                        <span className="font-bold">{selectedPatient.age || 'N/A'} yrs • {selectedPatient.gender || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date of Birth:</span>
                        <span className="font-bold">{selectedPatient.dob || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Blood Group:</span>
                        <span className="font-bold text-rose-600">{selectedPatient.bloodGroup || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Address:</span>
                        <span className="font-bold text-right truncate max-w-[200px]">{selectedPatient.address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dental History & Allergies */}
                  <div className="p-5 bg-emerald-50/40 rounded-2xl space-y-2 border border-emerald-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 block">
                      Relevant Dental & Allergy History
                    </span>
                    <div className="space-y-2 text-slate-700">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dental History:</span>
                        <p className="font-medium text-slate-800 italic">
                          "{selectedPatient.dentalHistory || 'No past dental complications reported.'}"
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Known Allergies / Local Anesthesia:</span>
                        <p className="font-bold text-rose-700">
                          {selectedPatient.allergies || 'No known drug allergies.'}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Section 2: Previous Dental Consultations & Treatments */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-black text-slate-800 text-sm">Dental Consultations & Treatment History</h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {patientConsultations.length} procedure(s) recorded
                    </span>
                  </div>

                  {patientConsultations.length === 0 ? (
                    <div className="p-6 bg-slate-50 rounded-2xl text-center text-slate-400 space-y-1">
                      <p className="font-bold text-slate-600">No consultation records on file for this patient.</p>
                      <p className="text-[11px]">Use the Dental Consultations page to document clinical procedures.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {patientConsultations.map(c => (
                        <div key={c.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                              {c.treatment_category}
                            </span>
                            <span className="font-bold text-slate-600 text-[11px]">{c.consultation_date}</span>
                          </div>
                          <p className="text-slate-800 font-bold">Diagnosis: {c.diagnosis}</p>
                          <p className="text-slate-600 text-[11px]">Performed: {c.treatment_performed}</p>
                          <p className="text-slate-500 text-[10px] italic">Post-op: {c.follow_up_instructions}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 3: Prescriptions Issued */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <h4 className="font-black text-slate-800 text-sm">Issued Dental Prescriptions</h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {patientPrescriptions.length} prescription(s)
                    </span>
                  </div>

                  {patientPrescriptions.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 text-xs">
                      No prescriptions on file for this patient.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {patientPrescriptions.map(rx => (
                        <div key={rx.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                          <div className="flex justify-between font-bold text-slate-800">
                            <span>Prescription Date: {rx.prescription_date}</span>
                            <span className="text-slate-400 text-[10px]">By {rx.dentist_name}</span>
                          </div>
                          <p className="text-slate-600 text-[11px]">
                            Medications: {rx.medications.map(m => `${m.medicine_name} (${m.dosage}, ${m.frequency})`).join(' • ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 4: Appointment History */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <h4 className="font-black text-slate-800 text-sm">Appointment History</h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {patientAppointments.length} appointment(s)
                    </span>
                  </div>

                  {patientAppointments.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 text-xs">
                      No appointment records on file.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                      {patientAppointments.map(app => (
                        <div key={app.id} className="p-3 bg-white flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-800">{app.appointment_date} at {app.appointment_time}</span>
                            <p className="text-slate-500 text-[11px]">Reason: {app.reason}</p>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                            app.status === 'ACCEPTED' ? "bg-emerald-100 text-emerald-800" :
                            app.status === 'PENDING' ? "bg-amber-100 text-amber-800" :
                            "bg-slate-100 text-slate-600"
                          )}>
                            {app.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setSelectedPatient(null);
                      navigate('/prescriptions', { state: { patientEmail: selectedPatient.email, patientName: selectedPatient.name } });
                    }}
                    className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Write Dental Prescription</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedPatient(null);
                      navigate('/consultations');
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Record Dental Consultation</span>
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
