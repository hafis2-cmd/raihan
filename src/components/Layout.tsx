import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Stethoscope, 
  UserCircle, 
  Calendar, 
  Video, 
  FileText, 
  CreditCard, 
  Store, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Activity, 
  Users, 
  ShieldCheck, 
  MessageSquare, 
  History, 
  Sun, 
  Moon,
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getLocalNotifications, markAllNotificationsRead, SystemNotification } from '../services/appointmentService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getNavItems = (role: string, subscribed: boolean) => {
  const isDentistRole = role === 'Doctor' || role === 'Dentist';
  const items = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: UserCircle, label: isDentistRole ? 'Dentist Profile' : 'Patient Profile', path: '/profile' },
    { icon: Stethoscope, label: 'Dental Consultations', path: '/consultations' },
    { icon: Calendar, label: 'Appointments', path: '/appointments' },
    { icon: Users, label: 'My Patients', path: '/patients', dentistOnly: true },
    { icon: FileText, label: 'Prescriptions', path: '/prescriptions' },
    { icon: CreditCard, label: 'Payments', path: '/payments' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
  ];

  if (isDentistRole || role === 'Admin') {
    return items;
  }
  
  return items.filter(item => !(item as any).dentistOnly);
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(() => window.innerWidth >= 768);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navItems = getNavItems(profile?.role || 'Patient', profile?.subscribed || false);

  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Sync notifications
  const loadNotifications = () => {
    if (profile?.email) {
      const list = getLocalNotifications(profile.email);
      setNotifications(list);
    }
  };

  useEffect(() => {
    loadNotifications();
    const handleUpdate = () => loadNotifications();
    window.addEventListener('raihan_notification_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    const interval = setInterval(loadNotifications, 4000);
    return () => {
      window.removeEventListener('raihan_notification_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(interval);
    };
  }, [profile?.email]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    if (profile?.email) {
      markAllNotificationsRead(profile.email);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const handleNotificationClick = (n: SystemNotification) => {
    setShowNotifications(false);
    navigate('/appointments');
  };

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Collapse sidebar when path changes on mobile
  React.useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Mobile Drawer Overlay Back-drop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col z-50",
          "fixed inset-y-0 left-0 md:relative md:flex",
          isSidebarOpen 
            ? "translate-x-0 w-64" 
            : "-translate-x-full md:translate-x-0 md:w-20"
        )}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 dark:bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-100 dark:shadow-none">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            {isSidebarOpen && <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-slate-100">Raihan Dental Clinic</span>}
          </div>
          {/* Close button inside sidebar on mobile only */}
          {isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isComingSoon = 'comingSoon' in item && item.comingSoon;

            if (isComingSoon) {
              return (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl opacity-60 cursor-not-allowed group"
                  )}
                  title="Coming Soon"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    {isSidebarOpen && <span className="text-slate-500 dark:text-slate-400">{item.label}</span>}
                  </div>
                  {isSidebarOpen && (
                    <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                      Soon
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                  isActive 
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 font-semibold" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform duration-250 group-hover:scale-105", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-650 dark:group-hover:text-slate-300")} />
                {isSidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden md:flex w-full items-center gap-3 px-3 py-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all"
          >
            {isSidebarOpen ? <X className="w-5 h-5 shrink-0" /> : <Menu className="w-5 h-5 shrink-0" />}
            {isSidebarOpen && <span>Collapse Menu</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 shrink-0 transition-colors duration-200 shadow-sm z-10 w-full">
          <div className="flex items-center gap-3.5">
            {/* Hamburger helper toggler for mobile & collapsed states */}
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 rounded-xl border border-slate-200 dark:border-slate-700/85 transition-all shadow-xs"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
              {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Notification Bell with Unread Badge */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-xs cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center animate-pulse shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-fadeIn">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Notifications</h4>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 font-medium">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={cn(
                            "p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-left space-y-1",
                            !n.isRead ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn(
                              "text-xs font-bold",
                              n.type === 'appointment_accepted' ? "text-emerald-600" :
                              n.type === 'appointment_rejected' ? "text-rose-600" :
                              n.type === 'appointment_request' ? "text-amber-600" :
                              "text-slate-700 dark:text-slate-200"
                            )}>
                              {n.title}
                            </span>
                            <span className="text-[9px] text-slate-400 shrink-0">
                              {new Date(n.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-center">
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        navigate('/appointments');
                      }}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-1 w-full cursor-pointer"
                    >
                      <span>View All Appointments</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Elegant Global Dark/Light Theme Switching Pin with tooltip */}
            <button
              onClick={toggleTheme}
              className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-105 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-705 rounded-xl transition-all shadow-xs active:scale-95"
              title={theme === 'light' ? 'Switch to Dark Mode for Nighttime Navigation' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-indigo-600" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500 animate-pulse" />
              )}
            </button>

            {/* User Account Info */}
            <div className="text-right hidden sm:block">
              <div className="flex items-center gap-2 justify-end">
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{(profile?.email || 'User').split('@')[0]}</p>
                {profile?.subscribed && profile?.role !== 'Admin' && (
                  <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-black rounded uppercase tracking-tighter">
                    PRO
                  </span>
                )}
                {profile?.role === 'Admin' && (
                  <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[8px] font-black rounded uppercase tracking-tighter">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {profile?.role === 'Doctor' || profile?.role === 'Dentist' ? 'Dentist' : (profile?.role || 'Patient')}
              </p>
            </div>
            
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-850 border-2 border-white dark:border-slate-850 shadow-xs overflow-hidden flex items-center justify-center text-slate-500 dark:text-slate-400 font-extrabold text-sm shrink-0">
              {(profile?.name || profile?.email || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        
        {/* Dynamic Canvas Container with responsive padding */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-8 bg-slate-50/50 dark:bg-slate-950 transition-colors duration-200">
          {children}
        </div>
      </main>
    </div>
  );
}
