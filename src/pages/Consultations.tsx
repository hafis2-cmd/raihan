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
  ChevronRight, 
  Sparkles,
  Info,
  ShieldCheck,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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
  const { profile, user } = useAuth();
  const isDentist = profile?.role === 'Doctor' || profile?.role === 'Dentist';

  const [consultations, setConsultations] = useState<DentalConsultation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<DentalConsultation | null>(null);

  // Form State for new consultation
  const [formPatientEmail, setFormPatientEmail] = useState('patient@telemed.com');
  const [formPatientName, setFormPatientName] = useState('John Doe');
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

  // Load consultations
  const loadData = () => {
    const all = getLocalConsultations();
    if (profile?.email) {
      const emailLower = profile.email.toLowerCase().trim();
      if (isDentist) {
        // Dentists see consultations they conducted
        setConsultations(all.filter(c => (c.dentist_email || '').toLowerCase().trim() === emailLower || isDentist));
      } else {
        // Patients see their own records
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
        patient_email: formPatientEmail,
        patient_name: formPatientName,
        dentist_email: profile?.email || 'dr.raihan@telemed.com',
        dentist_name: profile?.name || 'Dr. Raihan (BDS, MDS)',
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
      // Reset
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

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dental Consultation Record - ${cons.patient_name}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 24px; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #059669; padding-bottom: 16px; margin-bottom: 24px; }
            .logo { font-size: 24px; font-weight: 900; color: #059669; }
            .sub { font-size: 13px; color: #64748b; font-weight: 600; }
            .badge { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 24px; }
            .field-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
            .field-val { font-size: 14px; font-weight: 700; color: #0f172a; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 12px; font-weight: 900; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }
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
              <div class="field-val">${cons.dentist_name}</div>
              <div style="font-size: 11px; color: #64748b;">Chief Dental Surgeon (BDS, MDS)</div>
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
              ${cons.dentist_name}<br/>
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
    const matchesCategory = selectedCategory === 'All' || c.treatment_category === selectedCategory;
    const matchesSearch = 
      (c.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.diagnosis || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.treatment_category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.complaints || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              {isDentist ? 'Clinical Records & Treatments' : 'My Dental History'}
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Dental Care Management</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
            Dental Consultations & Treatment History
          </h1>
          <p className="text-slate-500 font-medium text-sm md:text-base">
            {isDentist 
              ? 'Document patient complaints, dental examination findings, diagnoses, procedures performed, and follow-up care.'
              : 'View your completed dental procedures, diagnostic reports, and oral care instructions from your dentist.'}
          </p>
        </div>

        {isDentist && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-xs hover:bg-slate-800 transition-all shadow-md shadow-slate-200 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Record Dental Consultation</span>
          </button>
        )}
      </div>

      {/* Search & Category Filter Pills */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient name, diagnosis, complaints, or procedure..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-xs transition-all shadow-xs"
          />
        </div>

        {/* Treatment Category Filter Pills */}
        <div className="flex flex-wrap gap-2 pt-1 overflow-x-auto pb-1 custom-scrollbar">
          {['All', ...DENTAL_TREATMENT_CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                selectedCategory === cat 
                  ? "bg-emerald-600 text-white shadow-xs" 
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Consultations List */}
      {filteredConsultations.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-[2.5rem] border border-slate-200 shadow-sm space-y-3">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto">
            <Stethoscope className="w-8 h-8 text-emerald-500" />
          </div>
          <h4 className="font-bold text-slate-800 text-base">No Consultation Records Found</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery 
              ? 'No dental consultation records match your filter criteria.' 
              : isDentist 
                ? 'Click "Record Dental Consultation" above to document a patient procedure.'
                : 'Your dental consultations and treatment history will be displayed here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredConsultations.map(cons => (
            <motion.div
              key={cons.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 sm:p-7 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-5"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xl border border-emerald-200 shrink-0">
                    {(cons.patient_name || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-black text-slate-800">{cons.patient_name}</h4>
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {cons.treatment_category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Patient: {cons.patient_email} • Attending: {cons.dentist_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-right space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Date</span>
                    <span className="text-xs font-bold text-slate-800">{cons.consultation_date}</span>
                  </div>
                  <button
                    onClick={() => handlePrint(cons)}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                    title="Print Dental Record"
                  >
                    <Printer className="w-4 h-4 text-emerald-600" />
                  </button>
                </div>
              </div>

              {/* Consultation Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* Patient Complaints */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Chief Complaint & Symptoms
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-semibold italic">
                    "{cons.complaints}"
                  </p>
                </div>

                {/* Examination Findings */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Dental Examination Findings
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                    {cons.examination_findings || 'Standard intra-oral clinical evaluation.'}
                  </p>
                </div>

                {/* Diagnosis */}
                <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">
                    Clinical Diagnosis
                  </span>
                  <p className="text-xs text-emerald-950 font-bold leading-relaxed">
                    {cons.diagnosis}
                  </p>
                </div>

                {/* Treatment Performed */}
                <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">
                    Treatment Performed
                  </span>
                  <p className="text-xs text-emerald-950 font-bold leading-relaxed">
                    {cons.treatment_performed}
                  </p>
                </div>

              </div>

              {/* Follow-up & Next Visit */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Follow-up Instructions</span>
                  <p className="text-slate-700 font-medium text-xs">{cons.follow_up_instructions}</p>
                </div>

                {cons.next_visit_date && (
                  <div className="bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 font-bold">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Record Dental Consultation</h3>
                    <p className="text-xs text-slate-500 font-medium">Document clinical exam, diagnosis, and treatment</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitConsultation} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-xs">
                
                {/* Patient & Date Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 uppercase tracking-wider">Patient Name</label>
                    <input
                      type="text"
                      required
                      value={formPatientName}
                      onChange={(e) => setFormPatientName(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 uppercase tracking-wider">Patient Email</label>
                    <input
                      type="email"
                      required
                      value={formPatientEmail}
                      onChange={(e) => setFormPatientEmail(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 uppercase tracking-wider">Consultation Date</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 uppercase tracking-wider">Treatment Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => handleCategoryChange(e.target.value as DentalTreatmentCategory)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {DENTAL_TREATMENT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Complaints */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider">
                    Patient Complaints <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formComplaints}
                    onChange={(e) => setFormComplaints(e.target.value)}
                    placeholder="E.g., Sharp pain on lower molar when chewing, food traps between teeth..."
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-medium"
                  />
                </div>

                {/* Examination Findings */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider">
                    Dental Examination Findings
                  </label>
                  <textarea
                    rows={2}
                    value={formFindings}
                    onChange={(e) => setFormFindings(e.target.value)}
                    placeholder="E.g., Tooth #36 occlusal decay, gingival sulcus depth 3mm, cold test sensitive..."
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-medium"
                  />
                </div>

                {/* Diagnosis & Treatment Performed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 uppercase tracking-wider">
                      Diagnosis <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formDiagnosis}
                      onChange={(e) => setFormDiagnosis(e.target.value)}
                      placeholder="E.g., Acute Pulpitis, Plaque-induced Gingivitis..."
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 uppercase tracking-wider">
                      Treatment Performed
                    </label>
                    <input
                      type="text"
                      value={formTreatmentPerformed}
                      onChange={(e) => setFormTreatmentPerformed(e.target.value)}
                      placeholder="E.g., Ultrasonic scaling, Composite restoration, RCT pulpectomy..."
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Follow-up & Next Visit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 uppercase tracking-wider">
                      Follow-up & Oral Care Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={formFollowUp}
                      onChange={(e) => setFormFollowUp(e.target.value)}
                      placeholder="E.g., Avoid hard foods for 24h, rinse with warm salt water twice daily..."
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-medium"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 uppercase tracking-wider">Next Recommended Visit</label>
                      <input
                        type="date"
                        value={formNextVisit}
                        onChange={(e) => setFormNextVisit(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 uppercase tracking-wider">Treatment Fee ($)</label>
                      <input
                        type="number"
                        value={formCost}
                        onChange={(e) => setFormCost(Number(e.target.value))}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 cursor-pointer disabled:opacity-50"
                  >
                    <FileCheck className="w-4 h-4 text-emerald-400" />
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
