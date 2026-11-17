import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Stethoscope, 
  Pill, 
  Clock, 
  Info, 
  Download, 
  ChevronRight,
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Image as ImageIcon, 
  Upload, 
  Type 
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { 
  getLocalPrescriptions, 
  addDentalPrescription, 
  COMMON_DENTAL_MEDICATIONS 
} from '../services/dentalService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Prescription {
  id: string;
  patientEmail: string;
  patientName: string;
  doctorName: string;
  doctorEmail: string;
  date: string;
  medications: Medication[];
  notes: string;
  prescriptionImage?: string;
  timestamp: any;
}

function formatDocName(name?: string) {
  if (!name) return 'Dr. Raihan';
  const trimmed = name.trim();
  if (trimmed.toLowerCase().startsWith('dr.')) {
    return trimmed;
  }
  return `Dr. ${trimmed}`;
}

export default function Prescriptions() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (location.state?.patientEmail) {
      setShowAddModal(true);
    }
  }, [location.state]);

  useEffect(() => {
    if (!user || !profile) return;

    const isDentistRole = profile.role === 'Doctor' || profile.role === 'Dentist';

    // Initial local load
    const localRx = getLocalPrescriptions();
    const mappedLocal: Prescription[] = localRx.map(r => ({
      id: r.id,
      patientEmail: r.patient_email,
      patientName: r.patient_name,
      doctorName: r.dentist_name,
      doctorEmail: r.dentist_email,
      date: r.prescription_date,
      medications: r.medications.map(m => ({
        name: m.medicine_name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions
      })),
      notes: r.instructions || '',
      timestamp: r.created_at
    }));

    if (isDentistRole) {
      setPrescriptions(mappedLocal.filter(p => (p.doctorEmail || '').toLowerCase() === (user.email || '').toLowerCase()));
    } else {
      setPrescriptions(mappedLocal.filter(p => (p.patientEmail || '').toLowerCase() === (user.email || '').toLowerCase()));
    }
    setLoading(false);

    let q = query(collection(db, 'prescriptions'));

    if (isDentistRole) {
      q = query(q, where('doctorEmail', '==', user.email));
    } else if (profile.role !== 'Admin') {
      q = query(q, where('patientEmail', '==', user.email));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          patientEmail: d.patientEmail,
          patientName: d.patientName,
          doctorName: d.doctorName,
          doctorEmail: d.doctorEmail,
          date: d.date,
          medications: d.medications || [],
          notes: d.notes,
          prescriptionImage: d.prescriptionImage,
          timestamp: d.timestamp?.toDate ? d.timestamp.toDate().toISOString() : d.timestamp
        });
      });
      if (list.length > 0) {
        // Merge with local records
        const map = new Map<string, Prescription>();
        mappedLocal.forEach(m => map.set(m.id, m));
        list.forEach(m => map.set(m.id, m));
        const merged = Array.from(map.values());
        merged.sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());
        setPrescriptions(merged);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Error fetching Firestore prescriptions, using local:', err);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user, profile]);

  const filteredPrescriptions = prescriptions.filter(p => 
    p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.medications.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Dental Prescriptions
            </span>
            <span className="text-xs text-slate-400 font-medium">• Oral Pharmacotherapy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Prescriptions & Medications
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            {profile?.role === 'Doctor' || profile?.role === 'Dentist'
              ? 'Issue authentic dental prescriptions, medication instructions, and antimicrobial regimens for patients.'
              : 'Review your prescribed dental medications, dosage instructions, and print official prescription records.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search prescriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-colors w-60 shadow-xs"
            />
          </div>
          
          {(profile?.role === 'Doctor' || profile?.role === 'Dentist') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Issue Prescription</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Loading dental prescriptions...</p>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">No prescriptions found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery ? "No prescriptions match your search criteria." : "You do not have any active prescription records."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrescriptions.map((prescription) => (
            <motion.div
              layoutId={prescription.id}
              key={prescription.id}
              onClick={() => setSelectedPrescription(prescription)}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-600 hover:shadow-md transition-all cursor-pointer space-y-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 text-sm">
                      {profile?.role === 'Doctor' || profile?.role === 'Dentist'
                        ? prescription.patientName 
                        : formatDocName(prescription.doctorName)}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-normal">
                      <Calendar className="w-3.5 h-3.5" />
                      {prescription.date}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrintPrescription(prescription);
                  }}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Print / Download PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Prescribed Items</p>
                <div className="flex flex-wrap gap-1.5">
                  {prescription.medications.slice(0, 3).map((med, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                      {med.name} {med.dosage && `(${med.dosage})`}
                    </span>
                  ))}
                  {prescription.medications.length > 3 && (
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-md text-[11px] font-medium border border-emerald-200 dark:border-emerald-800">
                      +{prescription.medications.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {prescription.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic bg-slate-50/60 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  "{prescription.notes}"
                </p>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  View Full Prescription
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedPrescription && (
          <PrescriptionDetailModal 
            prescription={selectedPrescription} 
            onClose={() => setSelectedPrescription(null)} 
          />
        )}
        {showAddModal && (
          <AddPrescriptionModal 
            onClose={() => setShowAddModal(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const handlePrintPrescription = (p: Prescription) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }
  const docName = formatDocName(p.doctorName);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Prescription - ${p.patientName}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 24px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 20px; }
          .logo { font-size: 22px; font-weight: 800; color: #059669; }
          .clinic-info { font-size: 12px; color: #64748b; text-align: right; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 20px; }
          .meta-item { font-size: 13px; }
          .meta-label { font-weight: 700; color: #475569; text-transform: uppercase; font-size: 11px; margin-bottom: 4px; }
          .rx-symbol { font-size: 32px; font-weight: 900; color: #059669; margin-bottom: 12px; font-family: serif; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .instructions { font-style: italic; color: #475569; }
          .notes-box { background: #f0fdf4; border-left: 4px solid #059669; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; font-size: 13px; }
          .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          .stamp { text-align: center; border: 2px dashed #059669; padding: 8px 16px; border-radius: 8px; color: #059669; font-weight: 700; font-size: 11px; text-transform: uppercase; }
          .signature { text-align: right; }
          .signature-line { width: 180px; border-top: 1px solid #0f172a; margin-top: 36px; margin-bottom: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">🦷 Raihan Dental Clinic</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Oral Healthcare & Clinical Dental Prescriptions</div>
          </div>
          <div class="clinic-info">
            <strong>Raihan Dental Health Center</strong><br/>
            Ref: RX-${p.id ? p.id.slice(0, 8).toUpperCase() : 'REC'}<br/>
            Date: ${p.date || new Date().toLocaleDateString()}
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-label">Patient Information</div>
            <div class="meta-item"><strong>${p.patientName}</strong></div>
            <div class="meta-item">${p.patientEmail}</div>
          </div>
          <div style="text-align: right;">
            <div class="meta-label">Attending Dental Surgeon</div>
            <div class="meta-item"><strong>${docName}</strong></div>
            <div class="meta-item">${p.doctorEmail || 'doctor@clinic.com'}</div>
          </div>
        </div>

        <div class="rx-symbol">℞</div>

        <table>
          <thead>
            <tr>
              <th>Dental Medication</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
              <th>Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${(p.medications || []).map(m => `
              <tr>
                <td><strong>${m.name}</strong></td>
                <td>${m.dosage}</td>
                <td>${m.frequency}</td>
                <td>${m.duration}</td>
                <td class="instructions">${m.instructions || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${p.notes ? `
          <div class="notes-box">
            <strong>Dentist Instructions & Oral Care:</strong><br/>
            ${p.notes}
          </div>
        ` : ''}

        <div class="footer">
          <div class="stamp">
            ✔ Digitally Verified Dental Prescription<br/>
            <span style="font-size: 9px; font-weight: normal; color: #64748b;">Raihan Dental Clinic Verified</span>
          </div>
          <div class="signature">
            <div class="signature-line"></div>
            <strong>${docName}</strong><br/>
            <span style="font-size: 11px; color: #64748b;">General Dental Practitioner (BDS, MDS)</span>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

function PrescriptionDetailModal({ prescription, onClose }: { prescription: Prescription, onClose: () => void }) {
  const docName = formatDocName(prescription.doctorName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Prescription Details</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Issued on {prescription.date}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <User className="w-4 h-4" />
                <h3 className="font-semibold uppercase text-[11px] tracking-wider">Patient</h3>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{prescription.patientName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{prescription.patientEmail}</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Stethoscope className="w-4 h-4" />
                <h3 className="font-semibold uppercase text-[11px] tracking-wider">Dentist</h3>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{docName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{prescription.doctorEmail || 'doctor@clinic.com'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Medications & Regimen</h3>
            </div>
            {prescription.medications && prescription.medications.length > 0 ? (
              <div className="space-y-3">
                {prescription.medications.map((med, idx) => (
                  <div key={idx} className="p-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{med.name}</h4>
                      <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-md text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                        {med.dosage}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Frequency</p>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{med.frequency}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Duration</p>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{med.duration}</p>
                        </div>
                      </div>
                    </div>

                    {med.instructions && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Instructions</p>
                        <p className="text-slate-700 dark:text-slate-300 italic">"{med.instructions}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                <p className="text-xs text-slate-400">No structured medication list available.</p>
              </div>
            )}
          </div>

          {prescription.prescriptionImage && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Prescription Image</h3>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <img 
                  src={prescription.prescriptionImage} 
                  alt="Prescription" 
                  className="w-full h-auto object-contain max-h-[400px]"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}

          {prescription.notes && (
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Info className="w-4 h-4" />
                <h3 className="font-semibold uppercase text-[11px] tracking-wider">Dentist Notes</h3>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {prescription.notes}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button 
            onClick={() => handlePrintPrescription(prescription)}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Printable Rx
          </button>
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AddPrescriptionModal({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'write' | 'upload'>('write');

  const [formData, setFormData] = useState({
    patientEmail: location.state?.patientEmail || '',
    patientName: location.state?.patientName || '',
    notes: '',
    prescriptionImage: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        setError('Image size must be less than 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, prescriptionImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const addMedication = () => {
    setFormData({
      ...formData,
      medications: [...formData.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    });
  };

  const removeMedication = (index: number) => {
    if (formData.medications.length === 1) return;
    const newMeds = formData.medications.filter((_, i) => i !== index);
    setFormData({ ...formData, medications: newMeds });
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const newMeds = [...formData.medications];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setFormData({ ...formData, medications: newMeds });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setError('');

    try {
      await addDentalPrescription({
        patient_email: formData.patientEmail.trim(),
        patient_name: formData.patientName.trim() || 'Patient',
        dentist_email: user.email || '',
        dentist_name: profile?.name || 'Dr. Raihan',
        prescription_date: new Date().toISOString().split('T')[0],
        medications: formData.medications.map(m => ({
          medicine_name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions
        })),
        instructions: formData.notes
      });

      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save prescription');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Issue Dental Prescription</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Prescribe medication and patient oral instructions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-xs">
          {success ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Prescription Issued Successfully!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">The patient can now view and download their prescription.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Patient Name</label>
                  <input
                    type="text"
                    required
                    value={formData.patientName}
                    onChange={(e) => setFormData({...formData, patientName: e.target.value})}
                    placeholder="e.g. Johnathan Smith"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Patient Email</label>
                  <input
                    type="email"
                    required
                    value={formData.patientEmail}
                    onChange={(e) => setFormData({...formData, patientEmail: e.target.value})}
                    placeholder="patient@example.com"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setMode('write')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    mode === 'write' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Type className="w-4 h-4" />
                  Write Prescription
                </button>
                <button
                  type="button"
                  onClick={() => setMode('upload')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    mode === 'upload' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <ImageIcon className="w-4 h-4" />
                  Upload Image
                </button>
              </div>

              {mode === 'write' ? (
                <div className="space-y-4">
                  {/* Common Dental Medications Quick-Add Chips */}
                  <div className="space-y-2 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                      Quick-Add Common Dental Prescriptions
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_DENTAL_MEDICATIONS.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => {
                            if (formData.medications.length === 1 && !formData.medications[0].name) {
                              setFormData({
                                ...formData,
                                medications: [{
                                  name: preset.name,
                                  dosage: preset.dosage,
                                  frequency: preset.frequency,
                                  duration: preset.duration,
                                  instructions: preset.instructions
                                }]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                medications: [...formData.medications, {
                                  name: preset.name,
                                  dosage: preset.dosage,
                                  frequency: preset.frequency,
                                  duration: preset.duration,
                                  instructions: preset.instructions
                                }]
                              });
                            }
                          }}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg border border-emerald-200 dark:border-emerald-800/80 transition-all cursor-pointer shadow-2xs"
                        >
                          + {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Pill className="w-4 h-4 text-emerald-500" />
                      Medication Items
                    </h3>
                    <button
                      type="button"
                      onClick={addMedication}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.medications.map((med, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 relative">
                        {formData.medications.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMedication(idx)}
                            className="absolute top-3 right-3 p-1 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Medicine Name</label>
                            <input
                              type="text"
                              required
                              value={med.name}
                              onChange={(e) => updateMedication(idx, 'name', e.target.value)}
                              placeholder="e.g. Amoxicillin"
                              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dosage</label>
                            <input
                              type="text"
                              required
                              value={med.dosage}
                              onChange={(e) => updateMedication(idx, 'dosage', e.target.value)}
                              placeholder="e.g. 500mg"
                              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Frequency</label>
                            <input
                              type="text"
                              required
                              value={med.frequency}
                              placeholder="e.g. 3 times daily"
                              onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
                              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duration</label>
                            <input
                              type="text"
                              required
                              value={med.duration}
                              placeholder="e.g. 5 days"
                              onChange={(e) => updateMedication(idx, 'duration', e.target.value)}
                              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Instructions</label>
                          <input
                            type="text"
                            value={med.instructions}
                            placeholder="e.g. Take with food. Complete the full antibiotic course."
                            onChange={(e) => updateMedication(idx, 'instructions', e.target.value)}
                            className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    Upload Prescription Image
                  </h3>
                  
                  <div className="relative">
                    {formData.prescriptionImage ? (
                      <div className="relative rounded-xl overflow-hidden border border-emerald-500">
                        <img 
                          src={formData.prescriptionImage} 
                          alt="Preview" 
                          className="w-full h-56 object-contain bg-slate-50 dark:bg-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, prescriptionImage: '' })}
                          className="absolute top-3 right-3 p-1.5 bg-rose-500 text-white rounded-lg shadow-sm hover:bg-rose-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-emerald-400 transition-all cursor-pointer">
                        <div className="flex flex-col items-center justify-center p-4">
                          <Upload className="w-6 h-6 text-slate-400 mb-2" />
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Click to upload prescription</p>
                          <p className="text-[11px] text-slate-400">PNG, JPG (MAX. 1MB)</p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Dentist Advice & Oral Care Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional patient guidance or dietary restrictions..."
                  className="w-full h-24 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 text-xs resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Issuing Prescription...' : 'Issue Prescription'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
