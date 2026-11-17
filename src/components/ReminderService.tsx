import React, { useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';

export function parseAppointmentDateTime(dateStr: string, timeStr: string): Date {
  try {
    const [hoursMin, ampm] = timeStr.trim().split(' ');
    const [hoursStr, minutesStr] = hoursMin.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    if (ampm === 'PM' && hours < 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    
    const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
    const parsedDate = new Date();
    parsedDate.setFullYear(year, month - 1, day);
    parsedDate.setHours(hours, minutes, 0, 0);
    return parsedDate;
  } catch (error) {
    console.error("Error parsing appointment date/time:", error);
    return new Date();
  }
}

export default function ReminderService() {
  useEffect(() => {
    let intervalId: any = null;

    async function checkUpcomingAppointments() {
      try {
        const now = new Date();
        
        const q = query(collection(db, 'appointments'), where('status', '==', 'booked'));
        const querySnapshot = await getDocs(q);

        const appointments: any[] = [];
        querySnapshot.forEach((doc) => {
          appointments.push({ id: doc.id, ...doc.data() });
        });

        for (const app of appointments) {
          if (app.reminder1hSent) continue;

          const appointmentTime = parseAppointmentDateTime(app.date, app.time);
          const diffMs = appointmentTime.getTime() - now.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          if (diffHours > 0 && diffHours <= 1.05) {
            console.log(`Sending 1-hour automated reminders for appointment: ${app.id}`);

            // 1. Patient notification
            await addDoc(collection(db, 'notifications'), {
              recipientEmail: app.patientEmail,
              message: `Reminder: Your upcoming telehealth consultation with Dr. ${app.doctorName} starts in approximately 1 hour at ${app.time}. Please prepare and join the queue.`,
              type: 'appointment_reminder',
              appointmentId: app.id,
              sentVia: ['System', 'Dashboard'],
              timestamp: new Date()
            });

            // 2. Doctor notification
            await addDoc(collection(db, 'notifications'), {
              recipientEmail: app.doctorEmail || app.doctor_email || '',
              message: `Reminder: You have an upcoming consultation with patient ${app.patientName || 'Patient'} starting in approximately 1 hour at ${app.time}.`,
              type: 'appointment_reminder',
              appointmentId: app.id,
              sentVia: ['System', 'Dashboard'],
              timestamp: new Date()
            });

            // 3. Mark as sent
            await updateDoc(doc(db, 'appointments', app.id), {
              reminder1hSent: true
            });
          }
        }
      } catch (error) {
        console.error("Error in automated reminder service run:", error);
      }
    }

    checkUpcomingAppointments();
    intervalId = setInterval(checkUpcomingAppointments, 60000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return null;
}
