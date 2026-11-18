import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  Download,
  Filter,
  Loader2,
  X,
  ShieldCheck,
  Receipt,
  Copy,
  Check,
  QrCode,
  FileText,
  Eye,
  Trash2,
  Edit3,
  AlertTriangle,
  Printer,
  Smartphone,
  ExternalLink,
  History,
  Phone,
  User as UserIcon,
  HelpCircle
} from 'lucide-react';
import { useAuth, getRegisteredPatients } from '../context/AuthContext';
import { 
  CLINIC_UPI_CONFIG,
  ConsultationInvoice,
  PaymentSubmission,
  PaymentReceipt,
  BillingStats,
  InvoiceStatus,
  PaymentApp,
  fetchInvoices,
  assignConsultationFee,
  modifyConsultationFee,
  revokeInvoice,
  submitPayment,
  verifyPayment,
  rejectPayment,
  fetchBillingStats,
  getLocalInvoices
} from '../services/billingService';
import { getLocalAppointments } from '../services/appointmentService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Payments() {
  const { user, profile } = useAuth();
  const isDentist = profile?.role === 'Doctor' || profile?.role === 'Dentist';

  const [invoices, setInvoices] = useState<ConsultationInvoice[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PENDING_VERIFICATION' | 'PAID' | 'REVOKED' | 'REJECTED'>('ALL');

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignInitialData, setAssignInitialData] = useState<{ patientEmail?: string; appointmentId?: string } | null>(null);
  const [selectedPayInvoice, setSelectedPayInvoice] = useState<ConsultationInvoice | null>(null);
  const [selectedVerifyInvoice, setSelectedVerifyInvoice] = useState<ConsultationInvoice | null>(null);
  const [selectedRejectInvoice, setSelectedRejectInvoice] = useState<ConsultationInvoice | null>(null);
  const [selectedModifyInvoice, setSelectedModifyInvoice] = useState<ConsultationInvoice | null>(null);
  const [selectedRevokeInvoice, setSelectedRevokeInvoice] = useState<ConsultationInvoice | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const [selectedAuditInvoice, setSelectedAuditInvoice] = useState<ConsultationInvoice | null>(null);

  // Success / Error Feedback
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const showToast = (successMsg?: string, errorMsg?: string) => {
    if (successMsg) {
      setActionSuccess(successMsg);
      setTimeout(() => setActionSuccess(null), 4000);
    }
    if (errorMsg) {
      setActionError(errorMsg);
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const loadData = async () => {
    if (!profile?.email) return;
    try {
      const data = await fetchInvoices(profile.email, user?.token);
      setInvoices(data);
      if (isDentist) {
        const statsData = await fetchBillingStats(profile.email, user?.token);
        setStats(statsData);
      }
    } catch (e) {
      console.warn("Error loading billing data:", e);
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();

  useEffect(() => {
    if (location.state) {
      const state = location.state as {
        patientEmail?: string;
        appointmentId?: string;
        openAssign?: boolean;
      };
      if (isDentist && (state.patientEmail || state.openAssign)) {
        setAssignInitialData({
          patientEmail: state.patientEmail,
          appointmentId: state.appointmentId
        });
        setShowAssignModal(true);
      } else if (!isDentist && state.appointmentId && invoices.length > 0) {
        const matching = invoices.find(i => i.appointmentId === state.appointmentId && (i.status === 'PENDING' || i.status === 'REJECTED'));
        if (matching) {
          setSelectedPayInvoice(matching);
        }
      }
    }
  }, [location.state, isDentist, invoices]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('raihan_invoices_updated', handleUpdate);
    window.addEventListener('raihan_payments_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('raihan_invoices_updated', handleUpdate);
      window.removeEventListener('raihan_payments_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [profile?.email, isDentist]);

  // Compute metrics for patient
  const patientTotalPaid = invoices
    .filter(i => i.status === 'PAID')
    .reduce((sum, i) => sum + i.amount, 0);

  const patientPendingDue = invoices
    .filter(i => i.status === 'PENDING' || i.status === 'REJECTED')
    .reduce((sum, i) => sum + i.amount, 0);

  const patientAwaitingVerification = invoices.filter(i => i.status === 'PENDING_VERIFICATION');

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesFilter = statusFilter === 'ALL' || inv.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = 
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.patientName.toLowerCase().includes(q) ||
      inv.patientEmail.toLowerCase().includes(q) ||
      inv.description.toLowerCase().includes(q) ||
      inv.submissions.some(s => s.transactionReference.toLowerCase().includes(q));

    return matchesFilter && matchesQuery;
  });

  const submissionsAwaitingVerification = invoices.filter(i => i.status === 'PENDING_VERIFICATION');

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      
      {/* Toast Feedback */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </motion.div>
        )}
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs font-medium flex items-center gap-2 shadow-sm"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {isDentist ? 'Clinical Billing & Invoicing' : 'Patient Payment Portal'}
            </span>
            <span className="text-xs text-slate-400 font-medium">• PhonePe Static UPI Integration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {isDentist ? 'Consultation Billing & Payment Verification' : 'Dental Treatment Billing & UPI Payments'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            {isDentist 
              ? 'Assign consultation fees, verify incoming PhonePe UPI settlements against the clinic bank account, and issue official receipts.'
              : 'View mandatory consultation fees assigned by Dr. Raihan, scan our official PhonePe QR code, and submit your UTR for verification.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isDentist && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Consultation Fee</span>
            </button>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* DENTIST DASHBOARD VIEW                                            */}
      {/* ================================================================= */}
      {isDentist ? (
        <div className="space-y-6">
          
          {/* Dentist Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/60">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Verified Collections</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  ₹{(stats?.totalVerifiedRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{stats?.paidInvoicesCount || 0} invoice(s) paid</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800/60">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Awaiting Verification</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats?.awaitingVerificationCount || 0}
                </h3>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">₹{(stats?.awaitingVerificationAmount || 0).toLocaleString('en-IN')} pending check</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Unpaid Invoices</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats?.pendingInvoicesCount || 0}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">₹{(stats?.pendingInvoicesAmount || 0).toLocaleString('en-IN')} pending</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/60">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Invoices</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats?.totalInvoicesCount || 0}
                </h3>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Issued by clinic</p>
              </div>
            </div>
          </div>

          {/* Submissions Awaiting Clinical Verification Queue */}
          {submissionsAwaitingVerification.length > 0 && (
            <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-amber-200/80 dark:border-amber-800/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-lg">
                    <Clock className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200 tracking-tight">
                      Patient Payment Submissions Awaiting Clinical Verification ({submissionsAwaitingVerification.length})
                    </h2>
                    <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
                      Check your PhonePe / bank receiving statement before approving. Verified invoices immediately generate official receipts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submissionsAwaitingVerification.map((inv) => {
                  const latestSub = inv.submissions[0];
                  return (
                    <div 
                      key={inv.id} 
                      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-800/80 space-y-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase block">{inv.invoiceNumber}</span>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{inv.patientName}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{inv.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 block">
                            ₹{inv.amount.toFixed(2)}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Awaiting Check
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-1 border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Submitted UTR:</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 select-all">{latestSub?.transactionReference || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Payment App:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{latestSub?.paymentApp || 'UPI'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Payment Date:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{latestSub?.paymentDate || 'N/A'}</span>
                        </div>
                        {latestSub?.screenshotUrl && (
                          <div className="pt-1 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-slate-400">Screenshot:</span>
                            <a 
                              href={latestSub.screenshotUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1"
                            >
                              <span>View Image</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setSelectedVerifyInvoice(inv)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify Payment</span>
                        </button>
                        <button
                          onClick={() => setSelectedRejectInvoice(inv)}
                          className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Invoices Directory Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">All Clinical Invoices & Fee Ledger</h3>
                <span className="text-xs text-slate-400">({invoices.length} total)</span>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {(['ALL', 'PENDING_VERIFICATION', 'PENDING', 'PAID', 'REVOKED', 'REJECTED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer capitalize",
                      statusFilter === st 
                        ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs" 
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by invoice number, patient name, email, procedure, or UTR..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Invoices List Table */}
            <div className="overflow-x-auto">
              {filteredInvoices.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No invoices match your filter</p>
                  <p className="text-xs text-slate-400">Assign a consultation fee to a patient to get started.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Invoice / Date</th>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Patient</th>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Procedure Description</th>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Fee (INR)</th>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 block">{inv.invoiceNumber}</span>
                          <span className="text-[11px] text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">{inv.patientName}</span>
                          <span className="text-[11px] text-slate-400">{inv.patientEmail}</span>
                        </td>
                        <td className="px-5 py-4 max-w-xs">
                          <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1 block">{inv.description}</span>
                          {inv.submissions.length > 0 && (
                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                              Latest UTR: {inv.submissions[0].transactionReference}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            ₹{inv.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-[10px] font-semibold border inline-flex items-center gap-1",
                            inv.status === 'PAID' && "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                            inv.status === 'PENDING_VERIFICATION' && "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
                            inv.status === 'PENDING' && "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
                            inv.status === 'REVOKED' && "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
                            inv.status === 'REJECTED' && "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800"
                          )}>
                            {inv.status === 'PAID' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {inv.status === 'PENDING_VERIFICATION' && <Clock className="w-3 h-3 text-amber-600" />}
                            {inv.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                          {inv.status === 'PENDING_VERIFICATION' && (
                            <button
                              onClick={() => setSelectedVerifyInvoice(inv)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>
                          )}

                          {inv.status === 'PAID' && inv.receipt && (
                            <button
                              onClick={() => setSelectedReceipt(inv.receipt!)}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                              title="View & Download Official Receipt"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Receipt</span>
                            </button>
                          )}

                          {(inv.status === 'PENDING' || inv.status === 'REJECTED') && (
                            <>
                              <button
                                onClick={() => setSelectedModifyInvoice(inv)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Modify Consultation Fee"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setSelectedRevokeInvoice(inv)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Revoke Payment Request"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setSelectedAuditInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Audit History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (

        /* =============================================================== */
        /* PATIENT PORTAL VIEW                                             */
        /* =============================================================== */
        <div className="space-y-6">
          
          {/* Patient Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/60">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Settled to Clinic</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  ₹{patientTotalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Verified receipts issued</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800/60">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Consultation Fees</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  ₹{patientPendingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Mandatory payment</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/60">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Invoices</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {invoices.length}
                </h3>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Raihan Dental Health Center</p>
              </div>
            </div>
          </div>

          {/* Alert: Awaiting Verification Submissions */}
          {patientAwaitingVerification.length > 0 && (
            <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold text-xs">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Payment Verification in Progress ({patientAwaitingVerification.length} invoice)</span>
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                You have submitted your UPI reference for clinical verification. Dr. Raihan is checking the incoming credit in the clinic PhonePe business account. Your official receipt will be generated as soon as verification completes.
              </p>
              <div className="space-y-2 pt-1">
                {patientAwaitingVerification.map(inv => (
                  <div key={inv.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{inv.invoiceNumber}</span>
                      <span className="text-slate-400 ml-2">• {inv.description}</span>
                      <span className="text-[11px] text-amber-600 block mt-0.5">Submitted UTR: {inv.submissions[0]?.transactionReference}</span>
                    </div>
                    <span className="font-bold text-emerald-600 text-sm">₹{inv.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-0">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Assigned Consultation Invoices</h3>
              </div>
              <span className="text-xs text-slate-400">{invoices.length} total invoice(s)</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Pending Invoices</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    You currently have no outstanding consultation fees. When Dr. Raihan assigns a fee for your visit, it will appear here with our official PhonePe QR code.
                  </p>
                </div>
              ) : (
                invoices.map((inv) => (
                  <div key={inv.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">{inv.invoiceNumber}</span>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-md text-[10px] font-semibold border",
                          inv.status === 'PAID' && "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                          inv.status === 'PENDING_VERIFICATION' && "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
                          inv.status === 'PENDING' && "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
                          inv.status === 'REVOKED' && "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
                          inv.status === 'REJECTED' && "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800"
                        )}>
                          {inv.status.replace(/_/g, ' ')}
                        </span>
                        {inv.dueDate && (
                          <span className="text-[10px] text-slate-400">Due: {inv.dueDate}</span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{inv.description}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Attending Dentist: {inv.dentistName} • Issued: {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                      {inv.status === 'REJECTED' && inv.submissions[0]?.rejectionReason && (
                        <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-lg text-xs mt-1 border border-rose-200 dark:border-rose-800">
                          <strong>Note from Dr. Raihan:</strong> {inv.submissions[0].rejectionReason}. Please resubmit your correct UTR below.
                        </div>
                      )}
                      {inv.status === 'REVOKED' && inv.revocationReason && (
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs mt-1">
                          <strong>Notice:</strong> This invoice was revoked by clinic administration ({inv.revocationReason}).
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-3 shrink-0">
                      <div className="text-left md:text-right">
                        <span className="text-xs text-slate-400 font-medium block">Mandatory Fee</span>
                        <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          ₹{inv.amount.toFixed(2)}
                        </span>
                      </div>

                      {/* Patient Actions */}
                      {(inv.status === 'PENDING' || inv.status === 'REJECTED') && (
                        <button
                          onClick={() => setSelectedPayInvoice(inv)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>Pay via PhonePe QR</span>
                        </button>
                      )}

                      {inv.status === 'PENDING_VERIFICATION' && (
                        <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Awaiting Verification</span>
                        </div>
                      )}

                      {inv.status === 'PAID' && inv.receipt && (
                        <button
                          onClick={() => setSelectedReceipt(inv.receipt!)}
                          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Download Receipt</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* MODALS SECTION                                                  */}
      {/* =============================================================== */}

      {/* 1. PATIENT PAYMENT & QR SCAN MODAL */}
      <AnimatePresence>
        {selectedPayInvoice && (
          <PatientPaymentModal
            invoice={selectedPayInvoice}
            onClose={() => setSelectedPayInvoice(null)}
            onSuccess={(updatedInvoice) => {
              setSelectedPayInvoice(null);
              showToast("Payment reference submitted successfully! Dr. Raihan will verify your settlement shortly.");
              loadData();
            }}
          />
        )}
      </AnimatePresence>

      {/* 2. DENTIST VERIFY PAYMENT MODAL */}
      <AnimatePresence>
        {selectedVerifyInvoice && (
          <DentistVerifyModal
            invoice={selectedVerifyInvoice}
            onClose={() => setSelectedVerifyInvoice(null)}
            onVerified={(receipt) => {
              setSelectedVerifyInvoice(null);
              showToast("Payment verified! Official Clinical Receipt generated.");
              loadData();
              setSelectedReceipt(receipt);
            }}
          />
        )}
      </AnimatePresence>

      {/* 3. DENTIST REJECT PAYMENT MODAL */}
      <AnimatePresence>
        {selectedRejectInvoice && (
          <DentistRejectModal
            invoice={selectedRejectInvoice}
            onClose={() => setSelectedRejectInvoice(null)}
            onRejected={() => {
              setSelectedRejectInvoice(null);
              showToast(undefined, "Payment submission rejected. Patient notified to resubmit.");
              loadData();
            }}
          />
        )}
      </AnimatePresence>

      {/* 4. DENTIST ASSIGN CONSULTATION FEE MODAL */}
      <AnimatePresence>
        {showAssignModal && (
          <AssignFeeModal
            initialPatientEmail={assignInitialData?.patientEmail}
            initialAppointmentId={assignInitialData?.appointmentId}
            onClose={() => {
              setShowAssignModal(false);
              setAssignInitialData(null);
            }}
            onAssigned={(newInv) => {
              setShowAssignModal(false);
              setAssignInitialData(null);
              showToast(`Consultation fee of ₹${newInv.amount.toFixed(2)} assigned under ${newInv.invoiceNumber}`);
              loadData();
            }}
          />
        )}
      </AnimatePresence>

      {/* 5. DENTIST MODIFY FEE MODAL */}
      <AnimatePresence>
        {selectedModifyInvoice && (
          <ModifyFeeModal
            invoice={selectedModifyInvoice}
            onClose={() => setSelectedModifyInvoice(null)}
            onModified={(updatedInv) => {
              setSelectedModifyInvoice(null);
              showToast(`Invoice ${updatedInv.invoiceNumber} fee revised to ₹${updatedInv.amount.toFixed(2)}`);
              loadData();
            }}
          />
        )}
      </AnimatePresence>

      {/* 6. DENTIST REVOKE INVOICE MODAL */}
      <AnimatePresence>
        {selectedRevokeInvoice && (
          <RevokeInvoiceModal
            invoice={selectedRevokeInvoice}
            onClose={() => setSelectedRevokeInvoice(null)}
            onRevoked={(revokedInv) => {
              setSelectedRevokeInvoice(null);
              showToast(undefined, `Invoice ${revokedInv.invoiceNumber} has been revoked.`);
              loadData();
            }}
          />
        )}
      </AnimatePresence>

      {/* 7. OFFICIAL CLINICAL RECEIPT MODAL */}
      <AnimatePresence>
        {selectedReceipt && (
          <ReceiptModal
            receipt={selectedReceipt}
            onClose={() => setSelectedReceipt(null)}
          />
        )}
      </AnimatePresence>

      {/* 8. INVOICE AUDIT HISTORY MODAL */}
      <AnimatePresence>
        {selectedAuditInvoice && (
          <AuditHistoryModal
            invoice={selectedAuditInvoice}
            onClose={() => setSelectedAuditInvoice(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 * PATIENT PAYMENT MODAL: Official PhonePe Static UPI QR Interface
 * ---------------------------------------------------------------------------
 */
function PatientPaymentModal({
  invoice,
  onClose,
  onSuccess
}: {
  invoice: ConsultationInvoice;
  onClose: () => void;
  onSuccess: (updated: ConsultationInvoice) => void;
}) {
  const { user, profile } = useAuth();
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentApp, setPaymentApp] = useState<PaymentApp>('PhonePe');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [screenshotData, setScreenshotData] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(CLINIC_UPI_CONFIG.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Screenshot file exceeds 5 MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      setScreenshotData(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionReference.trim()) {
      setError("Please enter the 12-digit UPI transaction reference (UTR) from your payment.");
      return;
    }
    if (transactionReference.trim().length < 6) {
      setError("Please enter a valid UPI transaction reference number.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await submitPayment(
        invoice.id,
        {
          transactionReference: transactionReference.trim(),
          paymentDate,
          paymentApp,
          screenshot: screenshotData
        },
        profile?.email || user?.email || '',
        user?.token
      );
      onSuccess(result.invoice);
    } catch (err: any) {
      setError(err.message || "Failed to submit payment details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Official PhonePe UPI Payment</h3>
              <p className="text-[11px] text-slate-400">Raihan Dental Health Center • Invoice {invoice.invoiceNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Prominent Mandatory Amount Box (Strictly Read-Only!) */}
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                Assigned Consultation Fee (Mandatory)
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{invoice.description}</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 block font-medium">Exact Amount Payable</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400">
                ₹{invoice.amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Official Static PhonePe QR Code Container */}
          <div className="flex flex-col items-center justify-center space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
            <span className="px-3 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-full text-[11px] font-semibold border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-1.5">
              <span>All in One QR</span>
              <span>•</span>
              <span className="text-emerald-600 font-bold">PhonePe / GPay / Paytm / BHIM</span>
            </span>

            {/* Scannable Clean QR Image */}
            <div className="w-56 h-56 sm:w-64 sm:h-64 bg-white p-3 rounded-2xl border-2 border-emerald-500/70 shadow-md flex items-center justify-center overflow-hidden">
              <img 
                src={CLINIC_UPI_CONFIG.qrAssetUrl} 
                alt="Raihan Dental Clinic PhonePe UPI QR" 
                className="w-full h-full object-contain"
              />
            </div>

            {/* Recipient / Payee Details */}
            <div className="w-full max-w-sm space-y-2 pt-1">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Clinic UPI ID</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 select-all">{CLINIC_UPI_CONFIG.upiId}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="text-left px-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Payee Verified Name in App: <strong className="text-slate-800 dark:text-slate-200">{CLINIC_UPI_CONFIG.payeeName}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Critical Warning Box */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>IMPORTANT PAYMENT INSTRUCTIONS</span>
            </div>
            <p className="leading-relaxed">
              Please pay the <strong>exact amount assigned by the dentist (₹{invoice.amount.toFixed(2)})</strong>. The QR code is a static merchant QR, so you must <strong>manually enter ₹{invoice.amount.toFixed(2)}</strong> in your UPI application. Payment remains pending until verified by the clinic desk.
            </p>
          </div>

          {/* Payment Steps Walkthrough */}
          <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">How to complete your payment:</span>
            <ol className="list-decimal list-inside space-y-1 leading-relaxed">
              <li>Open PhonePe, Google Pay, Paytm, or BHIM.</li>
              <li>Scan the official QR code displayed above.</li>
              <li>Verify recipient shows <strong>{CLINIC_UPI_CONFIG.payeeName}</strong>.</li>
              <li>Enter exact amount: <strong>₹{invoice.amount.toFixed(2)}</strong> and pay.</li>
              <li>Copy the 12-digit <strong>UPI Reference ID / UTR</strong> and enter below.</li>
            </ol>
          </div>

          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
              Submit Transaction Reference (UTR)
            </h4>

            {error && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium border border-rose-200 dark:border-rose-800 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Assigned Amount (Read-Only)
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={`₹${invoice.amount.toFixed(2)}`}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 font-bold outline-none cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Payment Application
                </label>
                <select
                  value={paymentApp}
                  onChange={(e) => setPaymentApp(e.target.value as PaymentApp)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {CLINIC_UPI_CONFIG.supportedApps.map(app => (
                    <option key={app} value={app}>{app}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  12-Digit UPI Transaction ID / UTR <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 412345678901"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500 uppercase tracking-wider"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Payment Date
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Optional Screenshot */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Payment Screenshot (Optional)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  {screenshotData ? 'Change Screenshot' : 'Upload Receipt Screenshot'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleScreenshotSelect}
                  className="hidden"
                />
                {screenshotData && (
                  <span className="text-[11px] text-emerald-600 font-semibold">
                    ✓ Image attached
                  </span>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !transactionReference.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Reference for Verification...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Payment Details for Verification</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 * DENTIST VERIFY MODAL: Checks actual receiving account before issuing receipt
 * ---------------------------------------------------------------------------
 */
function DentistVerifyModal({
  invoice,
  onClose,
  onVerified
}: {
  invoice: ConsultationInvoice;
  onClose: () => void;
  onVerified: (receipt: PaymentReceipt) => void;
}) {
  const { user, profile } = useAuth();
  const [notes, setNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmedBank, setConfirmedBank] = useState(false);
  const [confirmedUtr, setConfirmedUtr] = useState(false);

  const latestSub = invoice.submissions[0];

  const handleVerify = async () => {
    if (!confirmedBank || !confirmedUtr) {
      setError("Please confirm both verification checkboxes after checking your PhonePe / bank receiving statement.");
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      const result = await verifyPayment(
        invoice.id,
        {
          submissionId: latestSub?.id,
          notes: notes.trim()
        },
        profile?.email || user?.email || '',
        user?.token
      );
      onVerified(result.receipt);
    } catch (err: any) {
      setError(err.message || "Failed to verify payment.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Verify PhonePe UPI Settlement</h3>
              <p className="text-[11px] text-slate-400">Clinical Verification & Official Receipt Issuance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium border border-rose-200 dark:border-rose-800 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submission Details Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block uppercase">{invoice.invoiceNumber}</span>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{invoice.patientName}</span>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">{invoice.patientEmail}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Assigned Amount</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">₹{invoice.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Submitted UTR:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 select-all">{latestSub?.transactionReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">UPI App:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{latestSub?.paymentApp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Date:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{latestSub?.paymentDate}</span>
              </div>
              {latestSub?.screenshotUrl && (
                <div className="pt-1 flex justify-between items-center">
                  <span className="text-slate-400">Screenshot:</span>
                  <a href={latestSub.screenshotUrl} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1">
                    <span>View Image</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Verification Protocol Checklist */}
          <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <span className="font-bold text-emerald-900 dark:text-emerald-200 block text-[11px]">
              Clinical Verification Protocol:
            </span>
            <label className="flex items-start gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={confirmedBank}
                onChange={(e) => setConfirmedBank(e.target.checked)}
                className="mt-0.5 accent-emerald-600 cursor-pointer"
              />
              <span>I have checked the clinic PhonePe Merchant app / bank account and confirmed credit of <strong>₹{invoice.amount.toFixed(2)}</strong>.</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={confirmedUtr}
                onChange={(e) => setConfirmedUtr(e.target.checked)}
                className="mt-0.5 accent-emerald-600 cursor-pointer"
              />
              <span>The UTR reference (<strong>{latestSub?.transactionReference}</strong>) matches the bank settlement record.</span>
            </label>
          </div>

          {/* Verification Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Verification Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Verified via PhonePe merchant statement credit alert"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying || !confirmedBank || !confirmedUtr}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Issuing Receipt...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Issue Receipt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 * DENTIST REJECT MODAL: Rejects an invalid or unverifiable payment reference
 * ---------------------------------------------------------------------------
 */
function DentistRejectModal({
  invoice,
  onClose,
  onRejected
}: {
  invoice: ConsultationInvoice;
  onClose: () => void;
  onRejected: () => void;
}) {
  const { user, profile } = useAuth();
  const [reason, setReason] = useState('Payment not credited to clinic account. Please verify your UTR and resubmit.');
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReject = async () => {
    if (!reason.trim()) {
      setError("Please provide a rejection reason so the patient understands what to correct.");
      return;
    }

    setIsRejecting(true);
    setError(null);
    try {
      await rejectPayment(
        invoice.id,
        {
          submissionId: invoice.submissions[0]?.id,
          reason: reason.trim()
        },
        profile?.email || user?.email || '',
        user?.token
      );
      onRejected();
    } catch (err: any) {
      setError(err.message || "Failed to reject payment.");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden space-y-4 p-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Reject Payment Submission</h3>
            <p className="text-[11px] text-slate-400">{invoice.invoiceNumber} • {invoice.patientName}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Rejecting this submission leaves the invoice open so the patient can double-check their bank/UPI statement and resubmit an authentic transaction reference.
        </p>

        {error && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Rejection Reason (Visible to Patient) <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500 text-xs resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isRejecting}
            className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isRejecting || !reason.trim()}
            className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Confirm Rejection</span>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 * DENTIST ASSIGN FEE MODAL: Creates a new consultation fee invoice
 * ---------------------------------------------------------------------------
 */
function AssignFeeModal({
  onClose,
  onAssigned,
  initialPatientEmail,
  initialAppointmentId
}: {
  onClose: () => void;
  onAssigned: (inv: ConsultationInvoice) => void;
  initialPatientEmail?: string;
  initialAppointmentId?: string;
}) {
  const { user, profile } = useAuth();
  const registeredPatients = getRegisteredPatients();
  const appointments = getLocalAppointments();

  const [selectedPatientEmail, setSelectedPatientEmail] = useState(
    initialPatientEmail || registeredPatients[0]?.email || ''
  );
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(
    initialAppointmentId || ''
  );
  const [amount, setAmount] = useState('500');
  const [description, setDescription] = useState('Comprehensive Dental Examination & Consultation');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const COMMON_PROCEDURES = [
    'Comprehensive Dental Examination & Consultation',
    'Root Canal Treatment (RCT) - Phase 1',
    'Root Canal Treatment (RCT) - Final Obturation',
    'Full Mouth Ultrasonic Dental Scaling & Polishing',
    'Tooth Extraction (Simple / Surgical)',
    'Composite Resin Tooth Filling',
    'Porcelain / Ceramic Dental Crown',
    'Orthodontic Alignment Consultation',
    'Emergency Tooth Pain Relief & Temporary Restoration'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPatient = registeredPatients.find(p => p.email.toLowerCase() === selectedPatientEmail.toLowerCase());
    if (!targetPatient) {
      setError("Please select a registered patient.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid consultation fee in INR (₹).");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const newInv = await assignConsultationFee(
        {
          patientEmail: targetPatient.email,
          patientName: targetPatient.name,
          patientPhone: targetPatient.phone,
          amount: numAmount,
          description: description.trim(),
          appointmentId: selectedAppointmentId || undefined,
          dueDate: dueDate || undefined
        },
        profile?.email || user?.email || '',
        user?.token
      );
      onAssigned(newInv);
    } catch (err: any) {
      setError(err.message || "Failed to assign consultation fee.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden space-y-4 p-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Assign Consultation Fee</h3>
              <p className="text-[11px] text-slate-400">Generate Mandatory Patient Clinical Invoice</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium border border-rose-200 dark:border-rose-800 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Patient Selection */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Select Patient <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedPatientEmail}
              onChange={(e) => setSelectedPatientEmail(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {registeredPatients.map(p => (
                <option key={p.email} value={p.email}>
                  {p.name} ({p.email}) {p.phone ? `• ${p.phone}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Related Appointment (Optional) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Related Appointment Visit (Optional)
            </label>
            <select
              value={selectedAppointmentId}
              onChange={(e) => setSelectedAppointmentId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Standalone / Walk-in Clinic Consultation</option>
              {appointments
                .filter(a => a.patient_email.toLowerCase() === selectedPatientEmail.toLowerCase())
                .map(a => (
                  <option key={a.id} value={a.id}>
                    Visit on {a.appointment_date} at {a.appointment_time} ({a.status})
                  </option>
                ))}
            </select>
          </div>

          {/* Consultation Fee (INR) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Consultation Fee (INR ₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500.00"
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Procedure Description */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Billing Description / Dental Procedure <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Root Canal Treatment - Phase 1"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1 pt-1">
              {COMMON_PROCEDURES.slice(0, 4).map(proc => (
                <button
                  type="button"
                  key={proc}
                  onClick={() => setDescription(proc)}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-slate-600 dark:text-slate-400 hover:text-emerald-700 cursor-pointer"
                >
                  {proc}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date (Optional) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Payment Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !amount}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Assign Fee</span>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 * DENTIST MODIFY FEE MODAL: Updates amount with mandatory audit recording
 * ---------------------------------------------------------------------------
 */
function ModifyFeeModal({
  invoice,
  onClose,
  onModified
}: {
  invoice: ConsultationInvoice;
  onClose: () => void;
  onModified: (inv: ConsultationInvoice) => void;
}) {
  const { user, profile } = useAuth();
  const [amount, setAmount] = useState(invoice.amount.toString());
  const [description, setDescription] = useState(invoice.description);
  const [dueDate, setDueDate] = useState(invoice.dueDate || '');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError("Please enter a valid positive amount in INR (₹).");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const updated = await modifyConsultationFee(
        invoice.id,
        {
          amount: num,
          description: description.trim(),
          dueDate: dueDate || undefined,
          notes: notes.trim() || undefined
        },
        profile?.email || user?.email || '',
        user?.token
      );
      onModified(updated);
    } catch (err: any) {
      setError(err.message || "Failed to modify fee.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden space-y-4 p-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Modify Consultation Fee</h3>
              <p className="text-[11px] text-slate-400">{invoice.invoiceNumber} • {invoice.patientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <span className="text-slate-400">Previous Amount:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">₹{invoice.amount.toFixed(2)}</span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Revised Fee (INR ₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Procedure Description
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Reason for Adjustment (Recorded in Audit Trail)
            </label>
            <input
              type="text"
              placeholder="e.g. Added diagnostic imaging fee"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !amount}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Fee</span>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 * DENTIST REVOKE INVOICE MODAL
 * ---------------------------------------------------------------------------
 */
function RevokeInvoiceModal({
  invoice,
  onClose,
  onRevoked
}: {
  invoice: ConsultationInvoice;
  onClose: () => void;
  onRevoked: (inv: ConsultationInvoice) => void;
}) {
  const { user, profile } = useAuth();
  const [reason, setReason] = useState('Consultation rescheduled / fee waived by attending dentist');
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRevoke = async () => {
    setIsRevoking(true);
    setError(null);
    try {
      const revoked = await revokeInvoice(
        invoice.id,
        reason.trim(),
        profile?.email || user?.email || '',
        user?.token
      );
      onRevoked(revoked);
    } catch (err: any) {
      setError(err.message || "Failed to revoke invoice.");
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden space-y-4 p-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Revoke Payment Request?</h3>
            <p className="text-[11px] text-slate-400">{invoice.invoiceNumber} • ₹{invoice.amount.toFixed(2)}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Revoking will cancel this payment request and prevent the patient from submitting payments. The invoice record and its complete audit history will be permanently preserved.
        </p>

        {error && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Revocation Reason
          </label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500 text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isRevoking}
            className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRevoke}
            disabled={isRevoking}
            className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isRevoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Revoke Invoice</span>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 * OFFICIAL CLINICAL RECEIPT MODAL: Printable & Downloadable Clinical Receipt
 * ---------------------------------------------------------------------------
 */
function ReceiptModal({
  receipt,
  onClose
}: {
  receipt: PaymentReceipt;
  onClose: () => void;
}) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Clinical Payment Receipt - ${receipt.receiptNumber}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 24px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 800; color: #059669; }
            .badge { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 4px 14px; border-radius: 9999px; font-weight: 700; font-size: 11px; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; padding: 18px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
            td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .total-row { font-size: 16px; font-weight: 800; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">🦷 Raihan Dental Clinic</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Official Dental Consultation Payment Receipt</div>
              <div style="font-size: 11px; color: #94a3b8;">Raihan Dental Health Center • Kerala, India</div>
            </div>
            <div style="text-align: right;">
              <span class="badge">✔ VERIFIED & SETTLED</span>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 6px;">${receipt.receiptNumber}</div>
              <div style="font-size: 11px; color: #64748b;">Ref Invoice: ${receipt.invoiceNumber}</div>
            </div>
          </div>

          <div class="grid">
            <div>
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Patient Information</div>
              <div style="font-weight: 700; font-size: 14px; margin-top: 4px;">${receipt.patientName}</div>
              <div style="font-size: 12px; color: #64748b;">${receipt.patientEmail}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Attending Clinician</div>
              <div style="font-weight: 700; font-size: 14px; margin-top: 4px;">${receipt.dentistName}</div>
              <div style="font-size: 12px; color: #64748b;">Verified by Dr. Raihan</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Dental Treatment / Service Description</th>
                <th style="text-align: right;">Amount Paid (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${receipt.consultationDetails || 'Clinical Dental Consultation'}</strong><br/>
                  <span style="font-size: 11px; color: #64748b;">Payment Method: PhonePe UPI (${receipt.upiId}) • UTR: ${receipt.transactionReference}</span>
                </td>
                <td style="text-align: right; font-weight: 700; font-size: 14px;">₹${receipt.amount.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Total Verified Settlement</td>
                <td style="text-align: right; color: #059669;">₹${receipt.amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px 16px; border-radius: 10px; font-size: 11px; color: #065f46;">
            <strong>Verification Confirmation:</strong> This receipt certifies that the above fee was verified against the clinic's receiving account (PhonePe Merchant).
          </div>

          <div class="footer">
            Thank you for choosing Raihan Dental Clinic.<br/>
            Please retain this official clinical receipt for dental insurance claims or personal medical records.
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden space-y-4 p-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Official Clinical Receipt</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4 text-xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 text-base block">🦷 Raihan Dental Clinic</span>
              <span className="text-[11px] text-slate-400">Clinical Payment Receipt</span>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                VERIFIED & PAID
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block mt-1">{receipt.receiptNumber}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Patient</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">{receipt.patientName}</span>
              <span className="text-[11px] text-slate-400">{receipt.patientEmail}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Clinician</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">{receipt.dentistName}</span>
              <span className="text-[11px] text-slate-400">Raihan Dental Health Center</span>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Procedure:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{receipt.consultationDetails}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Payment Channel:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">PhonePe UPI ({receipt.upiId})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Transaction Reference:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{receipt.transactionReference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Verification Date:</span>
              <span className="text-slate-700 dark:text-slate-300">{new Date(receipt.verificationDate).toLocaleDateString()}</span>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm font-bold">
              <span>Total Paid</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-base">₹{receipt.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs transition-colors cursor-pointer text-center"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Receipt</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 * INVOICE AUDIT HISTORY MODAL: Transparent timeline of actions
 * ---------------------------------------------------------------------------
 */
function AuditHistoryModal({
  invoice,
  onClose
}: {
  invoice: ConsultationInvoice;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden space-y-4 p-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Invoice Audit Trail</h3>
              <p className="text-[11px] text-slate-400">{invoice.invoiceNumber} • {invoice.patientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-3 text-xs pr-1">
          {invoice.auditHistory.map((entry, idx) => (
            <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
                  {entry.action.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                {entry.notes || `Action executed by ${entry.performedByName}`}
              </p>
              {entry.previousAmount !== undefined && entry.newAmount !== undefined && (
                <div className="text-[11px] text-emerald-600 font-semibold">
                  Amount: ₹{entry.previousAmount.toFixed(2)} → ₹{entry.newAmount.toFixed(2)}
                </div>
              )}
              <span className="text-[10px] text-slate-400 block pt-0.5">
                By: {entry.performedByName} ({entry.performedBy})
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs transition-colors cursor-pointer text-center"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
