import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  X,
  Wallet,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, addDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Payment {
  id: string;
  patientEmail: string;
  patientName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  method?: string;
  timestamp: any;
}

export default function Payments() {
  const { user, profile } = useAuth();
  const isDentist = profile?.role === 'Doctor' || profile?.role === 'Dentist';

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  
  const handleDownloadReceipt = (p: Payment) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dental Invoice Receipt - ${p.id.slice(0, 8).toUpperCase()}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 24px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 20px; }
            .logo { font-size: 22px; font-weight: 800; color: #059669; }
            .paid-badge { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 11px; text-transform: uppercase; }
            .box { background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .total-row { font-size: 15px; font-weight: 700; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">🦷 Raihan Dental Clinic</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Dental Treatment Invoice & Official Clinical Receipt</div>
              <div style="font-size: 11px; color: #94a3b8;">Suite 101, Raihan Dental Health Center • Tel: +1 (555) 234-5678</div>
            </div>
            <div style="text-align: right;">
              <span class="paid-badge">✔ ${p.status.toUpperCase()}</span>
              <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Receipt #${p.id.slice(0, 8).toUpperCase()}</div>
            </div>
          </div>

          <div class="box">
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Patient Information</div>
              <div style="font-weight: 700; margin-top: 4px;">${p.patientName || p.patientEmail}</div>
              <div style="font-size: 12px; color: #64748b;">${p.patientEmail}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Transaction Details</div>
              <div style="margin-top: 4px; font-size: 13px;">Date: ${p.timestamp ? new Date(p.timestamp).toLocaleDateString() : new Date().toLocaleDateString()}</div>
              <div style="font-size: 12px; color: #64748b;">Method: ${p.method || 'Clinic Digital Settlement'}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Dental Treatment / Service Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${p.description || 'Dental Clinical Examination'}</strong><br/>
                  <span style="font-size: 12px; color: #64748b;">Clinical procedure rendered at Raihan Dental Clinic.</span>
                </td>
                <td style="text-align: right; font-weight: 700;">$${p.amount.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Total Settlement</td>
                <td style="text-align: right; color: #059669;">$${p.amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            Thank you for choosing Raihan Dental Clinic.<br/>
            Please retain this official receipt for dental insurance claims or personal medical records.
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    if (!user || !profile) return;

    // Load initial local payments
    const storedPaymentsRaw = localStorage.getItem('raihan_dental_payments');
    let localList: Payment[] = storedPaymentsRaw ? JSON.parse(storedPaymentsRaw) : [];

    const filterLocal = () => {
      if (isDentist) {
        setPayments(localList);
      } else {
        setPayments(localList.filter(p => (p.patientEmail || '').toLowerCase() === (user.email || '').toLowerCase()));
      }
      setLoading(false);
    };

    filterLocal();

    const handleUpdate = () => {
      const raw = localStorage.getItem('raihan_dental_payments');
      localList = raw ? JSON.parse(raw) : [];
      filterLocal();
    };
    window.addEventListener('raihan_payments_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Optional Firestore sync
    let q = query(collection(db, 'payments'));
    if (!isDentist && profile.role !== 'Admin') {
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
          amount: Number(d.amount) || 0,
          currency: d.currency || 'USD',
          status: d.status || 'completed',
          description: d.description,
          method: d.method,
          timestamp: d.timestamp?.toDate ? d.timestamp.toDate().toISOString() : d.timestamp
        });
      });
      if (list.length > 0) {
        const map = new Map<string, Payment>();
        localList.forEach(p => map.set(p.id, p));
        list.forEach(p => map.set(p.id, p));
        const merged = Array.from(map.values());
        merged.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        setPayments(merged);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Using local payments fallback:', err);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('raihan_payments_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [user, profile, isDentist]);

  const filteredPayments = payments.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const totalSpent = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const completedCount = payments.filter(p => p.status === 'completed').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Billing & Receipts
            </span>
            <span className="text-xs text-slate-400 font-medium">• Clinical Accounting</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {isDentist ? 'Clinic Billing & Patient Invoices' : 'Dental Treatment Payments & Invoices'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            {isDentist 
              ? 'Review patient fee settlements, track pending invoices, and issue official clinic receipts.'
              : 'View dental treatment fee statements, settle pending visit invoices, and download receipts.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            {(['all', 'completed', 'pending'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize cursor-pointer",
                  filter === f 
                    ? "bg-slate-900 dark:bg-slate-800 text-white shadow-xs" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          
          {!isDentist && (
            <button
              onClick={() => setShowPayModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Settle Treatment Fee</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              {isDentist ? 'Total Collections' : 'Total Settled'}
            </p>
            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold tracking-tight">${totalSpent.toFixed(2)}</h3>
          <p className="text-[11px] text-slate-400 font-medium">
            {completedCount} cleared {completedCount === 1 ? 'transaction' : 'transactions'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              {isDentist ? 'Pending Invoices' : 'Pending Balance'}
            </p>
            <div className="w-8 h-8 bg-amber-50 dark:bg-amber-950/40 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">${pendingAmount.toFixed(2)}</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {payments.filter(p => p.status === 'pending').length} items awaiting settlement
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              Receipt Documentation
            </p>
            <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {completedCount} Issued
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Official clinic receipts available for download
          </p>
        </div>

      </div>

      {/* Transactions Table / List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Loading transaction records...</p>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
            <CreditCard className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">No payment records found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {filter === 'all' 
                ? 'There are currently no recorded transactions.' 
                : `No ${filter} invoices match this category.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Procedure / Service</th>
                  <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Patient</th>
                  <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Date</th>
                  <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Fee</th>
                  <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Status</th>
                  <th className="px-6 py-3.5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          payment.status === 'completed' 
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" 
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                        )}>
                          {payment.status === 'completed' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{payment.description}</p>
                          <p className="text-[11px] text-slate-400 font-normal">{payment.method || 'Card Payment'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{payment.patientName || payment.patientEmail}</p>
                      <p className="text-[11px] text-slate-400">{payment.patientEmail}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{payment.timestamp ? new Date(payment.timestamp).toLocaleDateString() : 'Recent'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900 dark:text-slate-100">${payment.amount.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 border",
                        payment.status === 'completed' 
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" 
                          : payment.status === 'pending' 
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" 
                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          payment.status === 'completed' ? "bg-emerald-500" : 
                          payment.status === 'pending' ? "bg-amber-500" : "bg-rose-500"
                        )} />
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {payment.status === 'pending' ? (
                        <button 
                          onClick={() => setSelectedPayment(payment)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          Settle
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleDownloadReceipt(payment)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Download Receipt"
                        >
                          <Download className="w-4 h-4" />
                          <span className="text-[11px] font-medium hidden sm:inline">Receipt</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {selectedPayment && (
          <PaymentModal 
            payment={selectedPayment} 
            onClose={() => setSelectedPayment(null)} 
          />
        )}
        {showPayModal && (
          <CreatePaymentModal 
            onClose={() => setShowPayModal(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentModal({ payment, onClose }: { payment: Payment, onClose: () => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      try {
        await updateDoc(doc(db, 'payments', payment.id), {
          status: 'completed',
          method: 'Card •••• 4242'
        });
      } catch (e) {
        // fallback to local
      }

      // Local update
      const raw = localStorage.getItem('raihan_dental_payments');
      if (raw) {
        const list: Payment[] = JSON.parse(raw);
        const idx = list.findIndex(p => p.id === payment.id);
        if (idx !== -1) {
          list[idx].status = 'completed';
          list[idx].method = 'Card •••• 4242';
          localStorage.setItem('raihan_dental_payments', JSON.stringify(list));
          window.dispatchEvent(new Event('raihan_payments_updated'));
        }
      }

      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">Settle Dental Fee</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Raihan Dental Health Center</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {success ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Fee Settled Successfully!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Official receipt generated and recorded.</p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Description</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{payment.description}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-medium">Total Payable</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${payment.amount.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                {isProcessing ? 'Processing...' : `Confirm Settlement ($${payment.amount.toFixed(2)})`}
              </button>
              
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Secure clinic transaction record</span>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function CreatePaymentModal({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const DENTAL_SERVICES = [
    { label: 'Dental Consultation & Examination', price: '50.00' },
    { label: 'Dental Cleaning (Scaling) & Polishing', price: '75.00' },
    { label: 'Composite Tooth Filling', price: '90.00' },
    { label: 'Root Canal Treatment (RCT)', price: '280.00' },
    { label: 'Porcelain Dental Crown', price: '350.00' },
    { label: 'Tooth Extraction', price: '80.00' },
    { label: 'Professional Tooth Whitening', price: '200.00' },
  ];

  const [formData, setFormData] = useState({
    amount: '50.00',
    description: 'Dental Consultation & Examination',
    method: 'Card Settlement'
  });

  const handleSelectService = (desc: string) => {
    const match = DENTAL_SERVICES.find(s => s.label === desc);
    setFormData(prev => ({
      ...prev,
      description: desc,
      amount: match ? match.price : prev.amount
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setIsSaving(true);
    try {
      const newPayment: any = {
        id: `pay-${Date.now()}`,
        patientEmail: user.email,
        patientName: profile.name || user.displayName || 'Patient',
        amount: parseFloat(formData.amount),
        currency: 'USD',
        status: 'completed',
        description: formData.description,
        method: formData.method,
        timestamp: new Date().toISOString()
      };

      try {
        await addDoc(collection(db, 'payments'), {
          ...newPayment,
          timestamp: new Date()
        });
      } catch (e) {
        // local fallback
      }

      const storedRaw = localStorage.getItem('raihan_dental_payments');
      const stored = storedRaw ? JSON.parse(storedRaw) : [];
      stored.unshift(newPayment);
      localStorage.setItem('raihan_dental_payments', JSON.stringify(stored));
      window.dispatchEvent(new Event('raihan_payments_updated'));

      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (error) {
      console.error(error);
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
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">Settle Treatment Fee</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 text-xs">
          {success ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Fee Settled Successfully!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Dental invoice receipt generated and recorded.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Dental Procedure</label>
                <select
                  value={formData.description}
                  onChange={(e) => handleSelectService(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {DENTAL_SERVICES.map(s => (
                    <option key={s.label} value={s.label}>{s.label} (${s.price})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Fee Amount ($)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                  {isSaving ? 'Processing...' : 'Complete Payment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
