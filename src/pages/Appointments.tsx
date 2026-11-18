import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  MapPin, 
  Star,
  Search,
  Filter,
  X,
  Plus,
  ChevronLeft,
  LayoutList,
  CalendarDays,
  Bell,
  CalendarPlus,
  Check,
  MessageSquare,
  FileText,
  CreditCard,
  Phone,
  ShieldAlert,
  CheckCheck,
  XCircle,
  HelpCircle,
  Stethoscope,
  Trash2,
  RefreshCw,
  Award,
  Building,
  Info,
  History
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth, getRegisteredDentists, getRegisteredUsers } from '../context/AuthContext';
import { useConfirmation } from '../context/ConfirmationContext';
import { db, isFirebaseConfigured } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  Appointment, 
  DoctorSlot, 
  ConsultationType,
  requestAppointment, 
  acceptAppointment, 
  rejectAppointment, 
  cancelAppointment, 
  completeAppointment,
  addDoctorSlot,
  batchAddDoctorSlots,
  deleteDoctorSlot,
  getLocalAppointments,
  saveLocalAppointments,
  getLocalSlots,
  initSeedSlots
} from '../services/appointmentService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Appointments() {
  const { profile, user, googleToken, connectGoogleCalendar } = useAuth();
  const navigate = useNavigate();
  const { confirm } = useConfirmation();

  const isDoctor = profile?.role === 'Doctor' || profile?.role === 'Dentist';
  const isPatient = !isDoctor; // default patient view

  const getPersonPhoto = (email?: string): string => {
    if (!email) return '';
    const emailLower = email.toLowerCase().trim();
    if (profile?.email?.toLowerCase().trim() === emailLower) {
      return profile.photoURL || profile.image || '';
    }
    const reg = getRegisteredUsers();
    const found = reg.find(u => u.email.toLowerCase() === emailLower);
    if (found?.photoURL || found?.image) return (found.photoURL || found.image)!;
    try {
      const stored = localStorage.getItem(`raihan_profile_${emailLower}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.photoURL || parsed.image) return parsed.photoURL || parsed.image;
      }
    } catch {}
    return '';
  };

  // Core Data States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<DoctorSlot[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View / Filter States
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  // Doctor Tab States
  // 'requests' | 'upcoming' | 'availability' | 'history'
  const [doctorActiveTab, setDoctorActiveTab] = useState<'requests' | 'upcoming' | 'availability' | 'history'>('requests');

  // Patient Tab States
  // 'book' | 'pending' | 'confirmed' | 'rejected' | 'history'
  const [patientActiveTab, setPatientActiveTab] = useState<'book' | 'pending' | 'confirmed' | 'rejected' | 'history'>('book');

  // Patient Booking Modal States (Strictly On-Site Clinic Consultation)
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDoctor, setBookingDoctor] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState<string>('');
  const [bookingReason, setBookingReason] = useState<string>('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingFeedbackMessage, setBookingFeedbackMessage] = useState<string | null>(null);

  // Doctor Rejection Modal States
  const [rejectingAppt, setRejectingAppt] = useState<Appointment | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // Doctor Availability Management States
  const [availDate, setAvailDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [availTime, setAvailTime] = useState<string>('09:00');
  const [availDuration, setAvailDuration] = useState<number>(30);
  const [availError, setAvailError] = useState<string>('');
  const [availSuccess, setAvailSuccess] = useState<string>('');

  // Google Calendar States
  const [syncingApptId, setSyncingApptId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ [key: string]: { status: 'success' | 'error', message?: string } }>({});

  // 1. Initial Load and Event Listeners
  useEffect(() => {
    loadAllData();

    // Listen for custom cross-component updates
    const handleApptUpdate = () => loadAllData();
    const handleSlotUpdate = () => loadAllData();
    window.addEventListener('raihan_appointments_updated', handleApptUpdate);
    window.addEventListener('raihan_slots_updated', handleSlotUpdate);
    window.addEventListener('storage', handleApptUpdate);

    return () => {
      window.removeEventListener('raihan_appointments_updated', handleApptUpdate);
      window.removeEventListener('raihan_slots_updated', handleSlotUpdate);
      window.removeEventListener('storage', handleApptUpdate);
    };
  }, [profile?.email, profile?.role]);

  // Firestore realtime sync when configured
  useEffect(() => {
    if (!profile?.email || !isFirebaseConfigured) return;

    const field = isDoctor ? 'doctor_email' : 'patient_email';
    const q = query(
      collection(db, 'appointments'),
      where(field, '==', profile.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveList: Appointment[] = [];
      snapshot.forEach(docSnap => {
        liveList.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      if (liveList.length > 0) {
        // Merge with local records
        const local = getLocalAppointments();
        const mergedMap = new Map<string, Appointment>();
        local.forEach(a => mergedMap.set(a.id, a));
        liveList.forEach(a => mergedMap.set(a.id, a));
        setAppointments(Array.from(mergedMap.values()));
      }
    }, (err) => {
      console.warn("Appointments live sync:", err);
    });

    return () => unsubscribe();
  }, [profile?.email, isDoctor]);

  const loadAllData = () => {
    setIsLoading(true);
    const localAppts = getLocalAppointments();
    const localSlots = getLocalSlots();

    // Populate registered dentists dynamically
    const registeredDentists = getRegisteredDentists();
    const dynamicDoctors = registeredDentists.map(d => ({
      id: d.id,
      email: d.email,
      name: d.name || 'Dentist',
      specialty: d.specialty || 'General Dentistry',
      subSpecialty: d.subSpecialty || 'Clinical Dental Practice',
      rating: 5.0,
      reviews: 0,
      location: d.location || d.hospitalAffiliation || 'Raihan Dental Clinic',
      experience: d.experience || 5,
      fee: Number(d.consultationFee) || 50,
      education: d.qualification || 'BDS',
      image: d.image || '',
      availableHours: d.workingHours || '09:00 AM - 05:00 PM'
    }));
    setDoctors(dynamicDoctors);

    // Filter appointments for current user
    if (profile?.email) {
      const emailLower = profile.email.toLowerCase().trim();
      const userAppts = localAppts.filter(a => {
        if (isDoctor) {
          return (a.doctor_email || '').toLowerCase().trim() === emailLower;
        } else {
          return (a.patient_email || '').toLowerCase().trim() === emailLower;
        }
      });
      setAppointments(userAppts);
    } else {
      setAppointments(localAppts);
    }

    setSlots(localSlots);
    setIsLoading(false);
  };

  // ---------------- PATIENT BOOKING ACTIONS ----------------

  const handleOpenBookingModal = (docItem: any) => {
    setBookingDoctor(docItem);
    setBookingDate(new Date().toISOString().split('T')[0]);
    setBookingTime('');
    setBookingReason('');
    setBookingFeedbackMessage(null);
    setShowBookingModal(true);
  };

  const handlePatientSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.email || !bookingDoctor || !bookingDate || !bookingTime) return;

    if (!bookingReason.trim()) {
      alert("Please select or describe your dental concern.");
      return;
    }

    setIsSubmittingBooking(true);
    try {
      await requestAppointment({
        patientEmail: profile.email,
        patientName: profile.name || 'Patient',
        patientPhone: profile.phone,
        patientAge: profile.age,
        patientGender: profile.gender,
        patientBloodGroup: profile.bloodGroup,
        doctorEmail: bookingDoctor.email,
        doctorName: bookingDoctor.name,
        doctorSpecialty: 'Dental Surgeon',
        doctorImage: bookingDoctor.image,
        location: bookingDoctor.location || 'Raihan Dental Clinic',
        date: bookingDate,
        time: bookingTime,
        consultationType: 'on_site',
        reason: bookingReason.trim()
      });

      // Clear modal & switch to Pending Requests Tab
      setShowBookingModal(false);
      setPatientActiveTab('pending');
      setBookingFeedbackMessage(
        "Your on-site dental appointment request has been submitted. Please wait for the dentist's approval. You will receive a notification once reviewed."
      );
      loadAllData();
    } catch (err) {
      console.error("Booking error:", err);
      alert("Failed to submit request. Please try again.");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handlePatientCancelRequest = async (appId: string) => {
    const isConfirmed = await confirm({
      title: 'Withdraw Appointment Request',
      message: 'Are you sure you want to withdraw this appointment request? The requested time slot will be released.',
      confirmLabel: 'Yes, Withdraw',
      cancelLabel: 'Keep Request',
      severity: 'danger'
    });
    if (!isConfirmed) return;

    await cancelAppointment(appId, 'Patient', profile?.email || '');
    loadAllData();
  };

  // ---------------- DOCTOR APPROVAL / REJECTION ACTIONS ----------------

  const handleDoctorAccept = async (appId: string) => {
    setIsSubmittingDecision(true);
    try {
      await acceptAppointment(appId);
      loadAllData();
    } catch (err) {
      console.error("Doctor accept error:", err);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const handleOpenRejectModal = (appt: Appointment) => {
    setRejectingAppt(appt);
    setRejectionReason('');
  };

  const handleDoctorConfirmReject = async () => {
    if (!rejectingAppt) return;
    setIsSubmittingDecision(true);
    try {
      await rejectAppointment(rejectingAppt.id, rejectionReason.trim());
      setRejectingAppt(null);
      setRejectionReason('');
      loadAllData();
    } catch (err) {
      console.error("Doctor reject error:", err);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const handleDoctorComplete = async (appId: string) => {
    await completeAppointment(appId);
    loadAllData();
  };

  // ---------------- DOCTOR AVAILABILITY ACTIONS ----------------

  const handleAddSingleSlot = () => {
    if (!profile?.email || !availDate || !availTime) return;
    setAvailError('');
    setAvailSuccess('');

    // Format time to 12-hour
    const [hStr, mStr] = availTime.split(':');
    const h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const formatted = `${h12.toString().padStart(2, '0')}:${mStr} ${ampm}`;

    const res = addDoctorSlot({
      doctor_email: profile.email,
      doctor_name: profile.name || 'Doctor',
      slot_date: availDate,
      slot_time: formatted,
      duration: availDuration,
      is_available: true
    });

    if (!res.success) {
      setAvailError(res.error || 'Failed to add slot.');
    } else {
      setAvailSuccess(`Slot added for ${formatted} on ${availDate}.`);
      loadAllData();
      setTimeout(() => setAvailSuccess(''), 3000);
    }
  };

  const handleBatchGenerateSlots = (block: 'morning' | 'afternoon' | 'evening') => {
    if (!profile?.email || !availDate) return;
    setAvailError('');
    setAvailSuccess('');

    let times: string[] = [];
    if (block === 'morning') {
      times = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'];
    } else if (block === 'afternoon') {
      times = ['02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'];
    } else {
      times = ['05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM'];
    }

    const { added, skipped } = batchAddDoctorSlots({
      doctorEmail: profile.email,
      doctorName: profile.name || 'Doctor',
      date: availDate,
      times,
      duration: availDuration
    });

    setAvailSuccess(`Generated ${added} available slots for ${availDate}${skipped > 0 ? ` (${skipped} existing skipped)` : ''}.`);
    loadAllData();
    setTimeout(() => setAvailSuccess(''), 3500);
  };

  const handleDeleteSlot = async (slotId: string) => {
    deleteDoctorSlot(slotId);
    loadAllData();
  };

  // ---------------- GOOGLE CALENDAR & MEET HELPERS ----------------

  const parseAppointmentDateTime = (dateStr: string, timeStr: string): Date => {
    try {
      const [hoursMin, ampm] = timeStr.trim().split(' ');
      const [hoursStr, minutesStr] = hoursMin.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      if (ampm === 'PM' && hours < 12) hours += 12;
      else if (ampm === 'AM' && hours === 12) hours = 0;
      
      const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
      const parsedDate = new Date();
      parsedDate.setFullYear(year, month - 1, day);
      parsedDate.setHours(hours, minutes, 0, 0);
      return parsedDate;
    } catch (error) {
      return new Date();
    }
  };

  const handleSyncToGoogleCalendar = async (app: Appointment) => {
    let token = googleToken;
    if (!token) {
      const confirmAuth = window.confirm("Connect your Google Calendar to export this consultation?");
      if (!confirmAuth) return;
      token = await connectGoogleCalendar();
      if (!token) return;
    }

    setSyncingApptId(app.id);
    try {
      const startDateTime = parseAppointmentDateTime(app.appointment_date, app.appointment_time);
      const endDateTime = new Date(startDateTime.getTime() + (app.duration || 30) * 60 * 1000);

      const otherPerson = isDoctor ? app.patient_name : `Dr. ${app.doctor_name}`;
      const summary = `Raihan Dental Clinic: ${otherPerson}`;
      const description = `On-Site Dental Consultation\n` +
        `Patient: ${app.patient_name} (${app.patient_email})\n` +
        `Dentist: Dr. ${app.doctor_name}\n` +
        `Reason: ${app.reason}\n\n` +
        `Location: ${app.location || 'Raihan Dental Clinic'}\n` +
        `Portal URL: ${window.location.origin}/appointments`;

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary,
          location: app.location,
          description,
          start: { dateTime: startDateTime.toISOString() },
          end: { dateTime: endDateTime.toISOString() }
        })
      });

      if (!res.ok) throw new Error("Google Calendar sync failed.");
      
      // Update state locally
      const all = getLocalAppointments();
      const target = all.find(a => a.id === app.id);
      if (target) {
        target.is_synced_to_calendar = true;
        saveLocalAppointments(all);
        loadAllData();
      }

      setSyncFeedback(prev => ({ ...prev, [app.id]: { status: 'success' } }));
    } catch (e: any) {
      setSyncFeedback(prev => ({ ...prev, [app.id]: { status: 'error', message: e.message } }));
    } finally {
      setSyncingApptId(null);
    }
  };

  // ---------------- FILTERING LOGIC ----------------

  // Doctor Filtered Appointments
  const doctorPendingRequests = appointments.filter(a => a.status === 'PENDING');
  const doctorUpcomingAccepted = appointments.filter(a => a.status === 'ACCEPTED');
  const doctorCompleted = appointments.filter(a => a.status === 'COMPLETED');
  const doctorRejected = appointments.filter(a => a.status === 'REJECTED');
  const doctorHistory = appointments.filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED' || a.status === 'REJECTED');

  // Patient Filtered Appointments
  const patientPendingRequests = appointments.filter(a => a.status === 'PENDING');
  const patientConfirmedVisits = appointments.filter(a => a.status === 'ACCEPTED');
  const patientRejectedRequests = appointments.filter(a => a.status === 'REJECTED');
  const patientCompletedVisits = appointments.filter(a => a.status === 'COMPLETED');
  const patientHistory = appointments.filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED');

  // Doctor Slots Filtered
  const currentDoctorSlots = slots.filter(s => s.doctor_email === profile?.email);
  const slotsForSelectedAvailDate = currentDoctorSlots.filter(s => s.slot_date === availDate);

  // Patient Doctors Directory Filter (Search by dentist name or clinic location)
  const filteredDoctors = doctors.filter(docItem => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (docItem.name || '').toLowerCase().includes(query) ||
           (docItem.location || '').toLowerCase().includes(query);
  });

  // Calendar Days Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(app => {
      try {
        const appDate = parseISO(app.appointment_date);
        return isSameDay(appDate, day);
      } catch (e) {
        return false;
      }
    });
  };

  // Slots available for booking modal
  const bookingDoctorSlots = slots.filter(
    s => s.doctor_email === bookingDoctor?.email && s.slot_date === bookingDate
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* ---------------- PAGE TOP BAR ---------------- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              {isDoctor ? 'Clinical Schedule' : 'Dental Appointments'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Appointments
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-normal text-sm">
            {isDoctor 
              ? 'Review pending patient consultation requests, approve time slots, and manage clinic availability.'
              : 'Request an on-site dental consultation and monitor your appointment status.'}
          </p>
        </div>

        {/* View Toggles (List vs Calendar) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'list' 
                  ? "bg-slate-900 text-white dark:bg-slate-800 shadow-xs" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'calendar' 
                  ? "bg-slate-900 text-white dark:bg-slate-800 shadow-xs" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Patient Feedback Banner */}
      <AnimatePresence>
        {bookingFeedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-5 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-start gap-4 shadow-sm"
          >
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <h4 className="font-bold text-emerald-900 text-sm">Request Submitted Successfully</h4>
              <p className="text-emerald-800 text-xs leading-relaxed font-medium">
                {bookingFeedbackMessage}
              </p>
            </div>
            <button 
              onClick={() => setBookingFeedbackMessage(null)}
              className="text-emerald-500 hover:text-emerald-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 1. DOCTOR DASHBOARD VIEW (Role-Based Workflow)                  */}
      {/* ============================================================== */}
      {isDoctor && (
        <div className="space-y-6">
          
          {/* Doctor Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <button
              onClick={() => setDoctorActiveTab('requests')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                doctorActiveTab === 'requests' 
                  ? "bg-slate-900 text-white dark:bg-slate-800 shadow-xs font-semibold" 
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
              )}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Pending Requests</span>
              {doctorPendingRequests.length > 0 && (
                <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                  {doctorPendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setDoctorActiveTab('upcoming')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                doctorActiveTab === 'upcoming' 
                  ? "bg-slate-900 text-white dark:bg-slate-800 shadow-xs font-semibold" 
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
              )}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Confirmed Visits</span>
              {doctorUpcomingAccepted.length > 0 && (
                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                  {doctorUpcomingAccepted.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setDoctorActiveTab('availability')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                doctorActiveTab === 'availability' 
                  ? "bg-slate-900 text-white dark:bg-slate-800 shadow-xs font-semibold" 
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
              )}
            >
              <Stethoscope className="w-4 h-4 text-emerald-600" />
              <span>Manage Availability</span>
              <span className="text-[11px] text-slate-400">({currentDoctorSlots.length})</span>
            </button>

            <button
              onClick={() => setDoctorActiveTab('history')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                doctorActiveTab === 'history' 
                  ? "bg-slate-900 text-white dark:bg-slate-800 shadow-xs font-semibold" 
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
              )}
            >
              <CalendarIcon className="w-4 h-4 text-slate-400" />
              <span>Consultation History</span>
            </button>
          </div>

          {/* TAB 1: DOCTOR PENDING REQUESTS */}
          {doctorActiveTab === 'requests' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Pending Consultation Requests</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Review patient symptoms, requested slot, and accept or decline.</p>
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {doctorPendingRequests.length} awaiting decision
                </span>
              </div>

              {doctorPendingRequests.length === 0 ? (
                <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                    <CheckCheck className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No Pending Requests</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto leading-relaxed">
                    You have no pending appointment requests. New requests submitted by registered patients will appear here immediately.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {doctorPendingRequests.map((appt) => (
                    <motion.div
                      key={appt.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-base border border-amber-200 dark:border-amber-800/60 shrink-0 overflow-hidden">
                            {getPersonPhoto(appt.patient_email) ? (
                              <img src={getPersonPhoto(appt.patient_email)} alt={appt.patient_name} className="w-full h-full object-cover" />
                            ) : (
                              (appt.patient_name || 'P').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{appt.patient_name}</h4>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                Pending Approval
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{appt.patient_email}</p>
                            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600 dark:text-slate-400">
                              {appt.patient_phone && <span>Phone: <strong className="text-slate-800 dark:text-slate-200">{appt.patient_phone}</strong></span>}
                              {appt.patient_blood_group && <span>Blood: <strong className="text-slate-800 dark:text-slate-200">{appt.patient_blood_group}</strong></span>}
                            </div>
                          </div>
                        </div>

                        {/* Request Date & Time Box */}
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-left md:text-right space-y-0.5 shrink-0">
                          <div className="flex items-center md:justify-end gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                            <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{appt.appointment_date}</span>
                          </div>
                          <div className="flex items-center md:justify-end gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{appt.appointment_time} ({appt.duration || 30} mins)</span>
                          </div>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                            On-Site Consultation
                          </span>
                        </div>
                      </div>

                      {/* Reason for Consultation */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Patient Complaint / Concern
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          {appt.reason}
                        </p>
                      </div>

                      {/* Doctor Decision Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] text-slate-400">
                          Requested: {new Date(appt.created_at || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenRejectModal(appt)}
                            disabled={isSubmittingDecision}
                            className="px-3.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>

                          <button
                            onClick={() => handleDoctorAccept(appt.id)}
                            disabled={isSubmittingDecision}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept Appointment</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOCTOR CONFIRMED / UPCOMING VISITS */}
          {doctorActiveTab === 'upcoming' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Confirmed Patient Consultations</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Appointments you have accepted and locked into your clinic schedule.</p>
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{doctorUpcomingAccepted.length} confirmed</span>
              </div>

              {doctorUpcomingAccepted.length === 0 ? (
                <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                    <CalendarIcon className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No Confirmed Visits Yet</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                    When you accept incoming requests, they will appear here with calendar sync, prescription writing, and consultation completion actions.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {doctorUpcomingAccepted.map((appt) => (
                    <div key={appt.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-base border border-emerald-100 dark:border-emerald-800/60 overflow-hidden">
                            {getPersonPhoto(appt.patient_email) ? (
                              <img src={getPersonPhoto(appt.patient_email)} alt={appt.patient_name} className="w-full h-full object-cover" />
                            ) : (
                              (appt.patient_name || 'P').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{appt.patient_name}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{appt.patient_email}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          Confirmed
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Date & Time</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{appt.appointment_date} at {appt.appointment_time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Visit Location</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">Raihan Dental Clinic (On-Site)</span>
                        </div>
                        {appt.reason && (
                          <div className="pt-1 text-xs text-slate-600 dark:text-slate-300 italic">
                            "{appt.reason}"
                          </div>
                        )}
                      </div>

                      {/* Doctor Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSyncToGoogleCalendar(appt)}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <CalendarPlus className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{appt.is_synced_to_calendar ? 'Synced' : 'Sync Calendar'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate('/payments', { state: { patientEmail: appt.patient_email, patientName: appt.patient_name, appointmentId: appt.id, openAssign: true } })}
                            className="px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                            title="Assign Consultation Fee / Bill Patient"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Bill Patient</span>
                          </button>

                          <button
                            onClick={() => navigate('/prescriptions', { state: { patientEmail: appt.patient_email, patientName: appt.patient_name } })}
                            className="px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                            title="Write Prescription"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>Prescription</span>
                          </button>

                          <button
                            onClick={() => handleDoctorComplete(appt.id)}
                            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium transition-colors"
                          >
                            Complete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DOCTOR AVAILABILITY SLOT MANAGER */}
          {doctorActiveTab === 'availability' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Slot Generator Form */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Schedule Availability</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Configure clinic hours and appointment slots</p>
                    </div>
                  </div>

                  {availError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium">
                      {availError}
                    </div>
                  )}

                  {availSuccess && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-medium">
                      {availSuccess}
                    </div>
                  )}

                  <div className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-medium text-slate-700 dark:text-slate-300">Select Date</label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={availDate}
                        onChange={(e) => setAvailDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-medium text-slate-700 dark:text-slate-300">Slot Duration</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[15, 30, 45, 60].map(dur => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => setAvailDuration(dur)}
                            className={cn(
                              "py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border",
                              availDuration === dur 
                                ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white border-transparent shadow-xs" 
                                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                            )}
                          >
                            {dur}m
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="font-medium text-slate-700 dark:text-slate-300">Add Individual Slot</label>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={availTime}
                          onChange={(e) => setAvailTime(e.target.value)}
                          className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddSingleSlot}
                          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl font-medium text-xs shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Batch Slot Generation */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <label className="font-medium text-slate-700 dark:text-slate-300 block">
                        Quick Slot Blocks
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          type="button"
                          onClick={() => handleBatchGenerateSlots('morning')}
                          className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-left text-xs transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>Morning Block (9:00 AM – 12:00 PM)</span>
                          <span className="text-[11px] text-slate-400 font-normal">+6 slots</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBatchGenerateSlots('afternoon')}
                          className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-left text-xs transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>Afternoon Block (2:00 PM – 5:00 PM)</span>
                          <span className="text-[11px] text-slate-400 font-normal">+6 slots</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBatchGenerateSlots('evening')}
                          className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-left text-xs transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>Evening Block (5:00 PM – 7:00 PM)</span>
                          <span className="text-[11px] text-slate-400 font-normal">+4 slots</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Active Slots for Selected Date */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h4 className="font-semibold text-slate-950 dark:text-slate-100 text-base">Defined Slots for {availDate}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Patients will choose from these slots when requesting on-site consultations.</p>
                    </div>
                    <span className="text-xs font-medium px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-100 dark:border-emerald-800/60 self-start sm:self-auto">
                      {slotsForSelectedAvailDate.length} slot(s)
                    </span>
                  </div>

                  {slotsForSelectedAvailDate.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                      <Clock className="w-8 h-8 text-slate-350 dark:text-slate-600 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No availability slots defined for {availDate}.</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Use the left panel to configure morning, afternoon, or individual slot blocks.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {slotsForSelectedAvailDate.map(slot => (
                        <div
                          key={slot.id}
                          className={cn(
                            "p-3 rounded-xl border flex items-center justify-between transition-colors",
                            slot.is_available 
                              ? "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200" 
                              : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200"
                          )}
                        >
                          <div>
                            <p className="text-xs font-semibold">{slot.slot_time}</p>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">{slot.duration || 30} mins</span>
                            <span className={cn(
                              "block text-[10px] font-medium mt-0.5",
                              slot.is_available ? "text-emerald-600 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                            )}>
                              {slot.is_available ? 'Available' : 'Reserved'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete Slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DOCTOR CONSULTATION HISTORY */}
          {doctorActiveTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Consultation History</h3>
              {doctorHistory.length === 0 ? (
                <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No past or completed consultations recorded yet.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {doctorHistory.map(app => (
                    <div key={app.id} className="p-4 sm:p-5 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{app.patient_name} <span className="text-slate-400 font-normal">({app.patient_email})</span></p>
                        <p className="text-slate-500 dark:text-slate-400">{app.appointment_date} at {app.appointment_time} • On-Site Consultation</p>
                        {app.rejection_reason && (
                          <p className="text-rose-600 dark:text-rose-400 font-medium text-xs pt-0.5">Decline reason: {app.rejection_reason}</p>
                        )}
                      </div>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded text-[11px] font-medium capitalize",
                        app.status === 'COMPLETED' ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" :
                        app.status === 'REJECTED' ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300" :
                        "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      )}>
                        {app.status.toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* 2. PATIENT DASHBOARD VIEW (Patient-Initiated Workflow)          */}
      {/* ============================================================== */}
      {isPatient && (
        <div className="space-y-6">

          {/* Patient Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <button
              onClick={() => setPatientActiveTab('book')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                patientActiveTab === 'book' 
                  ? "bg-slate-900 text-white dark:bg-slate-800 shadow-xs font-semibold" 
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
              )}
            >
              <Search className="w-4 h-4 text-emerald-500" />
              <span>Book Appointment</span>
            </button>

            <button
              onClick={() => setPatientActiveTab('pending')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                patientActiveTab === 'pending' 
                  ? "bg-slate-900 text-white dark:bg-slate-800 shadow-xs font-semibold" 
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
              )}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Pending Requests</span>
              {patientPendingRequests.length > 0 && (
                <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                  {patientPendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setPatientActiveTab('confirmed')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                patientActiveTab === 'confirmed' 
                  ? "bg-slate-900 text-white dark:bg-slate-800 shadow-xs font-semibold" 
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
              )}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Confirmed Visits</span>
              {patientConfirmedVisits.length > 0 && (
                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                  {patientConfirmedVisits.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setPatientActiveTab('rejected')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                patientActiveTab === 'rejected' 
                  ? "bg-slate-900 text-white dark:bg-slate-800 shadow-xs font-semibold" 
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
              )}
            >
              <XCircle className="w-4 h-4 text-rose-500" />
              <span>Declined Requests</span>
              {patientRejectedRequests.length > 0 && (
                <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                  {patientRejectedRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setPatientActiveTab('history')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                patientActiveTab === 'history' 
                  ? "bg-slate-900 text-white dark:bg-slate-800 shadow-xs font-semibold" 
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
              )}
            >
              <History className="w-4 h-4 text-slate-400" />
              <span>Past Consultations</span>
            </button>
          </div>

          {/* TAB 1: PATIENT BROWSE & BOOK DOCTOR */}
          {patientActiveTab === 'book' && (
            <div className="space-y-6">
              
              {/* Search Dentists Directory */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search dentist by name or clinic location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none text-xs font-medium text-slate-900 dark:text-slate-100 transition-colors shadow-xs"
                  />
                </div>
              </div>

              {/* Doctors Directory Cards */}
              {filteredDoctors.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <Stethoscope className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Dentists Available</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      {searchQuery 
                        ? "No dentists match your search filter." 
                        : "There are currently no registered dentists in the system. Registered dentists will appear here."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredDoctors.map(docItem => (
                    <div
                      key={docItem.id}
                      className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3.5">
                        <div className="flex items-start gap-3.5">
                          <div className="w-13 h-13 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                            {docItem.image ? (
                              <img src={docItem.image} alt={docItem.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-lg text-slate-400">
                                {(docItem.name || 'D').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                              {docItem.name.startsWith('Dr.') ? docItem.name : `Dr. ${docItem.name}`}
                            </h4>
                            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Dental Surgeon</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{docItem.education || 'BDS, MDS'}</p>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{docItem.location || 'Raihan Dental Clinic'} (On-Site)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{docItem.availableHours || '09:00 AM – 05:00 PM'}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-slate-500 dark:text-slate-400">Consultation Fee</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">${docItem.fee || 50}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenBookingModal(docItem)}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>Request Appointment</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PATIENT PENDING REQUESTS */}
          {patientActiveTab === 'pending' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Submitted Consultation Requests</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">These requests are awaiting review and confirmation by the dentist.</p>
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{patientPendingRequests.length} pending</span>
              </div>

              {patientPendingRequests.length === 0 ? (
                <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <Clock className="w-10 h-10 text-slate-350 dark:text-slate-600 mx-auto" />
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No Pending Requests</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                    You have no active pending requests. Browse available clinic slots to request an appointment.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patientPendingRequests.map((appt) => (
                    <div key={appt.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                            Awaiting Dentist Approval
                          </span>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-2">
                            {appt.doctor_name.startsWith('Dr.') ? appt.doctor_name : `Dr. ${appt.doctor_name}`}
                          </h4>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Dental Surgeon</p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{appt.appointment_date}</p>
                          <p className="text-slate-500 dark:text-slate-400">{appt.appointment_time}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/40 space-y-0.5">
                        <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Submitted Reason</span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium italic">"{appt.reason}"</p>
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>The dentist will review your request. You will receive an instant notification when approved.</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800/60">
                          On-Site Clinic Consultation
                        </span>
                        <button
                          onClick={() => handlePatientCancelRequest(appt.id)}
                          className="text-xs font-medium text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          Withdraw Request
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PATIENT CONFIRMED APPOINTMENTS */}
          {patientActiveTab === 'confirmed' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Confirmed Consultations</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Your approved on-site appointments at Raihan Dental Clinic.</p>
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{patientConfirmedVisits.length} approved</span>
              </div>

              {patientConfirmedVisits.length === 0 ? (
                <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-slate-350 dark:text-slate-600 mx-auto" />
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No Confirmed Visits Yet</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                    Once the dentist approves your requested appointment, it will appear here with your confirmed clinic consultation schedule.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patientConfirmedVisits.map((appt) => (
                    <div key={appt.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-base border border-emerald-100 dark:border-emerald-800/60 overflow-hidden">
                            {getPersonPhoto(appt.doctor_email) ? (
                              <img src={getPersonPhoto(appt.doctor_email)} alt={appt.doctor_name} className="w-full h-full object-cover" />
                            ) : (
                              (appt.doctor_name || 'D').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                              {appt.doctor_name.startsWith('Dr.') ? appt.doctor_name : `Dr. ${appt.doctor_name}`}
                            </h4>
                            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Dental Surgeon</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          Approved
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Date & Time</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{appt.appointment_date} at {appt.appointment_time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Visit Location</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{appt.location || 'Raihan Dental Clinic (On-Site)'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Visit Type</span>
                          <span className="font-medium text-emerald-700 dark:text-emerald-300">On-Site Dental Consultation</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSyncToGoogleCalendar(appt)}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <CalendarPlus className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{appt.is_synced_to_calendar ? 'Synced' : 'Sync Calendar'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate('/messages', { state: { targetEmail: appt.doctor_email, targetName: appt.doctor_name.startsWith('Dr.') ? appt.doctor_name : `Dr. ${appt.doctor_name}` } })}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 rounded-lg transition-colors"
                            title="Message Dentist"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => navigate('/payments', { state: { appointmentId: appt.id } })}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 rounded-lg transition-colors"
                            title="View / Pay Consultation Invoice"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handlePatientCancelRequest(appt.id)}
                            className="text-xs font-medium text-rose-500 hover:text-rose-700 cursor-pointer ml-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PATIENT DECLINED REQUESTS */}
          {patientActiveTab === 'rejected' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Declined Consultation Requests</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Requests that could not be accommodated. You may choose an alternate open slot.</p>
                </div>
              </div>

              {patientRejectedRequests.length === 0 ? (
                <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No declined requests.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patientRejectedRequests.map((appt) => (
                    <div key={appt.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                            {appt.doctor_name.startsWith('Dr.') ? appt.doctor_name : `Dr. ${appt.doctor_name}`}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{appt.appointment_date} at {appt.appointment_time}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                          Declined
                        </span>
                      </div>

                      <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/40 space-y-1">
                        <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider">Dentist Feedback</span>
                        <p className="text-xs text-rose-900 dark:text-rose-200 font-medium leading-relaxed">
                          "{appt.rejection_reason || 'Dentist unavailable at the requested time.'}"
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          const docMatch = doctors.find(d => d.email === appt.doctor_email) || {
                            email: appt.doctor_email,
                            name: appt.doctor_name.startsWith('Dr.') ? appt.doctor_name : `Dr. ${appt.doctor_name}`,
                            specialty: 'General Dentistry',
                            location: appt.location || 'Raihan Dental Clinic'
                          };
                          handleOpenBookingModal(docMatch);
                        }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Select Alternate Time Slot</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PATIENT PAST VISITS */}
          {patientActiveTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Consultation History</h3>
              {patientHistory.length === 0 ? (
                <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No past visits recorded.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-xs">
                  {patientHistory.map(app => (
                    <div key={app.id} className="p-4 sm:p-5 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {app.doctor_name.startsWith('Dr.') ? app.doctor_name : `Dr. ${app.doctor_name}`} (Dental Surgeon)
                        </p>
                        <p className="text-slate-500 dark:text-slate-400">{app.appointment_date} at {app.appointment_time}</p>
                      </div>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded text-[11px] font-medium capitalize",
                        app.status === 'COMPLETED' ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      )}>
                        {app.status.toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* 3. CALENDAR VIEW MODAL / TAB                                   */}
      {/* ============================================================== */}
      {viewMode === 'calendar' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden animate-fadeIn">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
                <button 
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
            </div>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[700px] md:min-w-0">
              <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-2.5 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  const dayAppointments = getAppointmentsForDay(day);
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div 
                      key={day.toString()} 
                      className={cn(
                        "min-h-[100px] p-2 border-r border-b border-slate-100 dark:border-slate-800/80 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30",
                        !isCurrentMonth && "bg-slate-50/30 dark:bg-slate-950/40 opacity-40",
                        idx % 7 === 6 && "border-r-0"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                          "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                          isToday ? "bg-emerald-600 text-white font-semibold" : "text-slate-700 dark:text-slate-300"
                        )}>
                          {format(day, 'd')}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 2).map(app => (
                          <div 
                            key={app.id}
                            className={cn(
                              "text-[10px] p-1 rounded-md border truncate font-medium",
                              app.status === 'ACCEPTED' ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200" :
                              app.status === 'PENDING' ? "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200" :
                              "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                            )}
                          >
                            {app.appointment_time} - {isDoctor ? app.patient_name : (app.doctor_name.startsWith('Dr.') ? app.doctor_name : `Dr. ${app.doctor_name}`)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. PATIENT APPOINTMENT BOOKING MODAL                           */}
      {/* ============================================================== */}
      <AnimatePresence>
        {showBookingModal && bookingDoctor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CalendarPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Request Dental Appointment</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {bookingDoctor.name.startsWith('Dr.') ? bookingDoctor.name : `Dr. ${bookingDoctor.name}`} • On-Site Consultation
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePatientSubmitRequest} className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                
                {/* Appointment Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-emerald-600" />
                    <span>Appointment Date</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={bookingDate}
                      onChange={(e) => {
                        setBookingDate(e.target.value);
                        setBookingTime('');
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">Raihan Dental Clinic (On-Site)</span>
                    </div>
                  </div>
                </div>

                {/* Available Time Slot */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>Available Time Slot</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {bookingDoctorSlots.filter((s: any) => s.is_available).length > 0 
                        ? `${bookingDoctorSlots.filter((s: any) => s.is_available).length} open slot(s)` 
                        : 'Standard clinic hours available'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {(bookingDoctorSlots.length > 0 
                      ? bookingDoctorSlots 
                      : [
                          { id: 'def-1', slot_time: '09:00 AM', is_available: true },
                          { id: 'def-2', slot_time: '10:00 AM', is_available: true },
                          { id: 'def-3', slot_time: '11:30 AM', is_available: true },
                          { id: 'def-4', slot_time: '02:00 PM', is_available: true },
                          { id: 'def-5', slot_time: '03:30 PM', is_available: true },
                          { id: 'def-6', slot_time: '04:30 PM', is_available: true }
                        ]
                    ).map((slot: any) => {
                      const isReserved = !slot.is_available;
                      const isSelected = bookingTime === slot.slot_time;

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isReserved}
                          onClick={() => setBookingTime(slot.slot_time)}
                          className={cn(
                            "p-2 rounded-xl border text-xs font-medium transition-all flex flex-col items-center cursor-pointer",
                            isSelected 
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" 
                              : isReserved 
                                ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-50" 
                                : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30"
                          )}
                        >
                          <span>{slot.slot_time}</span>
                          {isReserved && <span className="text-[9px] text-rose-500 font-semibold">Reserved</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reason for Dental Visit & Symptoms */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Dental Concern / Reason for Visit</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  
                  {/* Quick Dental Concern Chips */}
                  <div className="flex flex-wrap gap-1.5 pb-0.5">
                    {[
                      'Toothache / Sensitivity',
                      'Routine Dental Cleaning (Scaling)',
                      'Broken Filling / Chipped Tooth',
                      'Bleeding or Swollen Gums',
                      'Root Canal Evaluation',
                      'Wisdom Tooth Pain',
                      'General Dental Consultation'
                    ].map(chip => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setBookingReason(chip)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border",
                          bookingReason === chip 
                            ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white border-transparent" 
                            : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        )}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    required
                    value={bookingReason}
                    onChange={(e) => setBookingReason(e.target.value)}
                    placeholder="Describe your dental symptoms, affected tooth area, or reason for this visit..."
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none text-xs text-slate-900 dark:text-slate-100 transition-all resize-none font-medium"
                  />
                </div>

                {/* Appointment Request Summary */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Appointment Summary
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Dentist</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {bookingDoctor.name.startsWith('Dr.') ? bookingDoctor.name : `Dr. ${bookingDoctor.name}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Visit Location</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        Raihan Dental Clinic (On-Site)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Date & Time</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {bookingDate} • {bookingTime || '(Select a time slot)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Concern</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                        {bookingReason || '(Enter reason)'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Requests are submitted with <strong>Pending</strong> status. Dr. Raihan reviews and confirms appointments according to clinic chair capacity.
                    </span>
                  </div>
                </div>

                {/* Submit Request Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingBooking || !bookingTime}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingBooking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Submit Appointment Request</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 5. DOCTOR REJECTION REASON MODAL                               */}
      {/* ============================================================== */}
      <AnimatePresence>
        {rejectingAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Decline Consultation Request</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Patient: {rejectingAppt.patient_name}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Reason for Declining (shared with patient)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {[
                    'Chair occupied for surgical procedure',
                    'Please choose an afternoon slot',
                    'Prior procedural appointment scheduled',
                    'Dentist unavailable during this hour'
                  ].map(quickReason => (
                    <button
                      key={quickReason}
                      type="button"
                      onClick={() => setRejectionReason(quickReason)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-[11px] font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      {quickReason}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this time slot cannot be accommodated or recommend an alternate time..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-rose-500 resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingAppt(null)}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDoctorConfirmReject}
                  disabled={isSubmittingDecision}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isSubmittingDecision ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Decline Request</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
