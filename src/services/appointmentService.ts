import { db, isFirebaseConfigured } from '../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';

export type AppointmentStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type ConsultationType = 'on_site' | 'in_person' | 'video' | 'audio';

export interface Appointment {
  id: string;
  patient_email: string;
  patient_name: string;
  patient_phone?: string;
  patient_age?: number;
  patient_gender?: string;
  patient_blood_group?: string;
  doctor_email: string;
  doctor_name: string;
  doctor_specialty?: string;
  doctor_image?: string;
  location: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // e.g. "09:30 AM"
  duration: number; // minutes
  consultation_type: ConsultationType;
  reason: string;
  status: AppointmentStatus;
  rejection_reason?: string;
  doctor_notes?: string;
  google_meet_link?: string;
  google_calendar_event_id?: string;
  is_synced_to_calendar?: boolean;
  timestamp?: any;
  created_at: string;
  updated_at?: string;
}

export interface DoctorSlot {
  id: string;
  doctor_email: string;
  doctor_name: string;
  slot_date: string; // YYYY-MM-DD
  slot_time: string; // e.g. "09:00 AM"
  duration: number; // minutes: 15, 30, 45, 60
  is_available: boolean;
  appointment_id?: string;
  timestamp?: any;
}

export interface SystemNotification {
  id: string;
  recipientEmail: string;
  senderEmail?: string;
  title: string;
  message: string;
  type: 'appointment_request' | 'appointment_accepted' | 'appointment_rejected' | 'appointment_cancelled' | 'appointment_reminder' | 'consultation_recorded' | 'prescription_created';
  appointmentId?: string;
  isRead: boolean;
  timestamp?: any;
  created_at: string;
}

const APPOINTMENTS_KEY = 'raihan_db_appointments';
const SLOTS_KEY = 'raihan_db_slots';
const NOTIFICATIONS_KEY = 'raihan_db_notifications';

// Production: Do not seed dummy slots. Only slots created by dentists should exist.
export function initSeedSlots(_doctorEmail?: string, _doctorName?: string) {
  // Pure no-op in production.
}

// ---------------- LOCAL STORAGE SYNC HELPERS ----------------

export function getLocalAppointments(): Appointment[] {
  try {
    const data = localStorage.getItem(APPOINTMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn("Failed to get local appointments:", e);
    return [];
  }
}

export function saveLocalAppointments(appts: Appointment[]) {
  try {
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appts));
  } catch (e) {
    console.warn("Failed to save local appointments:", e);
  }
}

export function getLocalSlots(): DoctorSlot[] {
  try {
    const data = localStorage.getItem(SLOTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn("Failed to get local slots:", e);
    return [];
  }
}

export function saveLocalSlots(slots: DoctorSlot[]) {
  try {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  } catch (e) {
    console.warn("Failed to save local slots:", e);
  }
}

export function getLocalNotifications(email?: string): SystemNotification[] {
  try {
    const data = localStorage.getItem(NOTIFICATIONS_KEY);
    const notifs: SystemNotification[] = data ? JSON.parse(data) : [];
    if (email) {
      return notifs.filter(n => n.recipientEmail.toLowerCase().trim() === email.toLowerCase().trim());
    }
    return notifs;
  } catch (e) {
    console.warn("Failed to get local notifications:", e);
    return [];
  }
}

export function saveLocalNotifications(notifs: SystemNotification[]) {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
  } catch (e) {
    console.warn("Failed to save local notifications:", e);
  }
}

// ---------------- NOTIFICATION SERVICE ----------------

