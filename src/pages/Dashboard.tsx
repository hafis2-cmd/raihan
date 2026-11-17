import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Calendar, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Stethoscope, 
  FileText, 
  CreditCard, 
  Bell, 
  UserPlus, 
  Plus, 
  Search, 
  CalendarPlus, 
  ShieldCheck, 
  ChevronRight,
  Smile,
  CheckCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Appointment, 
  getLocalAppointments, 
  getLocalNotifications, 
  SystemNotification 
} from '../services/appointmentService';
import { 
  DentalConsultation, 
  DentalPrescription, 
  getLocalConsultations, 
  getLocalPrescriptions 
} from '../services/dentalService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const isDentist = profile?.role === 'Doctor' || profile?.role === 'Dentist';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<DentalConsultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<DentalPrescription[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [todayStr, setTodayStr] = useState(new Date().toISOString().split('T')[0]);

  const loadData = () => {
    const allAppts = getLocalAppointments();
    const allConsultations = getLocalConsultations();
    const allPrescriptions = getLocalPrescriptions();
    
    if (profile?.email) {
      const emailLower = profile.email.toLowerCase().trim();
      if (isDentist) {
        setAppointments(allAppts.filter(a => (a.doctor_email || '').toLowerCase().trim() === emailLower));
        setConsultations(allConsultations.filter(c => (c.dentist_email || '').toLowerCase().trim() === emailLower));
        setPrescriptions(allPrescriptions.filter(p => (p.dentist_email || '').toLowerCase().trim() === emailLower));
      } else {
        setAppointments(allAppts.filter(a => (a.patient_email || '').toLowerCase().trim() === emailLower));
        setConsultations(allConsultations.filter(c => (c.patient_email || '').toLowerCase().trim() === emailLower));
        setPrescriptions(allPrescriptions.filter(p => (p.patient_email || '').toLowerCase().trim() === emailLower));
      }
      setNotifications(getLocalNotifications(profile.email));
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('raihan_appointments_updated', handleUpdate);
    window.addEventListener('raihan_consultations_updated', handleUpdate);
    window.addEventListener('raihan_prescriptions_updated', handleUpdate);
    window.addEventListener('raihan_notification_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('raihan_appointments_updated', handleUpdate);
      window.removeEventListener('raihan_consultations_updated', handleUpdate);
      window.removeEventListener('raihan_prescriptions_updated', handleUpdate);
      window.removeEventListener('raihan_notification_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [profile?.email, isDentist]);

  // Dentist metrics
  const todayAppointments = appointments.filter(a => a.appointment_date === todayStr && a.status === 'ACCEPTED');
  const pendingRequests = appointments.filter(a => a.status === 'PENDING');
  const upcomingAppointments = appointments.filter(a => a.status === 'ACCEPTED' && a.appointment_date >= todayStr);
  const uniquePatientEmails = new Set(appointments.map(a => a.patient_email).filter(Boolean));
  consultations.forEach(c => { if (c.patient_email) uniquePatientEmails.add(c.patient_email); });
  const totalRegisteredPatients = uniquePatientEmails.size;

  // Patient metrics
  const patientUpcoming = appointments.filter(a => a.status === 'ACCEPTED' && a.appointment_date >= todayStr);
  const patientPending = appointments.filter(a => a.status === 'PENDING');
  const patientRxCount = prescriptions.length;
  const patientRecordCount = consultations.length;
  const nextConfirmedAppointment = patientUpcoming[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-r from-emerald-600 to-teal-700 rounded-[2.5rem] p-8 sm:p-10 overflow-hidden text-white shadow-xl shadow-emerald-100">
        <div className="relative z-10 max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-xs font-black uppercase tracking-wider border border-white/20">
            <span>🦷 Raihan Dental Clinic</span>
            <span>•</span>
            <span>{isDentist ? 'Dentist Workspace' : 'Patient Dental Care'}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Welcome back, {profile?.name || (profile?.email || 'User').split('@')[0]}!
          </h2>
          
          <p className="text-emerald-50/90 leading-relaxed text-sm md:text-base font-medium">
            {isDentist 
              ? 'Review pending dental requests, document patient consultations & treatments, manage clinical availability slots, and track dental billing.'
              : 'Schedule dental appointments, review clinical treatments, check dental prescriptions, and track your oral healthcare journey.'}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {isDentist ? (
              <>
                <Link 
                  to="/appointments" 
                  className="px-6 py-3 bg-white text-emerald-700 rounded-2xl font-bold text-xs hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-md"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Review Appointment Requests ({pendingRequests.length})</span>
                </Link>
                <Link 
                  to="/consultations" 
                  className="px-5 py-3 bg-white/15 hover:bg-white/25 text-white rounded-2xl font-bold text-xs transition-all flex items-center gap-2 border border-white/25"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Record Dental Consultation</span>
                </Link>
              </>
            ) : (
              <>
                <Link 
                  to="/appointments" 
                  className="px-6 py-3 bg-white text-emerald-700 rounded-2xl font-bold text-xs hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-md"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Book Dental Appointment</span>
                </Link>
                <Link 
                  to="/consultations" 
                  className="px-5 py-3 bg-white/15 hover:bg-white/25 text-white rounded-2xl font-bold text-xs transition-all flex items-center gap-2 border border-white/25"
                >
                  <FileText className="w-4 h-4" />
                  <span>My Dental Records</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-16 w-48 h-48 bg-teal-400/20 rounded-full translate-y-1/3 blur-2xl pointer-events-none" />
      </div>

      {/* ========================================================== */}
      {/* DENTIST DASHBOARD VIEW                                     */}
      {/* ========================================================== */}
      {isDentist ? (
        <div className="space-y-8">
          
          {/* Key Metrics Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Visits</p>
                <h4 className="text-2xl font-black text-slate-800">{todayAppointments.length}</h4>
                <p className="text-[10px] text-emerald-600 font-bold">Confirmed today</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Requests</p>
                <h4 className="text-2xl font-black text-slate-800">{pendingRequests.length}</h4>
                <p className="text-[10px] text-amber-600 font-bold">Requires decision</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Visits</p>
                <h4 className="text-2xl font-black text-slate-800">{upcomingAppointments.length}</h4>
                <p className="text-[10px] text-blue-600 font-bold">Locked in calendar</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0 border border-purple-100">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Patients</p>
                <h4 className="text-2xl font-black text-slate-800">{totalRegisteredPatients}</h4>
                <p className="text-[10px] text-purple-600 font-bold">Registered dental care</p>
              </div>
            </div>

          </div>

          {/* Quick Access Menu Cards */}
          <div className="space-y-3">
            <h3 className="text-base font-black text-slate-800 tracking-tight">Quick Clinic Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Manage Slots', icon: Clock, path: '/appointments', color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Requests', icon: CalendarPlus, path: '/appointments', color: 'text-amber-600 bg-amber-50', badge: pendingRequests.length },
                { label: 'My Patients', icon: Users, path: '/patients', color: 'text-blue-600 bg-blue-50' },
                { label: 'Consultations', icon: Stethoscope, path: '/consultations', color: 'text-teal-600 bg-teal-50' },
                { label: 'Prescriptions', icon: FileText, path: '/prescriptions', color: 'text-indigo-600 bg-indigo-50' },
                { label: 'Payments', icon: CreditCard, path: '/payments', color: 'text-rose-600 bg-rose-50' },
              ].map((item, idx) => (
                <Link
                  key={idx}
                  to={item.path}
                  className="bg-white p-4 rounded-2xl border border-slate-200/90 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group cursor-pointer relative"
                >
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-black">
                      {item.badge}
                    </span>
                  ) : null}
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105", item.color)}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Two Columns: Pending Requests & Recent Consultations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Column 1: Incoming Patient Requests */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h4 className="font-black text-slate-800 text-base">Pending Appointment Requests</h4>
                </div>
                <Link to="/appointments" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
                  View All ({pendingRequests.length})
                </Link>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                  <CheckCheck className="w-8 h-8 text-emerald-500 mx-auto opacity-60" />
                  <p className="font-bold text-slate-600">No pending requests</p>
                  <p className="text-[11px]">All incoming patient requests have been reviewed.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.slice(0, 3).map(app => (
                    <div key={app.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <h5 className="font-bold text-slate-800">{app.patient_name}</h5>
                        <p className="text-[11px] text-slate-500">{app.appointment_date} at {app.appointment_time}</p>
                        <p className="text-[10px] text-emerald-700 font-semibold italic mt-0.5">"{app.reason}"</p>
                      </div>
                      <Link
                        to="/appointments"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shadow-xs shrink-0"
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Recent Dental Consultations */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  <h4 className="font-black text-slate-800 text-base">Recent Dental Consultations</h4>
                </div>
                <Link to="/consultations" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
                  All Records ({consultations.length})
                </Link>
              </div>

              {consultations.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-600">No consultations recorded yet</p>
                  <p className="text-[11px]">Recorded patient procedures will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {consultations.slice(0, 3).map(c => (
                    <div key={c.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-slate-800">{c.patient_name}</h5>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                            {c.treatment_category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{c.consultation_date} • {c.diagnosis}</p>
                      </div>
                      <Link
                        to="/consultations"
                        className="p-2 hover:bg-slate-200 text-slate-600 rounded-xl"
                        title="View details"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        /* ========================================================== */
        /* PATIENT DASHBOARD VIEW                                     */
        /* ========================================================== */
        <div className="space-y-8">
          
          {/* Next Confirmed Dental Appointment Banner */}
          {nextConfirmedAppointment ? (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-emerald-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100">
                  <Calendar className="w-7 h-7" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Next Confirmed Dental Visit
                  </span>
                  <h4 className="text-lg font-black text-slate-800 mt-1">
                    Dr. {nextConfirmedAppointment.doctor_name} ({nextConfirmedAppointment.doctor_specialty || 'Chief Dental Surgeon'})
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    📅 {nextConfirmedAppointment.appointment_date} at {nextConfirmedAppointment.appointment_time} • 📍 {nextConfirmedAppointment.location}
                  </p>
                </div>
              </div>

              <Link
                to="/appointments"
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm shrink-0 self-start md:self-auto"
              >
                View Visit Details
              </Link>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                  <CalendarPlus className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Need a Dental Checkup?</h4>
                  <p className="text-xs text-slate-400">Schedule your routine cleaning, examination, or pain evaluation.</p>
                </div>
              </div>
              <Link
                to="/appointments"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 self-start sm:self-auto"
              >
                Find & Book Dentist
              </Link>
            </div>
          )}

          {/* Patient Overview Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Visits</p>
                <h4 className="text-2xl font-black text-slate-800">{patientUpcoming.length}</h4>
                <p className="text-[10px] text-emerald-600 font-bold">Confirmed appointments</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Requests</p>
                <h4 className="text-2xl font-black text-slate-800">{patientPending.length}</h4>
                <p className="text-[10px] text-amber-600 font-bold">Awaiting approval</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prescriptions</p>
                <h4 className="text-2xl font-black text-slate-800">{patientRxCount}</h4>
                <p className="text-[10px] text-indigo-600 font-bold">Active medications</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shrink-0 border border-teal-100">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dental Records</p>
                <h4 className="text-2xl font-black text-slate-800">{patientRecordCount}</h4>
                <p className="text-[10px] text-teal-600 font-bold">Clinical visits</p>
              </div>
            </div>
          </div>

          {/* Patient Quick Actions */}
          <div className="space-y-3">
            <h3 className="text-base font-black text-slate-800 tracking-tight">Your Dental Portal</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Book Dentist', icon: CalendarPlus, path: '/appointments', color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Dental Records', icon: Stethoscope, path: '/consultations', color: 'text-teal-600 bg-teal-50', badge: consultations.length },
                { label: 'Prescriptions', icon: FileText, path: '/prescriptions', color: 'text-indigo-600 bg-indigo-50', badge: prescriptions.length },
                { label: 'Dental Billing', icon: CreditCard, path: '/payments', color: 'text-amber-600 bg-amber-50' },
              ].map((item, idx) => (
                <Link
                  key={idx}
                  to={item.path}
                  className="bg-white p-4 rounded-2xl border border-slate-200/90 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group cursor-pointer relative"
                >
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-500 text-white rounded-full text-[9px] font-black">
                      {item.badge}
                    </span>
                  ) : null}
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105", item.color)}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Patient Two Columns: Recent Dental Treatments & Prescriptions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Dental History Column */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-black text-slate-800 text-base">Recent Dental Treatments</h4>
                </div>
                <Link to="/consultations" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
                  View All
                </Link>
              </div>

              {consultations.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-bold text-slate-600">No consultation records</p>
                  <p className="text-[11px]">When your dentist completes a visit, records will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {consultations.slice(0, 3).map(c => (
                    <div key={c.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{c.treatment_category}</span>
                        <span className="text-slate-400 text-[10px]">{c.consultation_date}</span>
                      </div>
                      <p className="text-slate-600 font-medium">Diagnosis: <strong>{c.diagnosis}</strong></p>
                      <p className="text-[11px] text-emerald-700 italic">Performed: {c.treatment_performed}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prescriptions Column */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-black text-slate-800 text-base">Dental Prescriptions</h4>
                </div>
                <Link to="/prescriptions" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
                  View Prescriptions
                </Link>
              </div>

              {prescriptions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-bold text-slate-600">No prescriptions issued</p>
                  <p className="text-[11px]">Prescriptions issued by your dentist will be saved here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {prescriptions.slice(0, 3).map(p => (
                    <div key={p.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Issued by {p.dentist_name}</span>
                        <span className="text-slate-400 text-[10px]">{p.prescription_date}</span>
                      </div>
                      <p className="text-slate-600 font-medium text-[11px]">
                        Medications: {p.medications.map(m => m.medicine_name).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
