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

export interface UserProfile {
  email: string;
  role: 'Patient' | 'Doctor' | 'Dentist' | 'Admin';
  subscribed: boolean;
  newsletter?: boolean;
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
  signupWithEmail: (email: string, pass: string, name: string, role: 'Patient' | 'Doctor' | 'Dentist' | 'Admin') => Promise<void>;
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
      return { ...parsed, email, role };
    } catch (e) {
      console.warn("Failed to parse stored profile for", email, e);
    }
  }

  if (role === 'Doctor' || role === 'Dentist') {
    return {
      email,
      role: 'Dentist',
      name: 'Dr. Raihan (BDS, MDS)',
      subscribed: true,
      phone: '+1 (555) 234-5678',
      specialty: 'Chief Dental Surgeon',
      subSpecialty: 'Endodontics & Restorative Dentistry',
      licenseNumber: 'RDC-84920-DEN',
      education: 'BDS, MDS (Oral & Maxillofacial Surgery)',
      experience: 12,
      location: 'Raihan Dental Clinic, Suite 101',
      hospitalAffiliation: 'Raihan Dental Health Center',
      consultationFee: 50,
      workingHours: '09:00 AM - 05:00 PM, Mon-Sat',
      bio: 'Chief Dental Surgeon with over 12 years of specialized practice in restorative dentistry, root canals, cosmetic smile enhancements, and oral health.',
      isOnline: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } else if (role === 'Patient') {
    return {
      email,
      role: 'Patient',
      name: 'John Doe',
      subscribed: true,
      age: 29,
      gender: 'Male',
      dob: '1995-04-12',
      bloodGroup: 'O+',
      height: '178 cm',
      weight: '72 kg',
      phone: '+1 (555) 876-5432',
      address: '742 Evergreen Terrace, Sector 4, Metro City',
      allergies: 'Penicillin (mild), Local Anesthetic (None)',
      medicalHistory: 'Appendectomy (2018). Occasional seasonal allergy symptoms.',
      dentalHistory: 'Routine dental scaling 6 months ago. Mild sensitivity on cold beverages.',
      currentMedications: 'None currently',
      chronicConditions: 'None reported',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '+1 (555) 987-6543',
      emergencyContactRelation: 'Spouse',
      insuranceProvider: 'DentalCare Premier',
      insurancePolicyNumber: 'DC-9948271-X',
      isOnline: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } else {
    return {
      email,
      role: 'Admin',
      name: 'System Administrator',
      subscribed: true,
      phone: '+1 (555) 000-1111',
      location: 'Raihan Telemedicine Operations Hub',
      bio: 'Platform & Clinical System Administrator with global operations access.',
      isOnline: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check for persisted demo session
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

  const loginAsDemo = async (role: 'Doctor' | 'Dentist' | 'Patient' | 'Admin') => {
    setLoading(true);
    const isDentistRole = role === 'Doctor' || role === 'Dentist';
    const email = role === 'Admin' 
      ? ADMIN_EMAIL 
      : (isDentistRole ? 'dr.raihan@telemed.com' : 'patient@telemed.com');

    // Retrieve stored profile for this email so previous edits are retained
    const demoProfile = getStoredProfile(email, isDentistRole ? 'Dentist' : role);

    const demoUser = {
      uid: `demo-${(isDentistRole ? 'dentist' : role).toLowerCase()}-001`,
      email,
      displayName: demoProfile.name || (isDentistRole ? 'Dr. Raihan (BDS, MDS)' : 'John Doe'),
    };

    localStorage.setItem('raihan_active_user', JSON.stringify(demoUser));
    localStorage.setItem('raihan_active_profile', JSON.stringify(demoProfile));
    localStorage.setItem(`raihan_profile_${email.toLowerCase().trim()}`, JSON.stringify(demoProfile));

    setUser(demoUser);
    setProfile(demoProfile);
    setLoading(false);
  };

  const login = async () => {
    if (!isFirebaseConfigured) {
      await loginAsDemo('Doctor');
      return;
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
    if (!isFirebaseConfigured) {
      const role = email === ADMIN_EMAIL ? 'Admin' : (email.toLowerCase().includes('doc') ? 'Doctor' : 'Patient');
      await loginAsDemo(role);
      return;
    }
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string, name: string, role: 'Patient' | 'Doctor' | 'Admin') => {
    if (!isFirebaseConfigured) {
      setLoading(true);
      const finalRole = email === ADMIN_EMAIL ? 'Admin' : role;
      const demoUser = {
        uid: `demo-${Date.now()}`,
        email,
        displayName: name,
      };
      const demoProfile: UserProfile = {
        email,
        role: finalRole,
        name,
        subscribed: email === ADMIN_EMAIL,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      localStorage.setItem('raihan_active_user', JSON.stringify(demoUser));
      localStorage.setItem('raihan_active_profile', JSON.stringify(demoProfile));
      setUser(demoUser);
      setProfile(demoProfile);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const signedUpUser = userCredential.user;

      await firebaseUpdateProfile(signedUpUser, {
        displayName: name
      });

      const finalRole = email === ADMIN_EMAIL ? 'Admin' : role;
      const userDocRef = doc(db, 'users', signedUpUser.uid);
      
      const newProfile = {
        email,
        role: finalRole,
        name,
        subscribed: email === ADMIN_EMAIL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(userDocRef, newProfile);

      setProfile({
        email,
        role: finalRole as any,
        name,
        subscribed: email === ADMIN_EMAIL,
        createdAt: new Date()
      });
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
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
