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
  role: 'Patient' | 'Doctor' | 'Admin';
  subscribed: boolean;
  newsletter?: boolean;
  createdAt: any;
  updatedAt?: any;
  name?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  bloodGroup?: string;
  allergies?: string;
  medicalHistory?: string;
  specialty?: string;
  bio?: string;
  location?: string;
  experience?: number;
  photoURL?: string;
  image?: string;
  isOnline?: boolean;
  lastSeen?: any;
  typingTo?: string | null;
}

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  login: () => Promise<void>;
  loginAsDemo: (role: 'Doctor' | 'Patient' | 'Admin') => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string, role: 'Patient' | 'Doctor' | 'Admin') => Promise<void>;
  logout: () => Promise<void>;
  updateRole: (role: 'Patient' | 'Doctor' | 'Admin') => Promise<void>;
  googleToken: string | null;
  connectGoogleCalendar: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
          bloodGroup: data.bloodGroup,
          allergies: data.allergies,
          medicalHistory: data.medicalHistory,
          specialty: data.specialty,
          bio: data.bio,
          location: data.location,
          experience: data.experience,
          photoURL: data.photoURL || data.image,
          image: data.image || data.photoURL,
          isOnline: data.isOnline,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined
        } as UserProfile);
      } else {
        const finalRole = currentUser.email === ADMIN_EMAIL ? 'Admin' : 'Patient';
        const newProfile = {
          email: currentUser.email || '',
          role: finalRole,
          subscribed: currentUser.email === ADMIN_EMAIL,
          name: currentUser.displayName || currentUser.email?.split('@')[0] || '',
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
      setProfile({
        email: currentUser.email || 'user@raihan.med',
        role: finalRole,
        subscribed: true,
        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Raihan User',
        createdAt: new Date()
      } as UserProfile);
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = async (role: 'Doctor' | 'Patient' | 'Admin') => {
    setLoading(true);
    const email = role === 'Admin' 
      ? ADMIN_EMAIL 
      : (role === 'Doctor' ? 'dr.raihan@telemed.com' : 'patient@telemed.com');
    const name = role === 'Admin' 
      ? 'System Administrator' 
      : (role === 'Doctor' ? 'Dr. Raihan (MD)' : 'John Doe');

    const demoUser = {
      uid: `demo-${role.toLowerCase()}-001`,
      email,
      displayName: name,
    };

    const demoProfile: UserProfile = {
      email,
      role,
      name,
      subscribed: true,
      specialty: role === 'Doctor' ? 'General Medicine & Tele-Consultation' : undefined,
      experience: role === 'Doctor' ? 12 : undefined,
      bio: role === 'Doctor' ? 'Chief Medical Officer at Raihan Telemedicine Clinic.' : undefined,
      location: 'Raihan Central Hospital',
      isOnline: true,
      age: role === 'Patient' ? 29 : 42,
      gender: 'Male',
      bloodGroup: 'O+',
      allergies: 'None',
      medicalHistory: 'Regular clinical follow-ups. Good health profile.',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    localStorage.setItem('raihan_active_user', JSON.stringify(demoUser));
    localStorage.setItem('raihan_active_profile', JSON.stringify(demoProfile));
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

  const updateRole = async (role: 'Patient' | 'Doctor' | 'Admin') => {
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
