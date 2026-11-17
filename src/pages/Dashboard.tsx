import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Stethoscope, 
  FileText, 
  CreditCard, 
  CalendarPlus, 
  ChevronRight,
  CheckCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
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

  const isDentist = profile?.role === 'Doctor' || profile?.role === 'Dentist';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<DentalConsultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<DentalPrescription[]>([]);
  const [, setNotifications] = useState<SystemNotification[]>([]);
  const [todayStr] = useState(() => new Date().toISOString().split('T')[0]);

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

  const displayName = profile?.name || (isDentist ? 'Dr. Raihan' : 'Patient');

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* Refined Clinic Hero Card */}
      <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-emerald-400 text-xs font-medium border border-slate-700/60">
            <span>Raihan Dental Clinic</span>
            <span>•</span>
            <span>{isDentist ? 'Clinical Dashboard' : 'Patient Portal'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome back, {displayName}
          </h1>
          
          <p className="text-slate-300 text-sm leading-relaxed">
            {isDentist 
              ? 'Manage incoming patient consultation requests, examine clinical dental charts, configure chair hours, and track treatment billing.'
              : 'Request on-site dental consultations with Dr. Raihan, review past clinical treatments, and view active prescriptions.'}
          </p>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {isDentist ? (
              <>
                <Link 
                  to="/appointments" 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs transition-colors flex items-center gap-2 shadow-xs"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Pending Requests ({pendingRequests.length})</span>
                </Link>
                <Link 
                  to="/consultations" 
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl font-medium text-xs transition-colors flex items-center gap-2 border border-slate-700"
                >
                  <Stethoscope className="w-4 h-4 text-emerald-400" />
                  <span>Record Consultation</span>
                </Link>
              </>
            ) : (
              <>
                <Link 
                  to="/appointments" 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs transition-colors flex items-center gap-2 shadow-xs"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Request Dental Visit</span>
                </Link>
                <Link 
                  to="/consultations" 
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl font-medium text-xs transition-colors flex items-center gap-2 border border-slate-700"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>My Dental Records</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* DENTIST DASHBOARD VIEW                                     */}
      {/* ========================================================== */}
      {isDentist ? (
        <div className="space-y-6">
          
          {/* Key Metrics Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/60">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Today's Visits</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{todayAppointments.length}</h3>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Confirmed today</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800/60">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Requests</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pendingRequests.length}</h3>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Awaiting decision</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/60">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Upcoming Visits</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{upcomingAppointments.length}</h3>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Scheduled</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Patients</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalRegisteredPatients}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Clinical records</p>
              </div>
            </div>

          </div>

          {/* Quick Access Menu Cards */}
          <div className="space-y-2.5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Clinic Navigation</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Availability', icon: Clock, path: '/appointments', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
                { label: 'Requests', icon: CalendarPlus, path: '/appointments', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40', badge: pendingRequests.length },
                { label: 'My Patients', icon: Users, path: '/patients', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
                { label: 'Consultations', icon: Stethoscope, path: '/consultations', color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40' },
                { label: 'Prescriptions', icon: FileText, path: '/prescriptions', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
                { label: 'Payments', icon: CreditCard, path: '/payments', color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
              ].map((item, idx) => (
                <Link
                  key={idx}
                  to={item.path}
                  className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col items-center text-center gap-2 group cursor-pointer relative shadow-xs"
                >
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                      {item.badge}
                    </span>
                  ) : null}
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", item.color)}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Two Columns: Pending Requests & Recent Consultations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Column 1: Incoming Patient Requests */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Pending Appointment Requests</h3>
                </div>
                <Link to="/appointments" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  View All ({pendingRequests.length})
                </Link>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                  <CheckCheck className="w-7 h-7 text-emerald-500 mx-auto opacity-70" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">All caught up</p>
                  <p className="text-slate-400 dark:text-slate-500">No pending consultation requests at this time.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingRequests.slice(0, 3).map(app => (
                    <div key={app.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">{app.patient_name}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{app.appointment_date} at {app.appointment_time}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{app.reason}"</p>
                      </div>
                      <Link
                        to="/appointments"
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg font-medium text-xs shrink-0 transition-colors"
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Recent Dental Consultations */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Recent Consultations</h3>
                </div>
                <Link to="/consultations" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  All Records ({consultations.length})
                </Link>
              </div>

              {consultations.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                  <FileText className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No consultations recorded yet</p>
                  <p className="text-slate-400 dark:text-slate-500">Documented patient treatments will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {consultations.slice(0, 3).map(c => (
                    <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100">{c.patient_name}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60">
                            {c.treatment_category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{c.consultation_date} • {c.diagnosis}</p>
                      </div>
                      <Link
                        to="/consultations"
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-colors"
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
        <div className="space-y-6">
          
          {/* Next Confirmed Dental Appointment Banner */}
          {nextConfirmedAppointment && (
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/60">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                    Next Confirmed Consultation
                  </span>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {nextConfirmedAppointment.doctor_name.startsWith('Dr.') ? nextConfirmedAppointment.doctor_name : `Dr. ${nextConfirmedAppointment.doctor_name}`} (Dental Surgeon)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {nextConfirmedAppointment.appointment_date} at {nextConfirmedAppointment.appointment_time} • Raihan Dental Clinic (On-Site)
                  </p>
                </div>
              </div>

              <Link
                to="/appointments"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors shadow-xs shrink-0 self-start md:self-auto"
              >
                View Appointment
              </Link>
            </div>
          )}

          {/* Patient Overview Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/60">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Upcoming Visits</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{patientUpcoming.length}</h3>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Confirmed</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800/60">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Requests</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{patientPending.length}</h3>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Awaiting dentist</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800/60">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Prescriptions</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{patientRxCount}</h3>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Dental records</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl flex items-center justify-center shrink-0 border border-teal-100 dark:border-teal-800/60">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Dental Records</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{patientRecordCount}</h3>
                <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">Completed visits</p>
              </div>
            </div>
          </div>

          {/* Patient Quick Actions */}
          <div className="space-y-2.5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Patient Services</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Book Appointment', icon: CalendarPlus, path: '/appointments', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
                { label: 'Dental Records', icon: Stethoscope, path: '/consultations', color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40', badge: consultations.length },
                { label: 'Prescriptions', icon: FileText, path: '/prescriptions', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40', badge: prescriptions.length },
                { label: 'Invoices & Billing', icon: CreditCard, path: '/payments', color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
              ].map((item, idx) => (
                <Link
                  key={idx}
                  to={item.path}
                  className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col items-center text-center gap-2 group cursor-pointer relative shadow-xs"
                >
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-bold">
                      {item.badge}
                    </span>
                  ) : null}
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", item.color)}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Patient Two Columns: Recent Dental Treatments & Prescriptions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Dental History Column */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Recent Treatments</h3>
                </div>
                <Link to="/consultations" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  View All
                </Link>
              </div>

              {consultations.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No consultation records</p>
                  <p className="text-slate-400 dark:text-slate-500">When your dentist documents a completed visit, details appear here.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {consultations.slice(0, 3).map(c => (
                    <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{c.treatment_category}</span>
                        <span className="text-slate-400 text-[11px]">{c.consultation_date}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">Diagnosis: <strong className="text-slate-800 dark:text-slate-200">{c.diagnosis}</strong></p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Treatment: {c.treatment_performed}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prescriptions Column */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Dental Prescriptions</h3>
                </div>
                <Link to="/prescriptions" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  View Prescriptions
                </Link>
              </div>

              {prescriptions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No prescriptions issued</p>
                  <p className="text-slate-400 dark:text-slate-500">Prescriptions issued by your dentist will be saved here.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {prescriptions.slice(0, 3).map(p => (
                    <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">Issued by {p.dentist_name}</span>
                        <span className="text-slate-400 text-[11px]">{p.prescription_date}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-xs">
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
