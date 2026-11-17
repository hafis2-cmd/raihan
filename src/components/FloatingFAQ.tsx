import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, 
  X, 
  Search, 
  Activity, 
  Video, 
  ShieldAlert, 
  ShieldCheck, 
  Clipboard, 
  Heart, 
  Clock, 
  ChevronDown,
  Info,
  Calendar,
  FileText,
  MessageSquare,
  CreditCard
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: 'appointments' | 'prescriptions' | 'messages' | 'billing';
}

const FAQ_DATABASE: FAQItem[] = [
  // Appointments
  {
    category: 'appointments',
    question: "How do I book a dental appointment with the dentist?",
    answer: "Go to the Appointments page, view Dr. Raihan's dental profile, select your preferred date and time slot from the clinic schedule, enter your dental complaint, and submit your request. The dentist will review and approve your appointment."
  },
  {
    category: 'appointments',
    question: "Is my dental appointment confirmed immediately upon request?",
    answer: "Appointment requests start with PENDING status. Only the dentist has the clinical authority to ACCEPT or REJECT requests. Once confirmed, you receive an instant notification with appointment details."
  },
  {
    category: 'appointments',
    question: "Can I sync my confirmed appointment to Google Calendar?",
    answer: "Yes! Each confirmed appointment card features a 'Sync' button that exports the dental visit details, dentist name, and clinic location directly to your Google Calendar."
  },
  {
    category: 'appointments',
    question: "How do I cancel a dental appointment?",
    answer: "Under the Appointments page, locate your appointment and click 'Cancel' to release the reserved chair slot so another dental patient can book."
  },

  // Prescriptions
  {
    category: 'prescriptions',
    question: "How do I print or download my dental prescription?",
    answer: "Navigate to the Prescriptions tab, select any prescription, and click 'Download PDF'. This generates an official Raihan Dental Clinic printable prescription complete with dental medication dosages, instructions, and dental surgeon verification stamps."
  },
  {
    category: 'prescriptions',
    question: "Can dentists issue digital dental prescriptions directly on the platform?",
    answer: "Yes, registered dental surgeons can prescribe common dental antibiotics, analgesics, antiseptic mouth rinses, and oral pastes with itemized instructions directly from the patient dental chart."
  },

  // Messages
  {
    category: 'messages',
    question: "Is patient-dentist messaging private and secure?",
    answer: "Yes. All direct messages between dental patients and dentists are protected by encrypted database rules. You can safely discuss post-op oral care, teeth sensitivity, or follow-up instructions."
  },
  {
    category: 'messages',
    question: "Can I send dental x-rays or clinical photos in the chat?",
    answer: "Yes! The chat window supports attaching images and PDF files so your dentist can inspect dental radiographs, intraoral photos, or past treatment records."
  },

  // Billing & Payments
  {
    category: 'billing',
    question: "How do I pay dental consultation or procedure fees?",
    answer: "When a dental consultation or treatment (e.g. Scaling, Root Canal, Crown) is recorded, an invoice appears in your Payments tab. Click 'Pay Now' to complete your payment securely."
  },
  {
    category: 'billing',
    question: "Where do I get dental treatment receipts for insurance claims?",
    answer: "Every completed transaction in the Payments tab has a 'Download PDF Receipt' icon. Click it to print or save a formal Raihan Dental Clinic invoice receipt with itemized dental codes and clinic verification."
  }
];

