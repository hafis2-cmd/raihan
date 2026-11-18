import { createNotification } from './appointmentService';

export const CLINIC_UPI_CONFIG = {
  clinicName: "Raihan Dental Clinic",
  upiId: "Q288159952@ybl",
  payeeName: "PhonePeMerchant",
  provider: "PhonePe",
  network: "UPI / BHIM",
  currency: "INR",
  currencySymbol: "₹",
  qrAssetUrl: "/phonepe-qr.png",
  supportedApps: ["PhonePe", "Google Pay", "Paytm", "BHIM", "Other"] as const
};

export type InvoiceStatus = 'PENDING' | 'PENDING_VERIFICATION' | 'PAID' | 'REJECTED' | 'REVOKED' | 'REFUNDED';
export type SubmissionStatus = 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
export type PaymentApp = 'PhonePe' | 'Google Pay' | 'Paytm' | 'BHIM' | 'Other';

export interface InvoiceAuditEntry {
  action: 'CREATED' | 'AMOUNT_MODIFIED' | 'SUBMISSION_RECEIVED' | 'VERIFIED' | 'REJECTED' | 'REVOKED';
  performedBy: string;
  performedByName: string;
  timestamp: string;
  previousAmount?: number;
  newAmount?: number;
  notes?: string;
}

export interface PaymentSubmission {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  patientEmail: string;
  patientName: string;
  amount: number;
  currency: 'INR';
  transactionReference: string;
  paymentDate: string;
  paymentApp: PaymentApp;
  screenshotUrl?: string;
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  rejectionReason?: string;
}

export interface PaymentReceipt {
  receiptNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  patientEmail: string;
  patientName: string;
  dentistEmail: string;
  dentistName: string;
  amount: number;
  currency: 'INR';
  paymentMethod: 'UPI';
  upiId: string;
  transactionReference: string;
  paymentDate: string;
  verificationDate: string;
  verifiedBy: string;
  verifiedByName: string;
  status: 'VERIFIED';
  consultationDetails: string;
}

export interface ConsultationInvoice {
  id: string;
  invoiceNumber: string;
  dentistEmail: string;
  dentistName: string;
  patientEmail: string;
  patientName: string;
  patientPhone?: string;
  appointmentId?: string;
  consultationId?: string;
  description: string;
  amount: number;
  currency: 'INR';
  dueDate?: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
  revocationReason?: string;
  auditHistory: InvoiceAuditEntry[];
  submissions: PaymentSubmission[];
  receipt?: PaymentReceipt;
}

export interface BillingStats {
  totalVerifiedRevenue: number;
  awaitingVerificationCount: number;
  awaitingVerificationAmount: number;
  pendingInvoicesCount: number;
  pendingInvoicesAmount: number;
  totalInvoicesCount: number;
  paidInvoicesCount: number;
  revokedInvoicesCount: number;
}

const LOCAL_STORAGE_KEY = 'raihan_dental_invoices';

export function getLocalInvoices(): ConsultationInvoice[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalInvoices(invoices: ConsultationInvoice[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(invoices));
    window.dispatchEvent(new Event('raihan_invoices_updated'));
    window.dispatchEvent(new Event('raihan_payments_updated'));
  } catch (e) {
    console.warn("Could not save local invoices cache:", e);
  }
}

function getAuthHeaders(userEmail?: string, token?: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(userEmail ? { 'x-user-email': userEmail.toLowerCase().trim() } : {})
  };
}

/**
 * Fetch Invoices
 * Dentists retrieve all clinic invoices. Patients retrieve only their assigned invoices.
 */
