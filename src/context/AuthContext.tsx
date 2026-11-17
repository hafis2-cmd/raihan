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
import { ADMIN_EMAIL, ADMIN_PROVISION_KEY } from '../constants';

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
  photoURL?: string;
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
  provisionDentistAccount: (
    dentistData: {
      name: string;
      email: string;
      password: string;
      qualification: string;
      licenseNumber: string;
      specialty?: string;
      subSpecialty?: string;
      phone?: string;
      hospitalAffiliation?: string;
      consultationFee?: number | string;
      workingHours?: string;
      experience?: number;
      bio?: string;
    },
    adminKey?: string
  ) => Promise<RegisteredUser>;
  logout: () => Promise<void>;
  updateRole: (role: 'Patient' | 'Doctor' | 'Dentist' | 'Admin') => Promise<void>;
  updateProfile: (updatedData: Partial<UserProfile>) => Promise<void>;
  uploadProfilePhoto: (base64Image: string) => Promise<string>;
  removeProfilePhoto: () => Promise<void>;
  googleToken: string | null;
  connectGoogleCalendar: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredProfile = (email: string, role: 'Doctor' | 'Dentist' | 'Patient' | 'Admin'): UserProfile => {
  const trimmed = email.toLowerCase().trim();
  const emailKey = `raihan_profile_${trimmed}`;
  const stored = localStorage.getItem(emailKey);

  // Look up registered user to always resolve registered full name and photo
  const registered = getRegisteredUsers();
  const existing = registered.find(u => u.email.toLowerCase() === trimmed);
  const registeredName = existing?.name?.trim() || '';
  const registeredPhoto = existing?.image || '';

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const finalName = (parsed.name && parsed.name.trim()) ? parsed.name.trim() : registeredName;
      const finalPhoto = parsed.photoURL || parsed.image || registeredPhoto || '';
      return { 
        ...parsed, 
        email: trimmed, 
        role: (role === 'Doctor' ? 'Dentist' : role) as any,
        name: finalName,
        photoURL: finalPhoto,
        image: finalPhoto
      };
    } catch (e) {
      console.warn("Failed to parse stored profile for", email, e);
    }
  }

  // Production blank profile with registered database name and photo
  return {
    email: trimmed,
    role: (role === 'Doctor' ? 'Dentist' : role) as any,
    name: registeredName,
    photoURL: registeredPhoto,
    image: registeredPhoto,
    subscribed: trimmed === ADMIN_EMAIL,
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

    // Sync provisioned dentists from backend
    fetch('/api/dentist/list')
      .then(r => r.json())
      .then(data => {
        if (data.dentists && Array.isArray(data.dentists)) {
          const current = getRegisteredUsers();
          let changed = false;
          for (const d of data.dentists) {
            const idx = current.findIndex(u => u.email.toLowerCase() === d.email.toLowerCase());
            if (idx === -1) {
              current.push(d);
              changed = true;
            } else {
              current[idx] = { ...current[idx], ...d };
              changed = true;
            }
          }
          if (changed) {
            localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(current));
            window.dispatchEvent(new Event('raihan_users_updated'));
          }
        }
      })
      .catch(() => {});

    // 1. Check for persisted session
    const savedUserJson = localStorage.getItem('raihan_active_user');
    const savedProfileJson = localStorage.getItem('raihan_active_profile');
    if (savedUserJson && savedProfileJson) {
      try {
        const parsedUser = JSON.parse(savedUserJson);
        let parsedProfile = JSON.parse(savedProfileJson);
        const userEmail = (parsedUser.email || parsedProfile.email || '').toLowerCase().trim();
        
        // If an updated profile exists specifically under this email, prioritize it
        if (userEmail) {
          const emailKey = `raihan_profile_${userEmail}`;
          const emailSaved = localStorage.getItem(emailKey);
          if (emailSaved) {
            parsedProfile = JSON.parse(emailSaved);
          }

          // Ensure profile.name is properly retrieved from registered database if missing
          if (!parsedProfile.name || !parsedProfile.name.trim()) {
            const registered = getRegisteredUsers();
            const existing = registered.find(u => u.email.toLowerCase() === userEmail);
            if (existing?.name?.trim()) {
              parsedProfile.name = existing.name.trim();
              localStorage.setItem(emailKey, JSON.stringify(parsedProfile));
              localStorage.setItem('raihan_active_profile', JSON.stringify(parsedProfile));
            }
          }

          // Fetch fresh profile from backend API to ensure real database name and photo are synchronized
          fetch('/api/auth/me', {
            headers: {
              ...(parsedUser.token ? { 'Authorization': `Bearer ${parsedUser.token}` } : {}),
              'x-user-email': userEmail
            }
          })
            .then(r => r.json())
            .then(data => {
              if (data.success && data.user) {
                const userPhoto = data.user.photoURL || data.user.image || parsedProfile.photoURL || '';
                const updatedProf = {
                  ...parsedProfile,
                  ...data.user,
                  name: data.user.name || parsedProfile.name,
                  photoURL: userPhoto,
                  image: userPhoto,
                  role: parsedProfile.role || data.user.role
                };
                if (data.user.name) parsedUser.displayName = data.user.name;
                parsedUser.photoURL = userPhoto;
                localStorage.setItem(emailKey, JSON.stringify(updatedProf));
                localStorage.setItem('raihan_active_profile', JSON.stringify(updatedProf));
                localStorage.setItem('raihan_active_user', JSON.stringify(parsedUser));
                setProfile(updatedProf);
                setUser(parsedUser);
              }
            })
            .catch(() => {});
        }

        if (parsedProfile.name) {
          parsedUser.displayName = parsedProfile.name;
        }
        if (parsedProfile.photoURL || parsedProfile.image) {
          parsedUser.photoURL = parsedProfile.photoURL || parsedProfile.image;
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
          name: currentUser.displayName || defaultProfile.name || (finalRole === 'Admin' ? 'Administrator' : 'Patient'),
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
      // 1. First attempt backend API login
      try {
        const resp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail, password: pass })
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.success && data.user) {
            const role = data.role || data.user.role || 'Patient';
            const storedProf = getStoredProfile(trimmedEmail, role);
            if (data.user.name) storedProf.name = data.user.name;
            if (data.user.phone) storedProf.phone = data.user.phone;
            if (data.user.specialty) storedProf.specialty = data.user.specialty;
            if (data.user.qualification) storedProf.education = data.user.qualification;
            if (data.user.licenseNumber) storedProf.licenseNumber = data.user.licenseNumber;
            if (data.user.image || data.user.photoURL) {
              const photo = data.user.photoURL || data.user.image;
              storedProf.photoURL = photo;
              storedProf.image = photo;
            }

            const authSessionUser = {
              uid: data.user.id,
              email: data.user.email,
              displayName: data.user.name,
              photoURL: storedProf.photoURL,
              token: data.token
            };

            localStorage.setItem(`raihan_profile_${trimmedEmail}`, JSON.stringify(storedProf));
            localStorage.setItem('raihan_active_user', JSON.stringify(authSessionUser));
            localStorage.setItem('raihan_active_profile', JSON.stringify(storedProf));

            // Sync user to registered users list
            const currentUsers = getRegisteredUsers();
            const uIdx = currentUsers.findIndex(u => u.email.toLowerCase() === trimmedEmail);
            if (uIdx === -1) {
              currentUsers.push({
                id: data.user.id,
                email: data.user.email,
                name: data.user.name,
                role: role,
                passwordHash: '',
                phone: data.user.phone,
                qualification: data.user.qualification,
                licenseNumber: data.user.licenseNumber,
                specialty: data.user.specialty,
                createdAt: new Date().toISOString()
              });
            } else {
              if (data.user.name) currentUsers[uIdx].name = data.user.name;
              if (data.user.phone) currentUsers[uIdx].phone = data.user.phone;
              if (role) currentUsers[uIdx].role = role;
            }
            localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(currentUsers));

            setUser(authSessionUser);
            setProfile(storedProf);
            return;
          }
        } else {
          const errData = await resp.json().catch(() => null);
          if (errData?.error && resp.status === 401) {
            throw new Error(errData.error);
          }
        }
      } catch (backendErr: any) {
        if (backendErr.message && backendErr.message.includes("password") || backendErr.message?.includes("credentials")) {
          throw backendErr;
        }
      }

      // 2. Firebase check if configured
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

      // 3. Fallback to registered users in local client store
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
      if (existing.name) {
        storedProf.name = existing.name;
      }
      const authSessionUser = {
        uid: existing.id,
        email: existing.email,
        displayName: existing.name
      };

      localStorage.setItem(`raihan_profile_${trimmedEmail}`, JSON.stringify(storedProf));
      localStorage.setItem('raihan_active_user', JSON.stringify(authSessionUser));
      localStorage.setItem('raihan_active_profile', JSON.stringify(storedProf));

      setUser(authSessionUser);
      setProfile(storedProf);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Public Patient-Only Registration
   * - Enforces PATIENT role strictly
   * - Rejects any attempt to register as a Dentist or Doctor
   */
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

    // CRITICAL SECURITY ENFORCEMENT: Reject public registration for Dentist
    if (role === 'Dentist' || role === 'Doctor' || (role as string).toLowerCase() !== 'patient') {
      throw new Error("Unauthorized: Public registration is only available for patients. Dentist accounts must be provisioned by authorized clinic administration.");
    }

    setLoading(true);
    try {
      const users = getRegisteredUsers();
      if (users.some(u => u.email.toLowerCase() === trimmedEmail)) {
        throw new Error("An account with this email address already exists. Please sign in.");
      }

      // Always assign PATIENT role on signup
      const finalRole = trimmedEmail === ADMIN_EMAIL ? 'Admin' : 'Patient';

      const passwordHash = btoa(encodeURIComponent(`salt_raihan_${pass}`));
      const newUser: RegisteredUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        email: trimmedEmail,
        passwordHash,
        role: finalRole,
        name: name.trim(),
        phone: extraData?.phone || '',
        verified: true,
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
        role: finalRole,
        name: newUser.name,
        phone: newUser.phone,
        subscribed: trimmedEmail === ADMIN_EMAIL,
        verified: true,
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

      // Sync with backend API
      try {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newUser.name,
            email: trimmedEmail,
            password: pass,
            phone: newUser.phone,
            dob: newUser.dob,
            gender: newUser.gender
          })
        });
      } catch (backendSyncErr) {
        console.warn("Backend registration sync notice:", backendSyncErr);
      }

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

  /**
   * Authorized Dentist Provisioning (Restricted Process)
   * Only accessible through admin authorization or clinic management
   */
  const provisionDentistAccount = async (
    dentistData: {
      name: string;
      email: string;
      password: string;
      qualification: string;
      licenseNumber: string;
      specialty?: string;
      subSpecialty?: string;
      phone?: string;
      hospitalAffiliation?: string;
      consultationFee?: number | string;
      workingHours?: string;
      experience?: number;
      bio?: string;
    },
    adminKey: string = ADMIN_PROVISION_KEY
  ): Promise<RegisteredUser> => {
    const trimmedEmail = dentistData.email.toLowerCase().trim();
    if (!trimmedEmail || !dentistData.password || !dentistData.name) {
      throw new Error("Dentist name, email, and password are required.");
    }
    if (!dentistData.qualification || !dentistData.licenseNumber) {
      throw new Error("Dental qualification (e.g. BDS, MDS) and license number are required.");
    }
    if (dentistData.password.length < 6) {
      throw new Error("Dentist password must be at least 6 characters.");
    }

    const users = getRegisteredUsers();
    if (users.some(u => u.email.toLowerCase() === trimmedEmail)) {
      throw new Error("An account with this email already exists.");
    }

    const passwordHash = btoa(encodeURIComponent(`salt_raihan_${dentistData.password}`));
    const newDentist: RegisteredUser = {
      id: `dentist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: trimmedEmail,
      passwordHash,
      role: 'Dentist',
      name: dentistData.name.trim(),
      phone: dentistData.phone || '',
      qualification: dentistData.qualification.trim(),
      licenseNumber: dentistData.licenseNumber.trim(),
      specialty: dentistData.specialty || 'General Dentistry',
      subSpecialty: dentistData.subSpecialty || '',
      location: dentistData.hospitalAffiliation || 'Raihan Dental Clinic',
      hospitalAffiliation: dentistData.hospitalAffiliation || 'Raihan Dental Clinic',
      consultationFee: dentistData.consultationFee || 50,
      workingHours: dentistData.workingHours || '09:00 AM - 05:00 PM, Mon-Sat',
      experience: dentistData.experience || 5,
      bio: dentistData.bio || 'Licensed Dental Surgeon specializing in comprehensive oral healthcare.',
      verified: true,
      createdAt: new Date().toISOString()
    };

    users.push(newDentist);
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));

    const dentistProfile: UserProfile = {
      email: trimmedEmail,
      role: 'Dentist',
      name: newDentist.name,
      phone: newDentist.phone,
      subscribed: true,
      verified: true,
      specialty: newDentist.specialty,
      subSpecialty: newDentist.subSpecialty,
      licenseNumber: newDentist.licenseNumber,
      education: newDentist.qualification,
      location: newDentist.location,
      hospitalAffiliation: newDentist.hospitalAffiliation,
      consultationFee: newDentist.consultationFee,
      workingHours: newDentist.workingHours,
      experience: newDentist.experience,
      bio: newDentist.bio,
      isOnline: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    localStorage.setItem(`raihan_profile_${trimmedEmail}`, JSON.stringify(dentistProfile));

    // Backend sync
    try {
      await fetch('/api/auth/provision-dentist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify(dentistData)
      });
    } catch (e) {
      console.warn("Backend provision sync notice:", e);
    }

    return newDentist;
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

  /**
   * Role modification protection:
   * Non-admin users are strictly forbidden from altering their account role.
   */
  const updateRole = async (role: 'Patient' | 'Doctor' | 'Dentist' | 'Admin') => {
    if (!user) return;
    const currentRole = profile?.role || 'Patient';
    const isAdmin = user.email === ADMIN_EMAIL || currentRole === 'Admin';
    if (!isAdmin) {
      throw new Error("Forbidden: Account roles cannot be modified by users. Role adjustments must be authorized by clinic administration.");
    }

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
          name: auth.currentUser.displayName || '',
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
    const isAdmin = email === ADMIN_EMAIL || profile?.role === 'Admin';

    // Prevent patients from modifying their role via profile edit
    const enforcedRole = (isAdmin && updatedData.role) ? updatedData.role : (profile?.role || 'Patient');

    const merged: UserProfile = {
      ...(profile || {}),
      ...updatedData,
      email,
      role: enforcedRole as any,
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

    // Update registered user store if name or details changed
    if (email) {
      const regUsers = getRegisteredUsers();
      const uIdx = regUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase().trim());
      if (uIdx !== -1) {
        if (updatedData.name) regUsers[uIdx].name = updatedData.name;
        if (updatedData.phone) regUsers[uIdx].phone = updatedData.phone;
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(regUsers));
        window.dispatchEvent(new Event('raihan_users_updated'));
      }

      // Sync to backend database
      try {
        await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-email': email
          },
          body: JSON.stringify(updatedData)
        });
      } catch (e) {
        console.warn("Backend profile sync notice:", e);
      }
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

  /**
   * Upload & Replace Profile Photo
   * Calls POST /api/profile/photo, persists to profile/user state and local storage,
   * and dispatches global event so that all UI components update in real-time.
   */
  const uploadProfilePhoto = async (base64Image: string): Promise<string> => {
    if (!user && !profile) {
      throw new Error("You must be logged in to upload a profile photo.");
    }
    const email = (profile?.email || user?.email || '').toLowerCase().trim();
    const token = user?.token;

    const resp = await fetch('/api/profile/photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'x-user-email': email
      },
      body: JSON.stringify({ image: base64Image })
    });

    const data = await resp.json();
    if (!resp.ok || !data.success) {
      throw new Error(data.error || "Failed to upload profile photo.");
    }

    const newPhotoURL = data.photoURL;

    // 1. Update in-memory profile and active profile in localStorage
    if (profile) {
      const updatedProfile: UserProfile = {
        ...profile,
        photoURL: newPhotoURL,
        image: newPhotoURL,
        updatedAt: new Date()
      };
      setProfile(updatedProfile);
      localStorage.setItem('raihan_active_profile', JSON.stringify(updatedProfile));
      if (email) {
        localStorage.setItem(`raihan_profile_${email}`, JSON.stringify(updatedProfile));
      }
    }

    if (user) {
      const updatedUser = {
        ...user,
        photoURL: newPhotoURL,
        image: newPhotoURL
      };
      setUser(updatedUser);
      localStorage.setItem('raihan_active_user', JSON.stringify(updatedUser));
    }

    // 2. Update registered users list
    if (email) {
      const regUsers = getRegisteredUsers();
      const uIdx = regUsers.findIndex(u => u.email.toLowerCase() === email);
      if (uIdx !== -1) {
        regUsers[uIdx].image = newPhotoURL;
        regUsers[uIdx].photoURL = newPhotoURL;
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(regUsers));
      }
    }

    // 3. Dispatch global events
    window.dispatchEvent(new Event('raihan_profile_updated'));
    window.dispatchEvent(new Event('raihan_users_updated'));

    return newPhotoURL;
  };

  /**
   * Remove Profile Photo
   * Calls DELETE /api/profile/photo, clears avatar from disk and database,
   * and dispatches global event to restore initial-based circular avatar.
   */
  const removeProfilePhoto = async (): Promise<void> => {
    if (!user && !profile) {
      throw new Error("You must be logged in to remove your profile photo.");
    }
    const email = (profile?.email || user?.email || '').toLowerCase().trim();
    const token = user?.token;

    const resp = await fetch('/api/profile/photo', {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'x-user-email': email
      }
    });

    const data = await resp.json();
    if (!resp.ok || !data.success) {
      throw new Error(data.error || "Failed to remove profile photo.");
    }

    // 1. Clear photo from in-memory profile and active profile in localStorage
    if (profile) {
      const updatedProfile: UserProfile = {
        ...profile,
        photoURL: '',
        image: '',
        updatedAt: new Date()
      };
      setProfile(updatedProfile);
      localStorage.setItem('raihan_active_profile', JSON.stringify(updatedProfile));
      if (email) {
        localStorage.setItem(`raihan_profile_${email}`, JSON.stringify(updatedProfile));
      }
    }

    if (user) {
      const updatedUser = {
        ...user,
        photoURL: '',
        image: ''
      };
      setUser(updatedUser);
      localStorage.setItem('raihan_active_user', JSON.stringify(updatedUser));
    }

    // 2. Clear from registered users list
    if (email) {
      const regUsers = getRegisteredUsers();
      const uIdx = regUsers.findIndex(u => u.email.toLowerCase() === email);
      if (uIdx !== -1) {
        regUsers[uIdx].image = '';
        regUsers[uIdx].photoURL = '';
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(regUsers));
      }
    }

    // 3. Dispatch global events
    window.dispatchEvent(new Event('raihan_profile_updated'));
    window.dispatchEvent(new Event('raihan_users_updated'));
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
      provisionDentistAccount,
      logout, 
      updateRole, 
      updateProfile,
      uploadProfilePhoto,
      removeProfilePhoto,
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
