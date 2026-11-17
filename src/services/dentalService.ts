import { db, isFirebaseConfigured } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { createNotification } from './appointmentService';

export type DentalTreatmentCategory = 
  | 'Dental cleaning (Scaling)'
  | 'Dental filling'
  | 'Root canal treatment'
  | 'Tooth extraction'
  | 'Dental crowns'
  | 'Tooth whitening'
  | 'Gum treatment'
  | 'Orthodontic consultation'
  | 'General dental examination';

export const DENTAL_TREATMENT_CATEGORIES: DentalTreatmentCategory[] = [
  'General dental examination',
  'Dental cleaning (Scaling)',
  'Dental filling',
  'Root canal treatment',
  'Tooth extraction',
  'Dental crowns',
  'Tooth whitening',
  'Gum treatment',
  'Orthodontic consultation',
];

export interface DentalConsultation {
  id: string;
  patient_email: string;
  patient_name: string;
  dentist_email: string;
  dentist_name: string;
  consultation_date: string;
  complaints: string;
  examination_findings: string;
  diagnosis: string;
  treatment_category: DentalTreatmentCategory;
  treatment_performed: string;
  follow_up_instructions: string;
  next_visit_date?: string;
  treatment_cost?: number;
  created_at: string;
}

export interface DentalPrescriptionItem {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface DentalPrescription {
  id: string;
  patient_email: string;
  patient_name: string;
  dentist_email: string;
  dentist_name: string;
  prescription_date: string;
  medications: DentalPrescriptionItem[];
  instructions?: string;
  created_at: string;
}

// Common dental medicines for quick selection
export const COMMON_DENTAL_MEDICATIONS = [
  {
    name: 'Amoxicillin 500mg',
    dosage: '500 mg',
    frequency: '3 times daily (every 8 hrs)',
    duration: '5 days',
    instructions: 'Take with food. Complete the full course of antibiotics.'
  },
  {
    name: 'Ibuprofen 400mg',
    dosage: '400 mg',
    frequency: 'As needed (max 3 times/day)',
    duration: '3 days',
    instructions: 'Take after meals for dental pain and post-treatment inflammation.'
  },
  {
    name: 'Chlorhexidine Gluconate 0.2% Oral Rinse',
    dosage: '10 mL',
    frequency: 'Twice daily',
    duration: '7 days',
    instructions: 'Swish for 60 seconds and spit out after brushing. Do not swallow.'
  },
  {
    name: 'Metronidazole 400mg',
    dosage: '400 mg',
    frequency: '3 times daily',
    duration: '5 days',
    instructions: 'Take with water. Strictly avoid alcohol during treatment.'
  },
  {
    name: 'Paracetamol 650mg',
    dosage: '650 mg',
    frequency: 'Every 6 hrs as needed',
    duration: '3 days',
    instructions: 'Take for mild toothache or fever. Do not exceed 3000mg/day.'
  },
  {
    name: 'Triamcinolone Acetonide 0.1% Dental Paste',
    dosage: 'Thin film',
    frequency: 'At bedtime',
    duration: '5 days',
    instructions: 'Apply small dab over oral mucosal ulcer without rubbing.'
  }
];

// Storage keys
const STORAGE_KEY_CONSULTATIONS = 'raihan_dental_consultations';
const STORAGE_KEY_PRESCRIPTIONS = 'raihan_dental_prescriptions';

// Helper: Get local consultations
export function getLocalConsultations(): DentalConsultation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONSULTATIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Error reading local dental consultations:', e);
    return [];
  }
}

// Helper: Save local consultations
export function saveLocalConsultations(records: DentalConsultation[]) {
  try {
    localStorage.setItem(STORAGE_KEY_CONSULTATIONS, JSON.stringify(records));
    window.dispatchEvent(new Event('raihan_consultations_updated'));
  } catch (e) {
    console.warn('Error saving local dental consultations:', e);
  }
}

// Production: No seed consultations
export function initSeedConsultations(): DentalConsultation[] {
  return [];
}

// Add a dental consultation
export async function addDentalConsultation(data: Omit<DentalConsultation, 'id' | 'created_at'>): Promise<DentalConsultation> {
  const newRecord: DentalConsultation = {
    ...data,
    id: `cons-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    created_at: new Date().toISOString()
  };

  // Local storage
  const all = getLocalConsultations();
  all.unshift(newRecord);
  saveLocalConsultations(all);

  // Firestore sync if configured
  if (isFirebaseConfigured) {
    try {
      await addDoc(collection(db, 'dental_consultations'), {
        ...newRecord,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.warn('Firestore dental consultation sync failed (saved locally):', e);
    }
  }

  // Notify patient
  await createNotification({
    recipientEmail: data.patient_email,
    title: 'Dental Consultation Record Updated',
    message: `Dr. ${data.dentist_name} has recorded your dental consultation for ${data.treatment_category}. Follow-up instructions are available in your records.`,
    type: 'consultation_recorded'
  });

  return newRecord;
}

// Helper: Get local prescriptions
export function getLocalPrescriptions(): DentalPrescription[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRESCRIPTIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Error reading local dental prescriptions:', e);
    return [];
  }
}

// Helper: Save local prescriptions
export function saveLocalPrescriptions(records: DentalPrescription[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PRESCRIPTIONS, JSON.stringify(records));
    window.dispatchEvent(new Event('raihan_prescriptions_updated'));
  } catch (e) {
    console.warn('Error saving local dental prescriptions:', e);
  }
}

// Production: No seed prescriptions
export function initSeedPrescriptions(): DentalPrescription[] {
  return [];
}

// Add a dental prescription
export async function addDentalPrescription(data: Omit<DentalPrescription, 'id' | 'created_at'>): Promise<DentalPrescription> {
  const newRx: DentalPrescription = {
    ...data,
    id: `rx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    created_at: new Date().toISOString()
  };

  // Local storage
  const all = getLocalPrescriptions();
  all.unshift(newRx);
  saveLocalPrescriptions(all);

  // Firestore sync if configured
  if (isFirebaseConfigured) {
    try {
      await addDoc(collection(db, 'prescriptions'), {
        patientEmail: data.patient_email,
        patientName: data.patient_name,
        doctorEmail: data.dentist_email,
        doctorName: data.dentist_name,
        date: data.prescription_date,
        medications: data.medications.map(m => ({
          name: m.medicine_name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions
        })),
        notes: data.instructions || '',
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.warn('Firestore prescription sync failed (saved locally):', e);
    }
  }

  // Notify patient
  await createNotification({
    recipientEmail: data.patient_email,
    title: 'New Dental Prescription Issued',
    message: `Dr. ${data.dentist_name} has issued a digital dental prescription for you. You can view and download it anytime under Prescriptions.`,
    type: 'prescription_created'
  });

  return newRx;
}