export async function createNotification(notif: Omit<SystemNotification, 'id' | 'created_at' | 'isRead'>) {
  const newNotif: SystemNotification = {
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    isRead: false,
    created_at: new Date().toISOString(),
    timestamp: new Date()
  };

  // 1. Save to local storage for immediate cross-account view
  const all = getLocalNotifications();
  all.unshift(newNotif);
  saveLocalNotifications(all);

  // 2. Write to Firestore if configured
  if (isFirebaseConfigured) {
    try {
      await addDoc(collection(db, 'notifications'), {
        recipientEmail: notif.recipientEmail,
        senderEmail: notif.senderEmail || '',
        title: notif.title,
        message: notif.message,
        type: notif.type,
        appointmentId: notif.appointmentId || '',
        isRead: false,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.warn("Firestore notification error (saved locally):", err);
    }
  }

  // Dispatch custom storage event for in-tab reactive notification updates
  window.dispatchEvent(new CustomEvent('raihan_notification_updated', { detail: newNotif }));
  return newNotif;
}

export async function markAllNotificationsRead(email: string) {
  const all = getLocalNotifications();
  const updated = all.map(n => {
    if (n.recipientEmail.toLowerCase().trim() === email.toLowerCase().trim()) {
      return { ...n, isRead: true };
    }
    return n;
  });
  saveLocalNotifications(updated);
  window.dispatchEvent(new CustomEvent('raihan_notification_updated'));
}

// ---------------- APPOINTMENT WORKFLOW OPERATIONS ----------------

/**
 * 1. Patient requests an appointment
 * Status is strictly set to PENDING
 * Slot is temporarily marked reserved for this patient
 * Notification sent to Doctor
 */
export async function requestAppointment(params: {
  patientEmail: string;
  patientName: string;
  patientPhone?: string;
  patientAge?: number;
  patientGender?: string;
  patientBloodGroup?: string;
  doctorEmail: string;
  doctorName: string;
  doctorSpecialty?: string;
  doctorImage?: string;
  location: string;
  date: string;
  time: string;
  duration?: number;
  consultationType?: ConsultationType;
  reason: string;
}): Promise<Appointment> {
  const appointmentId = `apt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const nowIso = new Date().toISOString();

  const newAppointment: Appointment = {
    id: appointmentId,
    patient_email: params.patientEmail,
    patient_name: params.patientName,
    patient_phone: params.patientPhone,
    patient_age: params.patientAge,
    patient_gender: params.patientGender,
    patient_blood_group: params.patientBloodGroup,
    doctor_email: params.doctorEmail,
    doctor_name: params.doctorName,
    doctor_specialty: params.doctorSpecialty || 'Dental Surgeon',
    doctor_image: params.doctorImage,
    location: params.location,
    appointment_date: params.date,
    appointment_time: params.time,
    duration: params.duration || 30,
    consultation_type: params.consultationType || 'on_site',
    reason: params.reason,
    status: 'PENDING',
    created_at: nowIso,
    timestamp: new Date()
  };

  // 1. Save to local storage
  const allAppts = getLocalAppointments();
  allAppts.unshift(newAppointment);
  saveLocalAppointments(allAppts);

  // 2. Mark corresponding slot as unavailable/reserved
  const allSlots = getLocalSlots();
  const slotIdx = allSlots.findIndex(
    s => s.doctor_email === params.doctorEmail && s.slot_date === params.date && s.slot_time === params.time
  );
  if (slotIdx >= 0) {
    allSlots[slotIdx].is_available = false;
    allSlots[slotIdx].appointment_id = appointmentId;
    saveLocalSlots(allSlots);
  }

  // 3. Write to Firestore if configured
  if (isFirebaseConfigured) {
    try {
      await addDoc(collection(db, 'appointments'), {
        ...newAppointment,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.warn("Firestore appointment save error (saved locally):", err);
    }
  }

  // 4. Notify the Doctor about the new request
  await createNotification({
    recipientEmail: params.doctorEmail,
    senderEmail: params.patientEmail,
    title: 'New Appointment Request',
    message: `Patient ${params.patientName} requested a ${params.consultationType.replace('_', ' ')} consultation on ${params.date} at ${params.time}. Reason: "${params.reason}". Please review and approve or decline.`,
    type: 'appointment_request',
    appointmentId: appointmentId
  });

  window.dispatchEvent(new CustomEvent('raihan_appointments_updated', { detail: newAppointment }));
  return newAppointment;
}

/**
 * 2. Doctor approves the appointment
 * Status becomes ACCEPTED
 * Slot is permanently locked for this consultation
 * Notification sent to Patient
 */
export async function acceptAppointment(appointmentId: string, doctorNotes?: string): Promise<Appointment | null> {
  const allAppts = getLocalAppointments();
  const idx = allAppts.findIndex(a => a.id === appointmentId);
  if (idx < 0) return null;

  const appt = allAppts[idx];
  appt.status = 'ACCEPTED';
  appt.doctor_notes = doctorNotes;
  appt.updated_at = new Date().toISOString();
  saveLocalAppointments(allAppts);

  // Lock slot
  const allSlots = getLocalSlots();
  const slotIdx = allSlots.findIndex(
    s => s.doctor_email === appt.doctor_email && s.slot_date === appt.appointment_date && s.slot_time === appt.appointment_time
  );
  if (slotIdx >= 0) {
    allSlots[slotIdx].is_available = false;
    allSlots[slotIdx].appointment_id = appointmentId;
    saveLocalSlots(allSlots);
  }

  // Sync to Firestore
  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'appointments'), where('id', '==', appointmentId));
      const snaps = await getDocs(q);
      snaps.forEach(async d => {
        await updateDoc(doc(db, 'appointments', d.id), {
          status: 'ACCEPTED',
          doctor_notes: doctorNotes || '',
          updated_at: serverTimestamp()
        });
      });
    } catch (err) {
      console.warn("Firestore accept sync error:", err);
    }
  }

  // Notify Patient
  await createNotification({
    recipientEmail: appt.patient_email,
    senderEmail: appt.doctor_email,
    title: 'Appointment Approved!',
    message: `Your appointment with Dr. ${appt.doctor_name} on ${appt.appointment_date} at ${appt.appointment_time} has been approved. Your appointment is confirmed.`,
    type: 'appointment_accepted',
    appointmentId: appt.id
  });

  window.dispatchEvent(new CustomEvent('raihan_appointments_updated', { detail: appt }));
  return appt;
}

/**
 * 3. Doctor rejects the appointment
 * Status becomes REJECTED
 * Slot is released back to available
 * Notification sent to Patient with reason
 */
export async function rejectAppointment(appointmentId: string, rejectionReason: string): Promise<Appointment | null> {
  const allAppts = getLocalAppointments();
  const idx = allAppts.findIndex(a => a.id === appointmentId);
  if (idx < 0) return null;

  const appt = allAppts[idx];
  appt.status = 'REJECTED';
  appt.rejection_reason = rejectionReason || 'Doctor unavailable at the requested time.';
  appt.updated_at = new Date().toISOString();
  saveLocalAppointments(allAppts);

  // Release the slot back to available!
  const allSlots = getLocalSlots();
  const slotIdx = allSlots.findIndex(
    s => s.doctor_email === appt.doctor_email && s.slot_date === appt.appointment_date && s.slot_time === appt.appointment_time
  );
  if (slotIdx >= 0) {
    allSlots[slotIdx].is_available = true;
    allSlots[slotIdx].appointment_id = undefined;
    saveLocalSlots(allSlots);
  }

  // Sync to Firestore
  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'appointments'), where('id', '==', appointmentId));
      const snaps = await getDocs(q);
      snaps.forEach(async d => {
        await updateDoc(doc(db, 'appointments', d.id), {
          status: 'REJECTED',
          rejection_reason: appt.rejection_reason,
          updated_at: serverTimestamp()
        });
      });
    } catch (err) {
      console.warn("Firestore reject sync error:", err);
    }
  }

  // Notify Patient
  await createNotification({
    recipientEmail: appt.patient_email,
    senderEmail: appt.doctor_email,
    title: 'Appointment Request Declined',
    message: `Your appointment request with Dr. ${appt.doctor_name} on ${appt.appointment_date} at ${appt.appointment_time} has been declined. Reason: ${appt.rejection_reason}. Please choose another available slot.`,
    type: 'appointment_rejected',
    appointmentId: appt.id
  });

  window.dispatchEvent(new CustomEvent('raihan_appointments_updated', { detail: appt }));
  return appt;
}

/**
 * 4. Cancel appointment (by Patient or Doctor)
 * Releases slot if was booked
 */
export async function cancelAppointment(appointmentId: string, cancelledByRole: 'Patient' | 'Doctor', cancellerEmail: string): Promise<Appointment | null> {
  const allAppts = getLocalAppointments();
  const idx = allAppts.findIndex(a => a.id === appointmentId);
  if (idx < 0) return null;

  const appt = allAppts[idx];
  appt.status = 'CANCELLED';
  appt.updated_at = new Date().toISOString();
  saveLocalAppointments(allAppts);

  // Release slot
  const allSlots = getLocalSlots();
  const slotIdx = allSlots.findIndex(
    s => s.doctor_email === appt.doctor_email && s.slot_date === appt.appointment_date && s.slot_time === appt.appointment_time
  );
  if (slotIdx >= 0) {
    allSlots[slotIdx].is_available = true;
    allSlots[slotIdx].appointment_id = undefined;
    saveLocalSlots(allSlots);
  }

  // Notify the other party
  const targetEmail = cancelledByRole === 'Patient' ? appt.doctor_email : appt.patient_email;
  const cancellerName = cancelledByRole === 'Patient' ? appt.patient_name : `Dr. ${appt.doctor_name}`;

  await createNotification({
    recipientEmail: targetEmail,
    senderEmail: cancellerEmail,
    title: 'Appointment Cancelled',
    message: `${cancellerName} has cancelled the appointment scheduled for ${appt.appointment_date} at ${appt.appointment_time}.`,
    type: 'appointment_cancelled',
    appointmentId: appt.id
  });

  window.dispatchEvent(new CustomEvent('raihan_appointments_updated', { detail: appt }));
  return appt;
}

/**
 * 5. Complete appointment (by Doctor)
 */
export async function completeAppointment(appointmentId: string): Promise<Appointment | null> {
  const allAppts = getLocalAppointments();
  const idx = allAppts.findIndex(a => a.id === appointmentId);
  if (idx < 0) return null;

  const appt = allAppts[idx];
  appt.status = 'COMPLETED';
  appt.updated_at = new Date().toISOString();
  saveLocalAppointments(allAppts);

  window.dispatchEvent(new CustomEvent('raihan_appointments_updated', { detail: appt }));
  return appt;
}

// ---------------- DOCTOR AVAILABILITY SLOT OPERATIONS ----------------

export function addDoctorSlot(slot: Omit<DoctorSlot, 'id'>): { success: boolean; error?: string; slot?: DoctorSlot } {
  const allSlots = getLocalSlots();

  // Overlap prevention check
  const duplicate = allSlots.find(
    s => s.doctor_email.toLowerCase() === slot.doctor_email.toLowerCase() &&
         s.slot_date === slot.slot_date &&
         s.slot_time.toLowerCase().trim() === slot.slot_time.toLowerCase().trim()
  );

  if (duplicate) {
    return { success: false, error: `A slot at ${slot.slot_time} on ${slot.slot_date} already exists in your schedule.` };
  }

  const newSlot: DoctorSlot = {
    ...slot,
    id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString()
  };

  allSlots.push(newSlot);
  saveLocalSlots(allSlots);

  if (isFirebaseConfigured) {
    try {
      addDoc(collection(db, 'slots'), {
        ...newSlot,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.warn("Firestore slot add error:", e);
    }
  }

  window.dispatchEvent(new CustomEvent('raihan_slots_updated', { detail: newSlot }));
  return { success: true, slot: newSlot };
}

export function batchAddDoctorSlots(params: {
  doctorEmail: string;
  doctorName: string;
  date: string;
  times: string[];
  duration?: number;
}): { added: number; skipped: number } {
  let added = 0;
  let skipped = 0;

  params.times.forEach(t => {
    const res = addDoctorSlot({
      doctor_email: params.doctorEmail,
      doctor_name: params.doctorName,
      slot_date: params.date,
      slot_time: t,
      duration: params.duration || 30,
      is_available: true
    });
    if (res.success) added++;
    else skipped++;
  });

  return { added, skipped };
}

export function deleteDoctorSlot(slotId: string): boolean {
  const allSlots = getLocalSlots();
  const filtered = allSlots.filter(s => s.id !== slotId);
  if (filtered.length !== allSlots.length) {
    saveLocalSlots(filtered);
    window.dispatchEvent(new CustomEvent('raihan_slots_updated', { detail: { id: slotId } }));
    return true;
  }
  return false;
}