export default function FloatingFAQ() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'appointments' | 'prescriptions' | 'messages' | 'billing'>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Filter FAQs based on tab and query
  const filteredFAQs = FAQ_DATABASE.filter(faq => {
    if (activeTab !== 'all' && faq.category !== activeTab) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const criteria = searchQuery.toLowerCase();
      return (
        faq.question.toLowerCase().includes(criteria) ||
        faq.answer.toLowerCase().includes(criteria)
      );
    }
    return true;
  });

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <>
      {/* Floating Action Help Trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-slate-900 dark:bg-emerald-600 text-white font-extrabold text-xs tracking-wider uppercase pl-3.5 pr-4.5 py-3 rounded-full shadow-2xl hover:bg-slate-800 dark:hover:bg-emerald-700 transition-all border border-slate-800 dark:border-emerald-500/30 group cursor-pointer"
          id="floating-help-faq-btn"
        >
          <HelpCircle className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform duration-300" />
          <span>Help Center</span>
        </motion.button>
      </div>

      {/* FAQ Modal Panel Overlays */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
            {/* Backdrop click closer */}
            <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]"
            >
              {/* Top Custom Header */}
              <div className="p-6 pb-4 border-b border-slate-150 dark:border-slate-800 shrink-0 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
                      <HelpCircle className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 dark:text-slate-100 tracking-tight text-base sm:text-lg">Raihan Dental Clinic Help Center</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Patient & Dentist Clinic Guide</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Sub-disclaimer info banner */}
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-2xl flex items-start gap-2 text-[10px] text-emerald-850 dark:text-emerald-400 font-semibold leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>All your dental consultations, prescriptions, and private clinical records are securely retained.</span>
                </div>

                {/* Categories filtering tabs */}
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl overflow-x-auto">
                  {(['all', 'appointments', 'prescriptions', 'messages', 'billing'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setActiveTab(cat);
                        setExpandedIndex(null);
                      }}
                      className={`flex-1 text-[9px] font-black uppercase tracking-wider py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center shrink-0 ${
                        activeTab === cat 
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                          : "text-slate-400 hover:text-slate-650"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Simple Live Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search appointments, prescriptions, billing..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 placeholder-slate-400 outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                </div>
              </div>

              {/* Scrollable Questions Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {filteredFAQs.length > 0 ? (
                  filteredFAQs.map((faq, index) => {
                    const isExpanded = expandedIndex === index;
                    return (
                      <div 
                        key={index}
                        className="border border-slate-100 dark:border-slate-800 hover:border-emerald-250/50 dark:hover:border-slate-700 rounded-2xl overflow-hidden bg-slate-50/55 dark:bg-slate-850/40 transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => toggleExpand(index)}
                          className="w-full text-left px-4 py-3.5 flex items-start justify-between gap-3 cursor-pointer"
                        >
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-755 shadow-xs">
                              {faq.category === 'appointments' && (
                                <>
                                  <Calendar className="w-2.5 h-2.5 text-blue-500" />
                                  Appointments
                                </>
                              )}
                              {faq.category === 'prescriptions' && (
                                <>
                                  <FileText className="w-2.5 h-2.5 text-emerald-500" />
                                  Prescriptions
                                </>
                              )}
                              {faq.category === 'messages' && (
                                <>
                                  <MessageSquare className="w-2.5 h-2.5 text-indigo-500" />
                                  Messages
                                </>
                              )}
                              {faq.category === 'billing' && (
                                <>
                                  <CreditCard className="w-2.5 h-2.5 text-amber-500" />
                                  Payments
                                </>
                              )}
                            </span>
                            <span className="block text-slate-800 dark:text-slate-250 font-black text-xs leading-relaxed">
                              {faq.question}
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                            >
                              <p className="p-4 text-slate-600 dark:text-slate-400 font-medium text-xs leading-relaxed select-text">
                                {faq.answer}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 px-4 space-y-3">
                    <Info className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-slate-400 font-bold text-xs">No matching healthcare topics found.</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">Try querying simpler keywords like 'accuracy', 'WebRTC', 'HIPAA', or 'share'.</p>
                  </div>
                )}
              </div>

              {/* Bottom HIPAA compliance lock */}
              <div className="p-5.5 bg-slate-900 text-white shrink-0 sm:rounded-b-[2.5rem] flex items-center justify-between gap-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4.5 h-4.5 text-emerald-400 animate-pulse shrink-0" />
                  <div className="translate-y-0.5">
                    <span className="block text-[8px] font-black tracking-widest uppercase text-emerald-400">HIPAA Secure Portal</span>
                    <span className="block text-[9px] text-slate-450 font-bold leading-none">All health assets are fully encrypted.</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
