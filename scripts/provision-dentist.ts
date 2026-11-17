/**
 * RAIHAN DENTAL CLINIC MANAGEMENT SYSTEM
 * Administrator CLI Tool: Secure Dentist Account Provisioning
 * 
 * Usage:
 *   npx tsx scripts/provision-dentist.ts \
 *     --name "Dr. Raihan Mohammed" \
 *     --email "dr.raihan@raihanclinic.com" \
 *     --password "SecureDentistPass2026!" \
 *     --qualification "BDS, MDS (Orthodontics)" \
 *     --license "KDC-14920" \
 *     --specialty "Orthodontics (Braces & Aligners)" \
 *     --phone "+91 98470 12345"
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const USERS_FILE = path.join(process.cwd(), "raihan-server-users.json");
const ADMIN_PROVISION_KEY = process.env.ADMIN_PROVISION_KEY || "raihan-dental-admin-secret-2026";

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].substring(2);
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "true";
      parsed[key] = val;
      if (val !== "true") i++;
    }
  }
  return parsed;
}

function hashPassword(password: string): string {
  return crypto.createHmac("sha256", "raihan_dental_salt_2026").update(password).digest("hex");
}

async function run() {
  console.log("=================================================");
  console.log("RAIHAN DENTAL CLINIC – DENTIST PROVISIONING CLI");
  console.log("=================================================");

  const args = parseArgs();

  const name = args.name;
  const email = args.email;
  const password = args.password;
  const qualification = args.qualification;
  const licenseNumber = args.license || args.licenseNumber;
  const specialty = args.specialty || "General Dentistry";
  const phone = args.phone || "";
  const clinicAffiliation = args.clinic || "Raihan Dental Clinic";
  const consultationFee = args.fee || 50;

  if (!name || !email || !password || !qualification || !licenseNumber) {
    console.error("\n❌ Error: Missing required provisioning parameters.");
    console.log("\nRequired options:");
    console.log("  --name <string>          Dentist full name (e.g. 'Dr. Sarah Connor')");
    console.log("  --email <string>         Official clinic email (e.g. 'sarah@raihanclinic.com')");
    console.log("  --password <string>      Secure initial password (min 6 chars)");
    console.log("  --qualification <string> Dental qualification (e.g. 'BDS, MDS')");
    console.log("  --license <string>       Dental Council Registration No. (e.g. 'DDC-98421')");
    console.log("\nOptional options:");
    console.log("  --specialty <string>     Dental specialty (default: 'General Dentistry')");
    console.log("  --phone <string>         Contact telephone number");
    console.log("  --clinic <string>        Affiliated clinic/hospital");
    console.log("  --fee <number>           Consultation fee");
    console.log("\nExample command:");
    console.log('  npx tsx scripts/provision-dentist.ts --name "Dr. Raihan" --email "dr.raihan@clinic.com" --password "Clinic2026!" --qualification "BDS, MDS" --license "KDC-12345"');
    process.exit(1);
  }

  const trimmedEmail = email.toLowerCase().trim();

  // 1. First attempt to call the running server API endpoint
  try {
    const response = await fetch("http://localhost:5173/api/auth/provision-dentist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_PROVISION_KEY
      },
      body: JSON.stringify({
        name,
        email: trimmedEmail,
        password,
        qualification,
        licenseNumber,
        specialty,
        phone,
        hospitalAffiliation: clinicAffiliation,
        consultationFee
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log("\n✅ Dentist account provisioned successfully via Raihan API!");
      console.log(JSON.stringify(result.dentist, null, 2));
      return;
    }
  } catch {
    // Server might be offline or undergoing restart; fall back to direct file storage
  }

  // 2. Direct file write fallback
  let users: any[] = [];
  if (fs.existsSync(USERS_FILE)) {
    try {
      users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    } catch {}
  }

  if (users.some(u => u.email.toLowerCase() === trimmedEmail)) {
    console.error(`\n❌ Error: An account with email '${trimmedEmail}' already exists.`);
    process.exit(1);
  }

  const passwordHash = hashPassword(password);
  const newDentist = {
    id: `dentist-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    email: trimmedEmail,
    passwordHash,
    role: "Dentist",
    name: name.trim(),
    phone: phone.trim(),
    qualification: qualification.trim(),
    licenseNumber: licenseNumber.trim(),
    specialty: specialty.trim(),
    hospitalAffiliation: clinicAffiliation.trim(),
    consultationFee: consultationFee,
    workingHours: "09:00 AM - 05:00 PM, Mon-Sat",
    experience: 5,
    bio: "Licensed Dental Surgeon specializing in modern, compassionate oral healthcare.",
    verified: true,
    createdAt: new Date().toISOString()
  };

  users.push(newDentist);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");

  console.log("\n✅ Dentist account successfully provisioned directly in system database!");
  console.log({
    id: newDentist.id,
    email: newDentist.email,
    name: newDentist.name,
    role: newDentist.role,
    qualification: newDentist.qualification,
    licenseNumber: newDentist.licenseNumber,
    specialty: newDentist.specialty
  });
}

run().catch((err) => {
  console.error("\n❌ Fatal provisioning error:", err);
  process.exit(1);
});
