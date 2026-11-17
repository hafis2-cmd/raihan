import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, isFirebaseConfigured } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { ADMIN_EMAIL } from '../constants';

export interface RegisteredUser {
  id: string;
  email: string;
  passwordHash: string;
  role: 'Patient' | 'Doctor' | 'Dentist' | 'Admin';
  name: string;
  phone?: string;
  qualification?: string;
  licenseNumber?: string;
  specialty?: string;
  subSpecialty?: string;
  location?: string;
  hospitalAffiliation?: string;
  consultationFee?: number | string;
  workingHours?: string;
  bio?: string;
  experience?: number;
  image?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  address?: string;
  dentalHistory?: string;
  allergies?: string;
  verified?: boolean;
  createdAt: string;
}

const REGISTERED_USERS_KEY = 'raihan_registered_users';

export function getRegisteredUsers(): RegisteredUser[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getRegisteredDentists(): RegisteredUser[] {
  return getRegisteredUsers().filter(u => u.role === 'Dentist' || u.role === 'Doctor');
}

export function getRegisteredPatients(): RegisteredUser[] {
  return getRegisteredUsers().filter(u => u.role === 'Patient');
}

export function purgeLegacyTestData() {
  try {
    // 1. Purge legacy test sessions
    const activeUser = localStorage.getItem('raihan_active_user');
    if (activeUser) {
      try {
        const u = JSON.parse(activeUser);
        if (
          u.email === 'dr.raihan@telemed.com' ||
          u.email === 'patient@telemed.com' ||
          u.email === 'dr.sarah@telemed.com' ||
          (u.uid && String(u.uid).startsWith('demo-'))
        ) {
          localStorage.removeItem('raihan_active_user');
          localStorage.removeItem('raihan_active_profile');
        }
      } catch {}
    }

    // 2. Remove legacy profile keys for test users
    localStorage.removeItem('raihan_profile_dr.raihan@telemed.com');
    localStorage.removeItem('raihan_profile_patient@telemed.com');
    localStorage.removeItem('raihan_profile_dr.sarah@telemed.com');
    localStorage.removeItem('raihan_profile_dr.michael@telemed.com');
    localStorage.removeItem('raihan_profile_dr.emily@telemed.com');

    // 3. Purge seed slots
    const slots = localStorage.getItem('raihan_db_slots');
    if (slots) {
      try {
        const parsed = JSON.parse(slots);
        const filtered = parsed.filter((s: any) => 
          !s.id?.startsWith('seed-') && 
          s.doctor_email !== 'dr.raihan@telemed.com'
        );
        localStorage.setItem('raihan_db_slots', JSON.stringify(filtered));
      } catch {}
    }

    // 4. Purge seed appointments
    const appts = localStorage.getItem('raihan_db_appointments');
    if (appts) {
      try {
        const parsed = JSON.parse(appts);
        const filtered = parsed.filter((a: any) => 
          a.patient_email !== 'patient@telemed.com' &&
          a.doctor_email !== 'dr.raihan@telemed.com'
        );
        localStorage.setItem('raihan_db_appointments', JSON.stringify(filtered));
      } catch {}
    }

    // 5. Purge seed consultations
    const consults = localStorage.getItem('raihan_dental_consultations');
    if (consults) {
      try {
        const parsed = JSON.parse(consults);
        const filtered = parsed.filter((c: any) => 
          !c.id?.startsWith('seed-') && 
          c.patient_email !== 'patient@telemed.com'
        );
        localStorage.setItem('raihan_dental_consultations', JSON.stringify(filtered));
      } catch {}
    }

    // 6. Purge seed prescriptions
    const rxs = localStorage.getItem('raihan_dental_prescriptions');
    if (rxs) {
      try {
        const parsed = JSON.parse(rxs);
        const filtered = parsed.filter((r: any) => 
          !r.id?.startsWith('seed-') && 
          r.patient_email !== 'patient@telemed.com'
        );
        localStorage.setItem('raihan_dental_prescriptions', JSON.stringify(filtered));
      } catch {}
    }

    // 7. Purge seed payments
    const payments = localStorage.getItem('raihan_db_payments');
    if (payments) {
      try {
        const parsed = JSON.parse(payments);
        const filtered = parsed.filter((p: any) => 
          !p.id?.startsWith('seed-') && 
          p.patientEmail !== 'patient@telemed.com'
        );
        localStorage.setItem('raihan_db_payments', JSON.stringify(filtered));
      } catch {}
    }

    // 8. Purge seed notifications
    const notifs = localStorage.getItem('raihan_db_notifications');
    if (notifs) {
      try {
        const parsed = JSON.parse(notifs);
        const filtered = parsed.filter((n: any) => 
          n.recipientEmail !== 'patient@telemed.com' && 
          n.recipientEmail !== 'dr.raihan@telemed.com'
        );
        localStorage.setItem('raihan_db_notifications', JSON.stringify(filtered));
      } catch {}
    }
  } catch (e) {
    console.warn("Purge test data notice:", e);
  }
}

export interface UserProfile {
  email: string;
  role: 'Patient' | 'Doctor' | 'Dentist' | 'Admin';
  subscribed: boolean;
  newsletter?: boolean;
  verified?: boolean;
  createdAt: any;
  updatedAt?: any;
  name?: string;
  phone?: string;
  image?: string;
  photoURL?: string;
  isOnline?: boolean;
  lastSeen?: any;
  typingTo?: string | null;

  // Patient-specific accurate fields
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  bloodGroup?: string;
  height?: string;
  weight?: string;
  address?: string;
  allergies?: string;
  medicalHistory?: string;
  dentalHistory?: string;
  currentMedications?: string;
  chronicConditions?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;

  // Dentist-specific accurate fields
  specialty?: string;
  subSpecialty?: string;
  licenseNumber?: string;
  education?: string;
  experience?: number;
  location?: string;
  hospitalAffiliation?: string;
  consultationFee?: number | string;
  workingHours?: string;
  bio?: string;
}

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  login: () => Promise<void>;
  loginAsDemo: (role: 'Doctor' | 'Dentist' | 'Patient' | 'Admin') => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (
    email: string, 
    pass: string, 
    name: string, 
    role: 'Patient' | 'Doctor' | 'Dentist' | 'Admin',
    extraData?: Partial<RegisteredUser>
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateRole: (role: 'Patient' | 'Doctor' | 'Dentist' | 'Admin') => Promise<void>;
  updateProfile: (updatedData: Partial<UserProfile>) => Promise<void>;
  googleToken: string | null;
  connectGoogleCalendar: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredProfile = (email: string, role: 'Doctor' | 'Dentist' | 'Patient' | 'Admin'): UserProfile => {
  const emailKey = `raihan_profile_${email.toLowerCase().trim()}`;
  const stored = localStorage.getItem(emailKey);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return { ...parsed, email, role: (role === 'Doctor' ? 'Dentist' : role) as any };
    } catch (e) {
      console.warn("Failed to parse stored profile for", email, e);
    }
  }

  // Production blank profile (no dummy names or fake credentials)
  return {
    email,
    role: (role === 'Doctor' ? 'Dentist' : role) as any,
    name: '',
    subscribed: email === ADMIN_EMAIL,
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  useEffect(() => {
    // Purge any legacy demo or test data before restoring session
    purgeLegacyTestData();

    // 1. Check for persisted session
    const savedUserJson = localStorage.getItem('raihan_active_user');
    const savedProfileJson = localStorage.getItem('raihan_active_profile');
    if (savedUserJson && savedProfileJson) {
      try {
        const parsedUser = JSON.parse(savedUserJson);
        const parsedProfile = JSON.parse(savedProfileJson);
        
        // If an updated profile exists specifically under this email, prioritize it
        if (parsedUser.email) {
          const emailKey = `raihan_profile_${parsedUser.email.toLowerCase().trim()}`;
          const emailSaved = localStorage.getItem(emailKey);
          if (emailSaved) {
            const parsedEmailProfile = JSON.parse(emailSaved);
            setUser(parsedUser);
            setProfile(parsedEmailProfile);
            setLoading(false);
            return;
          }
        }

        setUser(parsedUser);
        setProfile(parsedProfile);
        setLoading(false);
        return;
      } catch (err) {
        console.warn("Failed to restore saved local session:", err);
      }
    }

    // Safety net: force loading off if auth takes more than 1.5 seconds
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 1500);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(safetyTimeout);
      
      if (currentUser) {
        setUser(currentUser);
        await fetchProfile(currentUser.uid, currentUser);
      } else {
        if (!localStorage.getItem('raihan_active_user')) {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  const fetchProfile = async (uid: string, currentUser: any) => {
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfile({
          email: data.email,
          role: data.role,
          subscribed: data.subscribed,
          name: data.name,
          age: data.age,
          gender: data.gender,
          dob: data.dob,
          bloodGroup: data.bloodGroup,
          height: data.height,
          weight: data.weight,
          phone: data.phone,
          address: data.address,
          allergies: data.allergies,
          medicalHistory: data.medicalHistory,
          currentMedications: data.currentMedications,
          chronicConditions: data.chronicConditions,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          emergencyContactRelation: data.emergencyContactRelation,
          insuranceProvider: data.insuranceProvider,
          insurancePolicyNumber: data.insurancePolicyNumber,
          specialty: data.specialty,
          subSpecialty: data.subSpecialty,
          licenseNumber: data.licenseNumber,
          education: data.education,
          experience: data.experience,
          location: data.location,
          hospitalAffiliation: data.hospitalAffiliation,
          consultationFee: data.consultationFee,
          workingHours: data.workingHours,
          bio: data.bio,
          photoURL: data.photoURL || data.image,
          image: data.image || data.photoURL,
          isOnline: data.isOnline,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined
        } as UserProfile);
      } else {
        const finalRole = currentUser.email === ADMIN_EMAIL ? 'Admin' : 'Patient';
        const defaultProfile = getStoredProfile(currentUser.email || '', finalRole);
        const newProfile = {
          ...defaultProfile,
          email: currentUser.email || '',
          role: finalRole,
          subscribed: currentUser.email === ADMIN_EMAIL,
          name: currentUser.displayName || currentUser.email?.split('@')[0] || defaultProfile.name,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        try {
          await setDoc(userDocRef, newProfile);
        } catch (writeErr) {
          console.warn("Could not write profile to remote Firestore (using local):", writeErr);
        }
        setProfile({
          ...newProfile,
          createdAt: new Date(),
          updatedAt: new Date()
        } as UserProfile);
      }
    } catch (err) {
      console.warn('Profile fetch handled:', err);
      // Fallback local profile for current user
      const finalRole = currentUser.email === ADMIN_EMAIL ? 'Admin' : 'Patient';
      const fallback = getStoredProfile(currentUser.email || 'user@raihan.med', finalRole);
      setProfile(fallback);
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = async (_role: 'Doctor' | 'Dentist' | 'Patient' | 'Admin') => {
    throw new Error("Demo accounts have been permanently removed. Please register or sign in with real credentials.");
  };

  const login = async () => {
    if (!isFirebaseConfigured) {
      throw new Error("Google sign in requires Firebase configuration. Please use Email & Password.");
    }
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (token) {
      setGoogleToken(token);
    }
  };

  const connectGoogleCalendar = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (token) {
      setGoogleToken(token);
      return token;
    }
    return null;
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail || !pass) {
      throw new Error("Please enter both email and password.");
    }

    setLoading(true);
    try {
      if (isFirebaseConfigured) {
        try {
          const cred = await signInWithEmailAndPassword(auth, trimmedEmail, pass);
          if (cred.user) {
            await fetchProfile(cred.user.uid, cred.user);
            return;
          }
        } catch (firebaseErr: any) {
          if (firebaseErr?.code === 'auth/wrong-password') {
            throw new Error("Invalid password. Please check your credentials.");
          }
        }
      }

      // Check registered users in local database
      const users = getRegisteredUsers();
      const existing = users.find(u => u.email.toLowerCase() === trimmedEmail);
      if (!existing) {
        throw new Error("No registered account found with this email. Please register first.");
      }

      const expectedHash = btoa(encodeURIComponent(`salt_raihan_${pass}`));
      if (existing.passwordHash !== expectedHash) {
        throw new Error("Incorrect password. Please verify your credentials and try again.");
      }

      const storedProf = getStoredProfile(trimmedEmail, existing.role);
      const authSessionUser = {
        uid: existing.id,
        email: existing.email,
        displayName: existing.name
      };

      localStorage.setItem('raihan_active_user', JSON.stringify(authSessionUser));
      localStorage.setItem('raihan_active_profile', JSON.stringify(storedProf));

      setUser(authSessionUser);
      setProfile(storedProf);
    } finally {
      setLoading(false);
    }
  };

  const signupWithEmail = async (
    email: string, 
    pass: string, 
    name: string, 
    role: 'Patient' | 'Doctor' | 'Dentist' | 'Admin',
    extraData?: Partial<RegisteredUser>
  ) => {
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail || !pass || !name) {
      throw new Error("Please fill in all required fields.");
    }
    if (pass.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    setLoading(true);
    try {
      const users = getRegisteredUsers();
      if (users.some(u => u.email.toLowerCase() === trimmedEmail)) {
        throw new Error("An account with this email address already exists. Please sign in.");
      }

      const finalRole = trimmedEmail === ADMIN_EMAIL ? 'Admin' : (role === 'Doctor' ? 'Dentist' : role);
      const isDentist = finalRole === 'Dentist';

      const passwordHash = btoa(encodeURIComponent(`salt_raihan_${pass}`));
      const newUser: RegisteredUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        email: trimmedEmail,
        passwordHash,
        role: finalRole as any,
        name,
        phone: extraData?.phone || '',
        verified: !isDentist, // Dentist verification requires administrative/clinical credential review
        qualification: extraData?.qualification,
        licenseNumber: extraData?.licenseNumber,
        specialty: extraData?.specialty || (isDentist ? 'General Dentistry' : undefined),
        subSpecialty: extraData?.subSpecialty,
        location: extraData?.location || (isDentist ? 'Raihan Dental Clinic' : undefined),
        hospitalAffiliation: extraData?.hospitalAffiliation || (isDentist ? 'Raihan Dental Clinic' : undefined),
        consultationFee: extraData?.consultationFee || (isDentist ? 50 : undefined),
        workingHours: extraData?.workingHours || (isDentist ? '09:00 AM - 05:00 PM, Mon-Sat' : undefined),
        dob: extraData?.dob,
        gender: extraData?.gender,
        dentalHistory: extraData?.dentalHistory,
        allergies: extraData?.allergies,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));

      const newProfile: UserProfile = {
        email: trimmedEmail,
        role: finalRole as any,
        name,
        phone: newUser.phone,
        subscribed: trimmedEmail === ADMIN_EMAIL,
        verified: newUser.verified,
        specialty: newUser.specialty,
        subSpecialty: newUser.subSpecialty,
        licenseNumber: newUser.licenseNumber,
        education: newUser.qualification,
        location: newUser.location,
        hospitalAffiliation: newUser.hospitalAffiliation,
        consultationFee: newUser.consultationFee,
        workingHours: newUser.workingHours,
        dob: newUser.dob,
        gender: newUser.gender,
        dentalHistory: newUser.dentalHistory,
        allergies: newUser.allergies,
        isOnline: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      localStorage.setItem(`raihan_profile_${trimmedEmail}`, JSON.stringify(newProfile));

      const authSessionUser = {
        uid: newUser.id,
        email: trimmedEmail,
        displayName: name
      };

      localStorage.setItem('raihan_active_user', JSON.stringify(authSessionUser));
      localStorage.setItem('raihan_active_profile', JSON.stringify(newProfile));

      if (isFirebaseConfigured) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
          await firebaseUpdateProfile(userCredential.user, { displayName: name });
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            ...newProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (firebaseErr) {
          console.warn("Firebase Auth sync skipped:", firebaseErr);
        }
      }

      setUser(authSessionUser);
      setProfile(newProfile);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('raihan_active_user');
    localStorage.removeItem('raihan_active_profile');
    try {
      await signOut(auth);
    } catch (e) {
      // Ignore in demo mode
    }
    setUser(null);
    setProfile(null);
    setGoogleToken(null);
  };

  const updateRole = async (role: 'Patient' | 'Doctor' | 'Dentist' | 'Admin') => {
    if (!user) return;
    setLoading(true);
    const finalRole = user.email === ADMIN_EMAIL ? 'Admin' : role;
    
    const updatedProfile: UserProfile = profile ? {
      ...profile,
      role: finalRole as any,
      updatedAt: new Date()
    } : {
      email: user.email || '',
      role: finalRole as any,
      subscribed: user.email === ADMIN_EMAIL,
      name: user.displayName || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    localStorage.setItem('raihan_active_profile', JSON.stringify(updatedProfile));
    setProfile(updatedProfile);

    if (isFirebaseConfigured && auth.currentUser) {
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userDocRef, {
          email: auth.currentUser.email || '',
          role: finalRole,
          name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || '',
          subscribed: auth.currentUser.email === ADMIN_EMAIL,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error("Role update failed:", error);
      }
    }

    setLoading(false);
  };

  const updateProfile = async (updatedData: Partial<UserProfile>) => {
    if (!profile && !user) return;
    setLoading(true);

    const email = profile?.email || user?.email || '';
    const merged: UserProfile = {
      ...(profile || {}),
      ...updatedData,
      email,
      role: (updatedData.role || profile?.role || 'Patient') as any,
      subscribed: profile?.subscribed ?? true,
      updatedAt: new Date()
    } as UserProfile;

    // Update in-memory state so all UI updates immediately
    setProfile(merged);

    // Save to active profile key
    localStorage.setItem('raihan_active_profile', JSON.stringify(merged));

    // Save to permanent per-email key so data retains permanently until next edited
    if (email) {
      const emailKey = `raihan_profile_${email.toLowerCase().trim()}`;
      localStorage.setItem(emailKey, JSON.stringify(merged));
    }

    // Update user object if name changed
    if (updatedData.name && user) {
      const updatedUser = { ...user, displayName: updatedData.name };
      setUser(updatedUser);
      localStorage.setItem('raihan_active_user', JSON.stringify(updatedUser));
    }

    // Write to Firestore if configured
    if (isFirebaseConfigured && auth.currentUser) {
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userDocRef, {
          ...updatedData,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error("Firestore update error:", err);
      }
    }

    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isFirebaseConfigured,
      login, 
      loginAsDemo,
      loginWithEmail, 
      signupWithEmail, 
      logout, 
      updateRole, 
      updateProfile,
      googleToken, 
      connectGoogleCalendar 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
