import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Stethoscope, 
  Calendar, 
  User, 
  Plus, 
  Search, 
  FileText, 
  CheckCircle2, 
  Clock, 
  X, 
  Printer, 
  FileCheck
} from 'lucide-react';
import { useAuth, getRegisteredPatients } from '../context/AuthContext';
import { 
  DentalConsultation, 
  DentalTreatmentCategory, 
  DENTAL_TREATMENT_CATEGORIES,
  getLocalConsultations,
  addDentalConsultation 
} from '../services/dentalService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Consultations() {
  const { profile } = useAuth();
  const isDentist = profile?.role === 'Doctor' || profile?.role === 'Dentist';

  const [consultations, setConsultations] = useState<DentalConsultation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State for new consultation
  const [formPatientEmail, setFormPatientEmail] = useState('');
  const [formPatientName, setFormPatientName] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState<DentalTreatmentCategory>('General dental examination');
  const [formComplaints, setFormComplaints] = useState('');
  const [formFindings, setFormFindings] = useState('');
  const [formDiagnosis, setFormDiagnosis] = useState('');
  const [formTreatmentPerformed, setFormTreatmentPerformed] = useState('');
  const [formFollowUp, setFormFollowUp] = useState('');
  const [formNextVisit, setFormNextVisit] = useState('');
  const [formCost, setFormCost] = useState<number>(60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registeredPatients = getRegisteredPatients();

  // Load consultations
  const loadData = () => {
    const all = getLocalConsultations();
    if (profile?.email) {
      const emailLower = profile.email.toLowerCase().trim();
      if (isDentist) {
        setConsultations(all.filter(c => (c.dentist_email || '').toLowerCase().trim() === emailLower));
      } else {
        setConsultations(all.filter(c => (c.patient_email || '').toLowerCase().trim() === emailLower));
      }
    } else {
      setConsultations(all);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('raihan_consultations_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('raihan_consultations_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [profile?.email, isDentist]);

  // Quick preset helper when changing category
  const handleCategoryChange = (cat: DentalTreatmentCategory) => {
    setFormCategory(cat);
    if (cat === 'Dental cleaning (Scaling)') {
      setFormCost(75);
      if (!formComplaints) setFormComplaints('Plaque buildup, mild bleeding gums during brushing.');
      if (!formFindings) setFormFindings('Calculus deposits around lingual surfaces of lower anterior teeth. Marginal gingivitis.');
      if (!formDiagnosis) setFormDiagnosis('Chronic Marginal Gingivitis with Supragingival Calculus');
      if (!formTreatmentPerformed) setFormTreatmentPerformed('Full-mouth ultrasonic scaling followed by prophylaxis polishing.');
      if (!formFollowUp) setFormFollowUp('Use soft brush twice daily. Warm saline rinses for 3 days.');
    } else if (cat === 'Root canal treatment') {
      setFormCost(280);
      if (!formComplaints) setFormComplaints('Severe spontaneous throbbing toothache, sensitivity to hot and cold.');
      if (!formFindings) setFormFindings('Deep carious lesion extending into pulp chamber. Tender to vertical percussion.');
      if (!formDiagnosis) setFormDiagnosis('Irreversible Pulpitis with Periapical Periodontitis');
      if (!formTreatmentPerformed) setFormTreatmentPerformed('Canal access opening, biomechanical preparation, irrigation with NaOCl, and temporary sedative dressing placed.');
      if (!formFollowUp) setFormFollowUp('Avoid biting on treated tooth. Complete prescribed antibiotic course.');
    } else if (cat === 'Dental filling') {
      setFormCost(90);
      if (!formComplaints) setFormComplaints('Food impaction and sensitivity to sweet foods.');
      if (!formFindings) setFormFindings('Class II dental cavity with enamel breakdown on interproximal contact.');
      if (!formDiagnosis) setFormDiagnosis('Localized Dental Caries (Dentinal Involvement)');
      if (!formTreatmentPerformed) setFormTreatmentPerformed('Caries excavation, acid etching, bonding agent applied, light-cured composite resin restoration placed and polished.');
      if (!formFollowUp) setFormFollowUp('Normal eating can resume after numbness subsides.');
    } else if (cat === 'Tooth extraction') {
      setFormCost(80);
      if (!formComplaints) setFormComplaints('Unrestorable broken tooth causing chronic pain and gum swelling.');
      if (!formFindings) setFormFindings('Grossly decayed non-restorable tooth root remnants with surrounding localized periapical bone resorption.');
      if (!formDiagnosis) setFormDiagnosis('Retained Non-Restorable Tooth Root');
      if (!formTreatmentPerformed) setFormTreatmentPerformed('Local anesthesia administered (2% Lignocaine), atraumatic closed tooth extraction, hemostasis achieved with pressure pack.');
      if (!formFollowUp) setFormFollowUp('Bite on gauze firmly for 45 minutes. Avoid spitting, smoking, or drinking through a straw for 24 hours.');
    } else if (cat === 'Dental crowns') {
      setFormCost(350);
      if (!formComplaints) setFormComplaints('Post-root canal tooth requiring protective crown coverage.');
      if (!formFindings) setFormFindings('Endodontically treated molar with substantial loss of coronal tooth structure.');
      if (!formDiagnosis) setFormDiagnosis('Endodontically Treated Tooth Requiring Full Coronal Restoration');
      if (!formTreatmentPerformed) setFormTreatmentPerformed('Crown tooth preparation with circumferential shoulder margin, retraction cord placed, elastomeric digital impression taken.');
      if (!formFollowUp) setFormFollowUp('Avoid sticky foods while temporary acrylic crown is in place.');
    }
  };

  const handleSubmitConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formComplaints.trim() || !formDiagnosis.trim()) {
      alert('Please fill in patient complaints and clinical diagnosis.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDentalConsultation({
        patient_email: formPatientEmail.trim(),
        patient_name: formPatientName.trim(),
        dentist_email: profile?.email || '',
        dentist_name: profile?.name || 'Dr. Raihan',
        consultation_date: formDate,
        complaints: formComplaints.trim(),
        examination_findings: formFindings.trim(),
        diagnosis: formDiagnosis.trim(),
        treatment_category: formCategory,
        treatment_performed: formTreatmentPerformed.trim() || 'Clinical evaluation and counseling performed.',
        follow_up_instructions: formFollowUp.trim() || 'Maintain regular oral hygiene and recall as recommended.',
        next_visit_date: formNextVisit || undefined,
        treatment_cost: Number(formCost) || 0
      });

      setShowAddModal(false);
      setFormComplaints('');
      setFormFindings('');
      setFormDiagnosis('');
      setFormTreatmentPerformed('');
      setFormFollowUp('');
      loadData();
    } catch (err) {
      console.error('Error saving consultation:', err);
      alert('Failed to record consultation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = (cons: DentalConsultation) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const docName = cons.dentist_name?.startsWith('Dr.') ? cons.dentist_name : `Dr. ${cons.dentist_name || 'Raihan'}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dental Consultation Record - ${cons.patient_name}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 24px; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #059669; padding-bottom: 16px; margin-bottom: 24px; }
            .logo { font-size: 22px; font-weight: 800; color: #059669; }
            .sub { font-size: 13px; color: #64748b; font-weight: 600; }
            .badge { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 24px; }
            .field-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
            .field-val { font-size: 14px; font-weight: 700; color: #0f172a; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 12px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }
            .section-content { font-size: 13px; color: #334155; line-height: 1.6; background: #ffffff; padding: 10px; border-left: 3px solid #059669; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; color: #64748b; }
            .sign-line { width: 200px; border-top: 1px solid #0f172a; text-align: center; padding-top: 6px; font-weight: 700; color: #0f172a; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">🦷 Raihan Dental Clinic</div>
              <div class="sub">Dental Clinic Management & Clinical Records</div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Suite 101, Raihan Dental Health Center • Tel: +1 (555) 234-5678</div>
            </div>
            <div style="text-align: right;">
              <span class="badge">${cons.treatment_category}</span>
              <div style="font-size: 12px; font-weight: 700; color: #475569; margin-top: 6px;">Date: ${cons.consultation_date}</div>
              <div style="font-size: 11px; color: #94a3b8;">Record #${cons.id.slice(0, 10).toUpperCase()}</div>
            </div>
          </div>

          <div class="grid">
            <div>
              <div class="field-label">Patient Name</div>
              <div class="field-val">${cons.patient_name}</div>
              <div style="font-size: 11px; color: #64748b;">${cons.patient_email}</div>
            </div>
            <div>
              <div class="field-label">Attending Dental Surgeon</div>
              <div class="field-val">${docName}</div>
              <div style="font-size: 11px; color: #64748b;">General Dental Practitioner (BDS, MDS)</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Patient Complaints & History of Present Illness</div>
            <div class="section-content">${cons.complaints}</div>
          </div>

          <div class="section">
            <div class="section-title">Dental Examination & Intra-Oral Findings</div>
            <div class="section-content">${cons.examination_findings || 'Standard intra-oral examination completed.'}</div>
          </div>

          <div class="section">
            <div class="section-title">Clinical Diagnosis</div>
            <div class="section-content" style="font-weight: 700; color: #0f172a;">${cons.diagnosis}</div>
          </div>

          <div class="section">
            <div class="section-title">Dental Treatment Performed</div>
            <div class="section-content">${cons.treatment_performed}</div>
          </div>

          <div class="section">
            <div class="section-title">Post-Operative Instructions & Oral Care</div>
            <div class="section-content">${cons.follow_up_instructions}</div>
          </div>

          ${cons.next_visit_date ? `
            <div class="section">
              <div class="section-title">Next Recommended Dental Recall</div>
              <div class="section-content" style="font-weight: 700;">${cons.next_visit_date}</div>
            </div>
          ` : ''}

          <div class="footer">
            <div>
              Official Clinical Record • Raihan Dental Clinic<br/>
              Retain for personal dental health history.
            </div>
            <div class="sign-line">
              ${docName}<br/>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">Attending Dentist Signature</span>
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

  const filteredConsultations = consultations.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.patient_name || '').toLowerCase().includes(q) ||
      (c.diagnosis || '').toLowerCase().includes(q) ||
      (c.treatment_category || '').toLowerCase().includes(q) ||
      (c.complaints || '').toLowerCase().includes(q) ||
      (c.dentist_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {isDentist ? 'Clinical Records & Treatments' : 'My Dental History'}
            </span>
            <span className="text-xs text-slate-400 font-medium">• Raihan Dental Clinic</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Dental Consultations & Treatment History
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            {isDentist 
              ? 'Document patient complaints, dental examination findings, diagnoses, procedures performed, and follow-up care.'
              : 'Review your completed dental visits, intra-oral examination findings, diagnostic reports, and oral care instructions.'}
          </p>
        </div>

        {isDentist && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Record Dental Consultation</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search consultations by patient name, diagnosis, symptoms, or treatment..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-900 dark:text-slate-100 transition-colors"
        />
      </div>

      {/* Consultations List */}
      {filteredConsultations.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto border border-emerald-100 dark:border-emerald-800">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">No Consultation Records Found</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchQuery 
              ? 'No dental consultation records match your search criteria.' 
              : isDentist 
                ? 'Click "Record Dental Consultation" above to document a completed patient treatment.'
                : 'Your dental consultations and completed treatment records will be displayed here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredConsultations.map(cons => (
            <motion.div
              key={cons.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-base border border-emerald-200 dark:border-emerald-800 shrink-0">
                    {(cons.patient_name || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{cons.patient_name}</h4>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {cons.treatment_category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Patient: {cons.patient_email} • Attending: {cons.dentist_name?.startsWith('Dr.') ? cons.dentist_name : `Dr. ${cons.dentist_name || 'Raihan'}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60 text-right space-y-0.5">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Date</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{cons.consultation_date}</span>
                  </div>
                  <button
                    onClick={() => handlePrint(cons)}
                    className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    title="Print Dental Record"
                  >
                    <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </button>
                </div>
              </div>

              {/* Consultation Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                
                {/* Patient Complaints */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Chief Complaint & Symptoms
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "{cons.complaints}"
                  </p>
                </div>

                {/* Examination Findings */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Dental Examination Findings
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {cons.examination_findings || 'Standard intra-oral clinical evaluation.'}
                  </p>
                </div>

                {/* Diagnosis */}
                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50 space-y-1">
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                    Clinical Diagnosis
                  </span>
                  <p className="text-xs text-emerald-950 dark:text-emerald-200 font-semibold leading-relaxed">
                    {cons.diagnosis}
                  </p>
                </div>

                {/* Treatment Performed */}
                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50 space-y-1">
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                    Treatment Performed
                  </span>
                  <p className="text-xs text-emerald-950 dark:text-emerald-200 font-semibold leading-relaxed">
                    {cons.treatment_performed}
                  </p>
                </div>

              </div>

              {/* Follow-up & Next Visit */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Follow-up Instructions</span>
                  <p className="text-slate-700 dark:text-slate-300 font-normal text-xs">{cons.follow_up_instructions}</p>
                </div>

                {cons.next_visit_date && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Next Recall: {cons.next_visit_date}</span>
                  </div>
                )}
              </div>

            </motion.div>
          ))}
        </div>
      )}

      {/* Record Dental Consultation Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Record Dental Consultation</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Document clinical exam, diagnosis, and treatment</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitConsultation} className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                
                {/* Registered Patient Quick Picker */}
                {registeredPatients.length > 0 && (
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Select Registered Patient</label>
                    <select
                      onChange={(e) => {
                        const found = registeredPatients.find(p => p.email.toLowerCase() === e.target.value.toLowerCase());
                        if (found) {
                          setFormPatientName(found.name);
                          setFormPatientEmail(found.email);
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Choose registered patient or enter manually below --</option>
                      {registeredPatients.map(p => (
                        <option key={p.email} value={p.email}>{p.name} ({p.email})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Patient & Date Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Patient Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Patient Full Name"
                      value={formPatientName}
                      onChange={(e) => setFormPatientName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Patient Email</label>
                    <input
                      type="email"
                      required
                      placeholder="patient@example.com"
                      value={formPatientEmail}
                      onChange={(e) => setFormPatientEmail(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Consultation Date</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Treatment Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => handleCategoryChange(e.target.value as DentalTreatmentCategory)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {DENTAL_TREATMENT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Complaints */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                    Patient Complaints <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formComplaints}
                    onChange={(e) => setFormComplaints(e.target.value)}
                    placeholder="E.g., Sharp pain on lower molar when chewing, food traps between teeth..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                {/* Examination Findings */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                    Dental Examination Findings
                  </label>
                  <textarea
                    rows={2}
                    value={formFindings}
                    onChange={(e) => setFormFindings(e.target.value)}
                    placeholder="E.g., Tooth #36 occlusal decay, gingival sulcus depth 3mm, cold test sensitive..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                {/* Diagnosis & Treatment Performed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                      Diagnosis <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formDiagnosis}
                      onChange={(e) => setFormDiagnosis(e.target.value)}
                      placeholder="E.g., Acute Pulpitis, Plaque-induced Gingivitis..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                      Treatment Performed
                    </label>
                    <input
                      type="text"
                      value={formTreatmentPerformed}
                      onChange={(e) => setFormTreatmentPerformed(e.target.value)}
                      placeholder="E.g., Ultrasonic scaling, Composite restoration, RCT pulpectomy..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Follow-up & Next Visit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                      Follow-up & Oral Care Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={formFollowUp}
                      onChange={(e) => setFormFollowUp(e.target.value)}
                      placeholder="E.g., Avoid hard foods for 24h, rinse with warm salt water twice daily..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Next Recommended Visit</label>
                      <input
                        type="date"
                        value={formNextVisit}
                        onChange={(e) => setFormNextVisit(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Treatment Fee ($)</label>
                      <input
                        type="number"
                        value={formCost}
                        onChange={(e) => setFormCost(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <FileCheck className="w-4 h-4 text-white" />
                    <span>Save Consultation Record & Notify Patient</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
