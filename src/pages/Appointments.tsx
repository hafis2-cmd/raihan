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
import { useAuth, getRegisteredDentists } from '../context/AuthContext';
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
      name: d.name || d.email.split('@')[0],
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
        patientName: profile.name || (profile.email ? profile.email.split('@')[0] : 'Patient'),
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border",
              isDoctor ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"
            )}>
              {isDoctor ? 'Dentist Schedule Controller' : 'Patient Dental Booking Portal'}
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Dentist Approval Workflow</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
            {isDoctor ? 'Dental Appointment Requests & Schedule' : 'Schedule a Dental Visit'}
          </h1>
          <p className="text-slate-500 font-medium text-sm md:text-base">
            {isDoctor 
              ? 'Review pending patient dental requests, approve time slots, and manage clinic availability.'
              : 'Select a dentist, choose an open clinical slot, and submit an appointment request for dentist approval.'}
          </p>
        </div>

        {/* View Toggles (List vs Calendar) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'list' ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'calendar' ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
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
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setDoctorActiveTab('requests')}
              className={cn(
                "px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                doctorActiveTab === 'requests' 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              )}
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Pending Requests</span>
              {doctorPendingRequests.length > 0 && (
                <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full">
                  {doctorPendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setDoctorActiveTab('upcoming')}
              className={cn(
                "px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                doctorActiveTab === 'upcoming' 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              )}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Confirmed Visits</span>
              {doctorUpcomingAccepted.length > 0 && (
                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full">
                  {doctorUpcomingAccepted.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setDoctorActiveTab('availability')}
              className={cn(
                "px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                doctorActiveTab === 'availability' 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              )}
            >
              <Stethoscope className="w-4 h-4 text-emerald-600" />
              <span>Manage Availability Slots</span>
              <span className="text-[10px] text-slate-400 font-semibold">({currentDoctorSlots.length})</span>
            </button>

            <button
              onClick={() => setDoctorActiveTab('history')}
              className={cn(
                "px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                doctorActiveTab === 'history' 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
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
                  <h3 className="text-xl font-black text-slate-800">Pending Patient Requests</h3>
                  <p className="text-xs text-slate-500 font-medium">Review patient symptoms, requested slot, and decide to Approve or Decline.</p>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {doctorPendingRequests.length} request(s) awaiting your decision
                </span>
              </div>

              {doctorPendingRequests.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-[2.5rem] border border-slate-200 shadow-sm space-y-3">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto">
                    <CheckCheck className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-base">All Caught Up!</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    You have no pending appointment requests at this moment. New requests submitted by patients will appear here immediately.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {doctorPendingRequests.map((appt) => (
                    <motion.div
                      key={appt.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-6 sm:p-7 rounded-[2.5rem] border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-5"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-black text-xl border border-amber-200 shrink-0">
                            {(appt.patient_name || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-lg font-black text-slate-800">{appt.patient_name}</h4>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                                ⏳ Pending Approval
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">{appt.patient_email}</p>
                            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600 font-medium">
                              {appt.patient_age && <span>Age: <strong>{appt.patient_age} yrs</strong></span>}
                              {appt.patient_gender && <span>Gender: <strong>{appt.patient_gender}</strong></span>}
                              {appt.patient_blood_group && <span>Blood Group: <strong>{appt.patient_blood_group}</strong></span>}
                              {appt.patient_phone && <span>Phone: <strong>{appt.patient_phone}</strong></span>}
                            </div>
                          </div>
                        </div>

                        {/* Request Date & Time Box */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-right space-y-1 shrink-0">
                          <div className="flex items-center md:justify-end gap-1.5 text-xs font-bold text-slate-800">
                            <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{appt.appointment_date}</span>
                          </div>
                          <div className="flex items-center md:justify-end gap-1.5 text-xs font-bold text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{appt.appointment_time} ({appt.duration || 30} mins)</span>
                          </div>
                          <span className="inline-block mt-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            🏥 On-Site Consultation
                          </span>
                        </div>
                      </div>

                      {/* Reason for Consultation */}
                      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Patient Reason for Consultation
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed font-semibold italic">
                          "{appt.reason}"
                        </p>
                      </div>

                      {/* Doctor Decision Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium">
                          Submitted: {new Date(appt.created_at || Date.now()).toLocaleString()}
                        </span>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleOpenRejectModal(appt)}
                            disabled={isSubmittingDecision}
                            className="px-5 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Decline Request</span>
                          </button>

                          <button
                            onClick={() => handleDoctorAccept(appt.id)}
                            disabled={isSubmittingDecision}
                            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve & Reserve Slot</span>
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
                  <h3 className="text-xl font-black text-slate-800">Confirmed Patient Consultations</h3>
                  <p className="text-xs text-slate-500 font-medium">Appointments you have approved and locked in your schedule.</p>
                </div>
                <span className="text-xs font-bold text-slate-500">{doctorUpcomingAccepted.length} confirmed</span>
              </div>

              {doctorUpcomingAccepted.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-[2.5rem] border border-slate-200 shadow-sm space-y-3">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto">
                    <CalendarIcon className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-base">No Confirmed Visits Yet</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    When you accept incoming requests, they will appear here with instant Meet links, Google Calendar sync, and prescription tools.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {doctorUpcomingAccepted.map((appt) => (
                    <div key={appt.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-lg border border-emerald-100">
                            {(appt.patient_name || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{appt.patient_name}</h4>
                            <p className="text-[11px] text-slate-400">{appt.patient_email}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                          Confirmed
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Date & Time</span>
                          <span className="font-bold text-slate-700">{appt.appointment_date} at {appt.appointment_time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Consultation Type</span>
                          <span className="font-bold text-emerald-700">🏥 On-Site Dental Consultation</span>
                        </div>
                        <div className="pt-1 text-[11px] text-slate-600 italic">
                          "{appt.reason}"
                        </div>
                      </div>

                      {/* Doctor Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSyncToGoogleCalendar(appt)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <CalendarPlus className="w-3 h-3 text-emerald-600" />
                            <span>{appt.is_synced_to_calendar ? 'Synced' : 'Sync Cal'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate('/prescriptions', { state: { patientEmail: appt.patient_email, patientName: appt.patient_name } })}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg"
                            title="Write Prescription"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDoctorComplete(appt.id)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold"
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
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 space-y-5">
                  <div className="flex items-center gap-3 border-b border-white/15 pb-3">
                    <Stethoscope className="w-6 h-6 text-white" />
                    <div>
                      <h3 className="font-black text-base">Dentist Availability Manager</h3>
                      <p className="text-[10px] text-emerald-100 font-semibold">Define your clinic appointment schedule</p>
                    </div>
                  </div>

                  {availError && (
                    <div className="p-3 bg-rose-500/20 border border-rose-300 text-white rounded-xl text-xs font-bold">
                      {availError}
                    </div>
                  )}

                  {availSuccess && (
                    <div className="p-3 bg-white/20 border border-white/30 text-white rounded-xl text-xs font-bold">
                      {availSuccess}
                    </div>
                  )}

                  <div className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold uppercase tracking-wider text-emerald-100">Select Date</label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={availDate}
                        onChange={(e) => setAvailDate(e.target.value)}
                        className="w-full bg-white/15 border border-white/30 rounded-xl p-3 text-white font-bold outline-none focus:bg-white/25"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold uppercase tracking-wider text-emerald-100">Session Duration</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[15, 30, 45, 60].map(dur => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => setAvailDuration(dur)}
                            className={cn(
                              "py-2 rounded-xl font-bold text-xs transition-all cursor-pointer",
                              availDuration === dur ? "bg-white text-emerald-700 shadow-sm" : "bg-white/10 hover:bg-white/20 text-white"
                            )}
                          >
                            {dur}m
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="font-bold uppercase tracking-wider text-emerald-100">Add Custom Slot Time</label>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={availTime}
                          onChange={(e) => setAvailTime(e.target.value)}
                          className="flex-1 bg-white/15 border border-white/30 rounded-xl p-3 text-white font-bold outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddSingleSlot}
                          className="px-4 py-3 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl font-black text-xs shadow-sm flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Batch Slot Generation */}
                    <div className="pt-3 border-t border-white/15 space-y-2">
                      <label className="font-bold uppercase tracking-wider text-emerald-100 block">
                        Quick Batch Slot Generator
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          type="button"
                          onClick={() => handleBatchGenerateSlots('morning')}
                          className="w-full p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl font-bold text-left text-xs transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span>🌅 Morning Block (9:00 AM - 12:00 PM)</span>
                          <span className="text-[10px] opacity-80">+6 slots</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBatchGenerateSlots('afternoon')}
                          className="w-full p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl font-bold text-left text-xs transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span>☀️ Afternoon Block (2:00 PM - 5:00 PM)</span>
                          <span className="text-[10px] opacity-80">+6 slots</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBatchGenerateSlots('evening')}
                          className="w-full p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl font-bold text-left text-xs transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span>🌙 Evening Block (5:00 PM - 7:00 PM)</span>
                          <span className="text-[10px] opacity-80">+4 slots</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Active Slots for Selected Date */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h4 className="font-black text-slate-800 text-lg">Defined Slots for {availDate}</h4>
                      <p className="text-xs text-slate-400 font-medium">Patients will choose from these slots when requesting appointments.</p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                      {slotsForSelectedAvailDate.length} slot(s)
                    </span>
                  </div>

                  {slotsForSelectedAvailDate.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">No availability slots defined for {availDate}.</p>
                      <p className="text-[11px] text-slate-400">Use the left panel to generate morning or afternoon slot blocks.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {slotsForSelectedAvailDate.map(slot => (
                        <div
                          key={slot.id}
                          className={cn(
                            "p-3.5 rounded-2xl border flex items-center justify-between transition-all",
                            slot.is_available 
                              ? "bg-slate-50 border-slate-200 text-slate-800" 
                              : "bg-amber-50/70 border-amber-200 text-amber-900"
                          )}
                        >
                          <div>
                            <p className="text-xs font-black">{slot.slot_time}</p>
                            <span className="text-[10px] font-bold text-slate-400">{slot.duration || 30}m</span>
                            <span className={cn(
                              "block text-[9px] font-black uppercase tracking-wider mt-0.5",
                              slot.is_available ? "text-emerald-600" : "text-amber-700"
                            )}>
                              {slot.is_available ? '● Available' : '● Reserved'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
              <h3 className="text-xl font-black text-slate-800">Completed & Past Appointments</h3>
              {doctorHistory.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                  <p className="text-sm text-slate-400 font-medium">No past appointments recorded.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {doctorHistory.map(app => (
                    <div key={app.id} className="p-4 sm:p-5 flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800">{app.patient_name} ({app.patient_email})</p>
                        <p className="text-slate-400">{app.appointment_date} at {app.appointment_time} • On-Site Consultation</p>
                        {app.rejection_reason && (
                          <p className="text-rose-600 font-semibold italic text-[11px]">Rejection reason: {app.rejection_reason}</p>
                        )}
                      </div>
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        app.status === 'COMPLETED' ? "bg-slate-100 text-slate-700" :
                        app.status === 'REJECTED' ? "bg-rose-50 text-rose-700" :
                        "bg-slate-100 text-slate-500"
                      )}>
                        {app.status}
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
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setPatientActiveTab('book')}
              className={cn(
                "px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                patientActiveTab === 'book' 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              )}
            >
              <Search className="w-4 h-4 text-emerald-500" />
              <span>Find & Book Dentist</span>
            </button>

            <button
              onClick={() => setPatientActiveTab('pending')}
              className={cn(
                "px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                patientActiveTab === 'pending' 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              )}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              <span>My Pending Requests</span>
              {patientPendingRequests.length > 0 && (
                <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full">
                  {patientPendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setPatientActiveTab('confirmed')}
              className={cn(
                "px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                patientActiveTab === 'confirmed' 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              )}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Confirmed Visits</span>
              {patientConfirmedVisits.length > 0 && (
                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full">
                  {patientConfirmedVisits.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setPatientActiveTab('rejected')}
              className={cn(
                "px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                patientActiveTab === 'rejected' 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              )}
            >
              <XCircle className="w-4 h-4 text-rose-500" />
              <span>Declined Requests</span>
              {patientRejectedRequests.length > 0 && (
                <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full">
                  {patientRejectedRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setPatientActiveTab('history')}
              className={cn(
                "px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs",
                patientActiveTab === 'history' 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
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
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search dentist by name or clinic location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Doctors Directory Cards */}
              {filteredDoctors.length === 0 ? (
                <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                    <Stethoscope className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-slate-800">No Registered Dentists Available</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {searchQuery 
                        ? "No dentists match your search filter." 
                        : "There are currently no registered dentists in the system. Registered dentists will appear here once registered."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDoctors.map(docItem => (
                    <div
                      key={docItem.id}
                      className="bg-white p-6 rounded-[2.5rem] border border-slate-200/90 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all flex flex-col justify-between space-y-5 group"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border-2 border-slate-100 shrink-0">
                            {docItem.image ? (
                              <img src={docItem.image} alt={docItem.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-black text-xl text-slate-400">
                                {(docItem.name || 'D').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 text-base">{docItem.name}</h4>
                            <p className="text-xs font-bold text-emerald-600">Dental Surgeon</p>
                            <p className="text-[11px] text-slate-400 font-medium">{docItem.education || 'BDS, MDS'}</p>
                            <div className="flex items-center gap-1 text-amber-500 text-xs font-bold mt-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              <span>{docItem.rating || '5.0'}</span>
                              <span className="text-[10px] text-slate-400">({docItem.reviews || 0} reviews)</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50/70 rounded-2xl space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{docItem.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{docItem.availableHours || '09:00 AM - 05:00 PM'}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                            <span className="text-slate-400 font-semibold">Consultation Fee</span>
                            <span className="font-black text-slate-800">${docItem.fee || 50}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenBookingModal(docItem)}
                        className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-xs hover:bg-slate-800 transition-all shadow-md shadow-slate-200 flex items-center justify-center gap-2 cursor-pointer group-hover:bg-emerald-600"
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
                  <h3 className="text-xl font-black text-slate-800">Your Submitted Requests</h3>
                  <p className="text-xs text-slate-500 font-medium">These requests are awaiting review by your physician.</p>
                </div>
                <span className="text-xs font-bold text-slate-500">{patientPendingRequests.length} pending</span>
              </div>

              {patientPendingRequests.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-[2.5rem] border border-slate-200 shadow-sm space-y-3">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-base">No Pending Requests</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    You have no active pending requests. Search a doctor to request an appointment.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patientPendingRequests.map((appt) => (
                    <div key={appt.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                            ⏳ Awaiting Doctor Approval
                          </span>
                          <h4 className="text-base font-bold text-slate-800 mt-2">Dr. {appt.doctor_name}</h4>
                          <p className="text-xs text-emerald-600 font-bold">{appt.doctor_specialty}</p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="font-bold text-slate-700">{appt.appointment_date}</p>
                          <p className="text-slate-400">{appt.appointment_time}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-1">
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Submitted Reason</span>
                        <p className="text-xs text-slate-700 font-medium italic">"{appt.reason}"</p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>The doctor will review your request. You will be notified when accepted.</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                          🏥 On-Site Clinic Consultation
                        </span>
                        <button
                          onClick={() => handlePatientCancelRequest(appt.id)}
                          className="text-xs font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
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
                  <h3 className="text-xl font-black text-slate-800">Confirmed Consultations</h3>
                  <p className="text-xs text-slate-500 font-medium">Your approved appointments with verified medical specialists.</p>
                </div>
                <span className="text-xs font-bold text-slate-500">{patientConfirmedVisits.length} approved</span>
              </div>

              {patientConfirmedVisits.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-[2.5rem] border border-slate-200 shadow-sm space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-base">No Confirmed Visits Yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Once the dentist approves your requested appointment, it will appear here with your confirmed clinic consultation schedule.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patientConfirmedVisits.map((appt) => (
                    <div key={appt.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg border border-emerald-200">
                            {(appt.doctor_name || 'D').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">Dr. {appt.doctor_name}</h4>
                            <p className="text-xs font-bold text-emerald-600">Dental Surgeon</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Approved
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Date & Time</span>
                          <span className="font-bold text-slate-800">{appt.appointment_date} at {appt.appointment_time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Location</span>
                          <span className="font-bold text-slate-700">{appt.location || 'Raihan Dental Clinic'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Type</span>
                          <span className="font-bold text-emerald-700">🏥 On-Site Dental Consultation</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSyncToGoogleCalendar(appt)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <CalendarPlus className="w-3 h-3 text-emerald-600" />
                            <span>{appt.is_synced_to_calendar ? 'Synced' : 'Sync Cal'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate('/messages', { state: { targetEmail: appt.doctor_email, targetName: `Dr. ${appt.doctor_name}` } })}
                            className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg"
                            title="Message Doctor"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => navigate('/payments', { state: { appointmentId: appt.id, doctorName: appt.doctor_name, amount: 50 } })}
                            className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg"
                            title="Pay Fee"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handlePatientCancelRequest(appt.id)}
                            className="text-xs font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
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
                  <h3 className="text-xl font-black text-slate-800">Declined Consultation Requests</h3>
                  <p className="text-xs text-slate-500 font-medium">Requests declined by doctors. You can review the reason and book an alternate slot.</p>
                </div>
              </div>

              {patientRejectedRequests.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-[2.5rem] border border-slate-200 shadow-sm space-y-2">
                  <p className="text-sm font-bold text-slate-500">No declined requests.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patientRejectedRequests.map((appt) => (
                    <div key={appt.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800">Dr. {appt.doctor_name}</h4>
                          <p className="text-xs text-slate-500">{appt.appointment_date} at {appt.appointment_time}</p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700">
                          Declined
                        </span>
                      </div>

                      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 space-y-1">
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Doctor Feedback</span>
                        <p className="text-xs text-rose-900 font-semibold leading-relaxed">
                          "{appt.rejection_reason || 'Doctor unavailable at the requested time.'}"
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          const docMatch = doctors.find(d => d.email === appt.doctor_email) || {
                            email: appt.doctor_email,
                            name: `Dr. ${appt.doctor_name}`,
                            specialty: appt.doctor_specialty,
                            location: appt.location
                          };
                          handleOpenBookingModal(docMatch);
                        }}
                        className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Choose Another Time Slot</span>
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
              <h3 className="text-xl font-black text-slate-800">Consultation History</h3>
              {patientHistory.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                  <p className="text-sm text-slate-400 font-medium">No past visits recorded.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {patientHistory.map(app => (
                    <div key={app.id} className="p-4 sm:p-5 flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800">Dr. {app.doctor_name} ({app.doctor_specialty})</p>
                        <p className="text-slate-400">{app.appointment_date} at {app.appointment_time}</p>
                      </div>
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        app.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {app.status}
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
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-black text-slate-800">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <button 
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              Today
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[700px] md:min-w-0">
              <div className="grid grid-cols-7 border-b border-slate-100">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
                        "min-h-[110px] p-2 border-r border-b border-slate-100 transition-all hover:bg-slate-50/40",
                        !isCurrentMonth && "bg-slate-50/50 opacity-40",
                        idx % 7 === 6 && "border-r-0"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={cn(
                          "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                          isToday ? "bg-emerald-600 text-white" : "text-slate-600"
                        )}>
                          {format(day, 'd')}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 2).map(app => (
                          <div 
                            key={app.id}
                            className={cn(
                              "text-[9px] p-1.5 rounded-lg border truncate font-bold",
                              app.status === 'ACCEPTED' ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
                              app.status === 'PENDING' ? "bg-amber-50 border-amber-200 text-amber-800" :
                              "bg-slate-50 border-slate-200 text-slate-600"
                            )}
                          >
                            {app.appointment_time} - {isDoctor ? app.patient_name : app.doctor_name}
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
                    <CalendarPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Request Dental Appointment</h3>
                    <p className="text-xs text-slate-500 font-medium">Dr. {bookingDoctor.name} • On-Site Clinic Consultation</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handlePatientSubmitRequest} className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                
                {/* Section 1: Select Appointment Date */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-emerald-600" />
                    <span>Section 1: Select Appointment Date</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={bookingDate}
                        onChange={(e) => {
                          setBookingDate(e.target.value);
                          setBookingTime('');
                        }}
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 font-medium border border-slate-200 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{bookingDoctor.location || 'Raihan Dental Clinic'} (On-Site)</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Select Available Time Slot */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>Section 2: Select Available Time Slot</span>
                    </label>
                    <span className="text-[11px] font-bold text-slate-400">
                      {bookingDoctorSlots.filter((s: any) => s.is_available).length > 0 
                        ? `${bookingDoctorSlots.filter((s: any) => s.is_available).length} slots configured` 
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
                            "p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center cursor-pointer",
                            isSelected 
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200" 
                              : isReserved 
                                ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60" 
                                : "bg-white border-slate-200 text-slate-700 hover:border-emerald-500 hover:bg-emerald-50"
                          )}
                        >
                          <span>{slot.slot_time}</span>
                          {isReserved && <span className="text-[8px] text-rose-500 font-black uppercase">Reserved</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Reason for Dental Visit & Symptoms */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Section 3: Reason for Dental Visit & Symptoms</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  
                  {/* Quick Dental Concern Chips */}
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {[
                      'Toothache and cold sensitivity',
                      'Routine dental cleaning (Scaling)',
                      'Broken filling or chipped tooth',
                      'Bleeding or swollen gums',
                      'Root canal pain evaluation',
                      'Wisdom tooth discomfort',
                      'Other dental concerns'
                    ].map(chip => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setBookingReason(chip)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border",
                          bookingReason === chip 
                            ? "bg-emerald-600 text-white border-emerald-600" 
                            : "bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 border-transparent"
                        )}
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    required
                    value={bookingReason}
                    onChange={(e) => setBookingReason(e.target.value)}
                    placeholder="Describe your dental concern, symptoms, tooth location, or specific treatment requested..."
                    className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-xs transition-all resize-none font-medium"
                  />
                </div>

                {/* Section 4: Appointment Request Review & Summary */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                    Section 4: Appointment Request Summary
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Selected Dentist</span>
                      <span className="font-bold text-slate-800">Dr. {bookingDoctor.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Consultation Mode</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] inline-block border border-emerald-200">
                        🏥 On-Site Clinic Consultation
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Date & Time</span>
                      <span className="font-bold text-slate-800">
                        {bookingDate} • {bookingTime || '(Please select a slot)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Dental Concern</span>
                      <span className="font-bold text-slate-800 truncate block">
                        {bookingReason || '(Select or enter concern)'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 text-[11px] text-amber-800 flex items-start gap-1.5 font-medium">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Submitting this request creates a <strong>PENDING</strong> appointment. Dr. {bookingDoctor.name} will independently review and accept or decline your request based on clinic chair availability.
                    </span>
                  </div>
                </div>

                {/* Submit Request Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingBooking || !bookingTime}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 disabled:opacity-50 cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-black">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">Decline Appointment Request</h4>
                  <p className="text-xs text-slate-400">Patient: {rejectingAppt.patient_name}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Rejection Reason (will be notified to patient)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Schedule conflict at this hour',
                    'Please select an afternoon slot',
                    'Clinical referral required',
                    'Emergency hospital surgery'
                  ].map(quickReason => (
                    <button
                      key={quickReason}
                      type="button"
                      onClick={() => setRejectionReason(quickReason)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      {quickReason}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request is declined or suggest an alternate slot..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingAppt(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDoctorConfirmReject}
                  disabled={isSubmittingDecision}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDecision ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Decline & Release Slot</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