export async function fetchInvoices(userEmail?: string, token?: string, patientFilter?: string): Promise<ConsultationInvoice[]> {
  try {
    const url = patientFilter 
      ? `/api/billing/invoices?patientEmail=${encodeURIComponent(patientFilter)}` 
      : '/api/billing/invoices';

    const resp = await fetch(url, {
      headers: getAuthHeaders(userEmail, token)
    });
    
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && Array.isArray(data.invoices)) {
        saveLocalInvoices(data.invoices);
        return data.invoices;
      }
    }
  } catch (err) {
    console.warn("Backend fetch invoices notice, using local cache:", err);
  }

  // Fallback to local storage cache
  const local = getLocalInvoices();
  if (userEmail) {
    const lower = userEmail.toLowerCase().trim();
    // If not dentist, filter for patient
    return local.filter(i => i.patientEmail.toLowerCase() === lower);
  }
  return local;
}

/**
 * Dentist assigns a consultation fee to a patient
 */
export async function assignConsultationFee(
  params: {
    patientEmail: string;
    patientName: string;
    patientPhone?: string;
    amount: number;
    description: string;
    appointmentId?: string;
    consultationId?: string;
    dueDate?: string;
  },
  userEmail: string,
  token?: string
): Promise<ConsultationInvoice> {
  const resp = await fetch('/api/billing/invoices', {
    method: 'POST',
    headers: getAuthHeaders(userEmail, token),
    body: JSON.stringify(params)
  });

  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(data.error || "Failed to assign consultation fee.");
  }

  const invoice: ConsultationInvoice = data.invoice;

  // Sync local cache
  const local = getLocalInvoices();
  local.unshift(invoice);
  saveLocalInvoices(local);

  // Notify Patient
  await createNotification({
    recipientEmail: params.patientEmail,
    senderEmail: userEmail,
    title: "New Consultation Fee Assigned",
    message: `Dr. Raihan has assigned a consultation fee of ₹${params.amount.toFixed(2)} under invoice ${invoice.invoiceNumber} for "${params.description}". Please view and settle via PhonePe UPI.`,
    type: "appointment_request",
    appointmentId: params.appointmentId
  });

  return invoice;
}

/**
 * Dentist modifies an unpaid consultation fee
 */
export async function modifyConsultationFee(
  invoiceId: string,
  params: {
    amount: number;
    description?: string;
    dueDate?: string;
    notes?: string;
  },
  userEmail: string,
  token?: string
): Promise<ConsultationInvoice> {
  const resp = await fetch(`/api/billing/invoices/${encodeURIComponent(invoiceId)}`, {
    method: 'PUT',
    headers: getAuthHeaders(userEmail, token),
    body: JSON.stringify(params)
  });

  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(data.error || "Failed to update consultation fee.");
  }

  const invoice: ConsultationInvoice = data.invoice;

  // Sync local cache
  const local = getLocalInvoices();
  const idx = local.findIndex(i => i.id === invoice.id || i.invoiceNumber === invoice.invoiceNumber);
  if (idx !== -1) {
    local[idx] = invoice;
  } else {
    local.unshift(invoice);
  }
  saveLocalInvoices(local);

  // Notify Patient
  await createNotification({
    recipientEmail: invoice.patientEmail,
    senderEmail: userEmail,
    title: "Consultation Fee Updated",
    message: `Invoice ${invoice.invoiceNumber} has been updated by Dr. Raihan. The revised payable amount is ₹${params.amount.toFixed(2)}.`,
    type: "appointment_request",
    appointmentId: invoice.appointmentId
  });

  return invoice;
}

/**
 * Dentist revokes an unpaid invoice
 */
