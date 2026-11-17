import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
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

interface UserProfile {
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
  login: () => Promise<void>;
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
    // Safety net: force loading off if it hangs (e.g. offline or restricted network)
    const safetyTimeout = setTimeout(() => {
      console.warn("Auth initialization timed out. Forcing loading off.");
      setLoading(false);
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(safetyTimeout);
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProfile(currentUser.uid, currentUser);
      } else {
        setProfile(null);
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
        await setDoc(userDocRef, newProfile);
        setProfile({
          ...newProfile,
          createdAt: new Date(),
          updatedAt: new Date()
        } as UserProfile);
      }
    } catch (err) {
      console.error('Profile fetch exception:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
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
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string, name: string, role: 'Patient' | 'Doctor' | 'Admin') => {
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
    await signOut(auth);
    setGoogleToken(null);
  };

  const updateRole = async (role: 'Patient' | 'Doctor' | 'Admin') => {
    if (!auth.currentUser) return;
    setLoading(true);
    
    try {
      const finalRole = auth.currentUser.email === ADMIN_EMAIL ? 'Admin' : role;
      const userDocRef = doc(db, 'users', auth.currentUser.uid);

      await setDoc(userDocRef, {
        email: auth.currentUser.email || '',
        role: finalRole,
        name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || '',
        subscribed: auth.currentUser.email === ADMIN_EMAIL,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setProfile((prev) => prev ? {
        ...prev,
        role: finalRole as any,
        updatedAt: new Date()
      } : {
        email: auth.currentUser?.email || '',
        role: finalRole as any,
        subscribed: auth.currentUser?.email === ADMIN_EMAIL,
        name: auth.currentUser?.displayName || '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Role update failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithEmail, signupWithEmail, logout, updateRole, googleToken, connectGoogleCalendar }}>
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
