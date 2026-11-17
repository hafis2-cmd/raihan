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
    if (!raw) return initSeedConsultations();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initSeedConsultations();
  } catch (e) {
    console.warn('Error reading local dental consultations:', e);
    return initSeedConsultations();
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

// Seed initial consultations if empty
export function initSeedConsultations(): DentalConsultation[] {
  const seeds: DentalConsultation[] = [
    {
      id: 'cons-seed-1',
      patient_email: 'patient@telemed.com',
      patient_name: 'John Doe',
      dentist_email: 'dr.raihan@telemed.com',
      dentist_name: 'Dr. Raihan (BDS, MDS)',
      consultation_date: '2026-11-10',
      complaints: 'Severe throbbing pain in upper right molar triggered by cold drinks and chewing.',
      examination_findings: 'Deep occlusal decay on tooth #16 (upper right first molar). Tender to percussion. Vitality test positive for irreversible pulpitis.',
      diagnosis: 'Acute Irreversible Pulpitis – Tooth #16',
      treatment_category: 'Root canal treatment',
      treatment_performed: 'Chemo-mechanical canal debridement, working length determination, and placed Ledermix sedative temporary dressing.',
      follow_up_instructions: 'Avoid chewing on upper right side. Prescribed antibiotic and analgesic coverage. Return in 7 days for canal obturation.',
      next_visit_date: '2026-11-20',
      treatment_cost: 280,
      created_at: new Date('2026-11-10T11:00:00Z').toISOString()
    },
    {
      id: 'cons-seed-2',
      patient_email: 'patient@telemed.com',
      patient_name: 'John Doe',
      dentist_email: 'dr.raihan@telemed.com',
      dentist_name: 'Dr. Raihan (BDS, MDS)',
      consultation_date: '2026-10-02',
      complaints: 'Routine 6-month dental checkup and mild gum bleeding while flossing.',
      examination_findings: 'Moderate supra-gingival calculus on lingual aspects of lower incisors. Mild generalized marginal gingivitis. No active caries detected.',
      diagnosis: 'Chronic Marginal Gingivitis with Plaque/Calculus',
      treatment_category: 'Dental cleaning (Scaling)',
      treatment_performed: 'Full-mouth ultrasonic scaling and sub-gingival polishing with prophylactic fluoride paste.',
      follow_up_instructions: 'Brush twice daily using soft-bristled brush, floss daily, and use warm saline rinses for 3 days.',
      next_visit_date: '2027-04-02',
      treatment_cost: 75,
      created_at: new Date('2026-10-02T10:30:00Z').toISOString()
    }
  ];

  try {
    localStorage.setItem(STORAGE_KEY_CONSULTATIONS, JSON.stringify(seeds));
  } catch (e) {
    // ignore
  }
  return seeds;
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
    if (!raw) return initSeedPrescriptions();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initSeedPrescriptions();
  } catch (e) {
    console.warn('Error reading local dental prescriptions:', e);
    return initSeedPrescriptions();
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

// Seed initial dental prescriptions
export function initSeedPrescriptions(): DentalPrescription[] {
  const seeds: DentalPrescription[] = [
    {
      id: 'rx-seed-1',
      patient_email: 'patient@telemed.com',
      patient_name: 'John Doe',
      dentist_email: 'dr.raihan@telemed.com',
      dentist_name: 'Dr. Raihan (BDS, MDS)',
      prescription_date: '2026-11-10',
      medications: [
        {
          medicine_name: 'Amoxicillin 500mg',
          dosage: '500 mg',
          frequency: '3 times daily (every 8 hrs)',
          duration: '5 days',
          instructions: 'Take after meals. Complete full 5-day course.'
        },
        {
          medicine_name: 'Ibuprofen 400mg',
          dosage: '400 mg',
          frequency: 'As needed (every 8 hrs)',
          duration: '3 days',
          instructions: 'Take with food for pain relief.'
        },
        {
          medicine_name: 'Chlorhexidine 0.2% Mouthwash',
          dosage: '10 mL',
          frequency: 'Twice daily',
          duration: '7 days',
          instructions: 'Rinse for 1 minute after brushing. Spit out.'
        }
      ],
      instructions: 'Take antibiotics as scheduled to control periapical tooth infection. Maintain gentle oral hygiene around tooth #16.',
      created_at: new Date('2026-11-10T11:15:00Z').toISOString()
    }
  ];

  try {
    localStorage.setItem(STORAGE_KEY_PRESCRIPTIONS, JSON.stringify(seeds));
  } catch (e) {
    // ignore
  }
  return seeds;
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