export async function revokeInvoice(
  invoiceId: string,
  reason: string,
  userEmail: string,
  token?: string
): Promise<ConsultationInvoice> {
  const resp = await fetch(`/api/billing/invoices/${encodeURIComponent(invoiceId)}/revoke`, {
    method: 'POST',
    headers: getAuthHeaders(userEmail, token),
    body: JSON.stringify({ reason })
  });

  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(data.error || "Failed to revoke invoice.");
  }

  const invoice: ConsultationInvoice = data.invoice;

  // Sync local cache
  const local = getLocalInvoices();
  const idx = local.findIndex(i => i.id === invoice.id || i.invoiceNumber === invoice.invoiceNumber);
  if (idx !== -1) {
    local[idx] = invoice;
  } else {
    local.unshift(invoice);
  }
  saveLocalInvoices(local);

  // Notify Patient
  await createNotification({
    recipientEmail: invoice.patientEmail,
    senderEmail: userEmail,
    title: "Invoice Revoked",
    message: `Consultation invoice ${invoice.invoiceNumber} has been revoked by Dr. Raihan. Reason: ${reason || 'Revoked by clinic.'}`,
    type: "appointment_cancelled",
    appointmentId: invoice.appointmentId
  });

  return invoice;
}

/**
 * Patient submits UPI payment reference (UTR)
 */
export async function submitPayment(
  invoiceId: string,
  params: {
    transactionReference: string;
    paymentDate: string;
    paymentApp: PaymentApp;
    screenshot?: string;
  },
  userEmail: string,
  token?: string
): Promise<{ invoice: ConsultationInvoice; submission: PaymentSubmission }> {
  const resp = await fetch(`/api/billing/invoices/${encodeURIComponent(invoiceId)}/submit-payment`, {
    method: 'POST',
    headers: getAuthHeaders(userEmail, token),
    body: JSON.stringify(params)
  });

  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(data.error || "Failed to submit payment details.");
  }

  const { invoice, submission } = data;

  // Sync local cache
  const local = getLocalInvoices();
  const idx = local.findIndex(i => i.id === invoice.id || i.invoiceNumber === invoice.invoiceNumber);
  if (idx !== -1) {
    local[idx] = invoice;
  } else {
    local.unshift(invoice);
  }
  saveLocalInvoices(local);

  // Notify Dentist
  await createNotification({
    recipientEmail: invoice.dentistEmail,
    senderEmail: userEmail,
    title: "Payment Submission Awaiting Verification",
    message: `Patient ${invoice.patientName} has submitted payment details for invoice ${invoice.invoiceNumber} (₹${invoice.amount.toFixed(2)}, UTR: ${submission.transactionReference} via ${submission.paymentApp}). Please verify against your PhonePe receiving account.`,
    type: "appointment_request",
    appointmentId: invoice.appointmentId
  });

  // Notify Patient
  await createNotification({
    recipientEmail: invoice.patientEmail,
    senderEmail: invoice.dentistEmail,
    title: "Payment Received – Verification Pending",
    message: `Your payment details for invoice ${invoice.invoiceNumber} (UTR: ${submission.transactionReference}) have been submitted. An official receipt will be issued once Dr. Raihan verifies the settlement.`,
    type: "appointment_request",
    appointmentId: invoice.appointmentId
  });

  return { invoice, submission };
}

/**
 * Dentist verifies payment against actual PhonePe receiving account
 */
export async function verifyPayment(
  invoiceId: string,
  params: {
    submissionId?: string;
    notes?: string;
  },
  userEmail: string,
  token?: string
): Promise<{ invoice: ConsultationInvoice; receipt: PaymentReceipt }> {
  const resp = await fetch(`/api/billing/invoices/${encodeURIComponent(invoiceId)}/verify-payment`, {
    method: 'POST',
    headers: getAuthHeaders(userEmail, token),
    body: JSON.stringify(params)
  });

  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(data.error || "Failed to verify payment.");
  }

  const { invoice, receipt } = data;

  // Sync local cache
  const local = getLocalInvoices();
  const idx = local.findIndex(i => i.id === invoice.id || i.invoiceNumber === invoice.invoiceNumber);
  if (idx !== -1) {
    local[idx] = invoice;
  } else {
    local.unshift(invoice);
  }
  saveLocalInvoices(local);

  // Notify Patient
  await createNotification({
    recipientEmail: invoice.patientEmail,
    senderEmail: userEmail,
    title: "Payment Verified – Official Receipt Issued!",
    message: `Dr. Raihan has verified your PhonePe UPI payment of ₹${invoice.amount.toFixed(2)} for invoice ${invoice.invoiceNumber}. Your official receipt ${receipt.receiptNumber} is now ready to download.`,
    type: "appointment_accepted",
    appointmentId: invoice.appointmentId
  });

  // Notify Dentist confirmation
  await createNotification({
    recipientEmail: userEmail,
    senderEmail: userEmail,
    title: "Payment Verified",
    message: `You have verified ₹${invoice.amount.toFixed(2)} for ${invoice.patientName} (${invoice.invoiceNumber}). Receipt ${receipt.receiptNumber} generated.`,
    type: "appointment_accepted",
    appointmentId: invoice.appointmentId
  });

  return { invoice, receipt };
}

/**
 * Dentist rejects an unverifiable submission
 */
export async function rejectPayment(
  invoiceId: string,
  params: {
    submissionId?: string;
    reason: string;
  },
  userEmail: string,
  token?: string
): Promise<ConsultationInvoice> {
  const resp = await fetch(`/api/billing/invoices/${encodeURIComponent(invoiceId)}/reject-payment`, {
    method: 'POST',
    headers: getAuthHeaders(userEmail, token),
    body: JSON.stringify(params)
  });

  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(data.error || "Failed to reject payment.");
  }

  const invoice: ConsultationInvoice = data.invoice;

  // Sync local cache
  const local = getLocalInvoices();
  const idx = local.findIndex(i => i.id === invoice.id || i.invoiceNumber === invoice.invoiceNumber);
  if (idx !== -1) {
    local[idx] = invoice;
  } else {
    local.unshift(invoice);
  }
  saveLocalInvoices(local);

  // Notify Patient
  await createNotification({
    recipientEmail: invoice.patientEmail,
    senderEmail: userEmail,
    title: "Payment Submission Rejected",
    message: `Your payment reference for invoice ${invoice.invoiceNumber} could not be verified by Dr. Raihan. Reason: "${params.reason}". Please check your UPI application and submit the correct UTR.`,
    type: "appointment_rejected",
    appointmentId: invoice.appointmentId
  });

  return invoice;
}

/**
 * Fetch Dentist Billing Statistics
 */
export async function fetchBillingStats(userEmail: string, token?: string): Promise<BillingStats> {
  try {
    const resp = await fetch('/api/billing/stats', {
      headers: getAuthHeaders(userEmail, token)
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && data.stats) {
        return data.stats;
      }
    }
  } catch (e) {
    console.warn("Could not fetch remote billing stats, computing locally:", e);
  }

  // Local calculation
  const invoices = getLocalInvoices();
  const totalVerifiedRevenue = invoices
    .filter(i => i.status === "PAID")
    .reduce((sum, i) => sum + i.amount, 0);

  const awaitingVerificationCount = invoices.filter(i => i.status === "PENDING_VERIFICATION").length;
  const awaitingVerificationAmount = invoices
    .filter(i => i.status === "PENDING_VERIFICATION")
    .reduce((sum, i) => sum + i.amount, 0);

  const pendingInvoicesCount = invoices.filter(i => i.status === "PENDING" || i.status === "REJECTED").length;
  const pendingInvoicesAmount = invoices
    .filter(i => i.status === "PENDING" || i.status === "REJECTED")
    .reduce((sum, i) => sum + i.amount, 0);

  return {
    totalVerifiedRevenue,
    awaitingVerificationCount,
    awaitingVerificationAmount,
    pendingInvoicesCount,
    pendingInvoicesAmount,
    totalInvoicesCount: invoices.length,
    paidInvoicesCount: invoices.filter(i => i.status === "PAID").length,
    revokedInvoicesCount: invoices.filter(i => i.status === "REVOKED").length
  };
}
