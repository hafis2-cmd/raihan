/**
 * Comprehensive Verification Test Suite
 * Tests all requirements from Section 7 of the Master Prompt
 */

import "dotenv/config";

const BASE_URL = "http://localhost:5173";
const ADMIN_KEY = process.env.ADMIN_PROVISION_KEY || "raihan-dental-admin-secret-2026";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (detail) console.error(`     Details: ${detail}`);
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("RAIHAN DENTAL CLINIC – ROLE AUTHENTICATION TEST SUITE");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  const testPatientEmail = `test.patient.${timestamp}@example.com`;
  const testPatientPass = "PatientPass2026!";
  const testDentistEmail = `test.dentist.${timestamp}@clinic.com`;
  const testDentistPass = "DentistPass2026!";

  // -----------------------------------------------------------
  // TEST 1: Reject attempt to register as a Dentist via public registration
  // -----------------------------------------------------------
  console.log("Test 1: Rejecting public dentist registration attempt...");
  const dentistSignupAttempt = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Fake Dr. Hacker",
      email: `fake.dentist.${timestamp}@example.com`,
      password: "HackerPass123!",
      role: "Dentist" // Attempting to register as dentist
    })
  });
  const dentistSignupData = await dentistSignupAttempt.json();
  assert(
    dentistSignupAttempt.status === 403,
    "Public registration with role='Dentist' is rejected with 403 Forbidden",
    `Status: ${dentistSignupAttempt.status}, Message: ${dentistSignupData.error}`
  );

  // -----------------------------------------------------------
  // TEST 2: Successful Patient Registration
  // -----------------------------------------------------------
  console.log("\nTest 2: Patient Registration...");
  const patientSignup = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Alice Green",
      email: testPatientEmail,
      password: testPatientPass,
      phone: "+1 555-0192",
      dob: "1994-06-15",
      gender: "Female"
    })
  });
  const patientSignupData = await patientSignup.json();
  assert(
    patientSignup.status === 201 && patientSignupData.success === true,
    "Patient can register successfully",
    JSON.stringify(patientSignupData)
  );

  // -----------------------------------------------------------
  // TEST 3: Verify Assigned Role is PATIENT
  // -----------------------------------------------------------
  assert(
    patientSignupData.user?.role === "Patient",
    "Newly registered user automatically receives the PATIENT role",
    `Assigned role: ${patientSignupData.user?.role}`
  );

  // -----------------------------------------------------------
  // TEST 4: Prevent duplicate email registration
  // -----------------------------------------------------------
  console.log("\nTest 4: Duplicate Email Prevention...");
  const dupSignup = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Alice Imposter",
      email: testPatientEmail,
      password: "AnotherPassword123!"
    })
  });
  assert(
    dupSignup.status === 409,
    "Duplicate email registration is blocked with 409 Conflict",
    `Status: ${dupSignup.status}`
  );

  // -----------------------------------------------------------
  // TEST 5: Dentist Account Provisioning (Unauthorized Attempt)
  // -----------------------------------------------------------
  console.log("\nTest 5: Unauthorized Dentist Provisioning Blocked...");
  const unauthProvision = await fetch(`${BASE_URL}/api/auth/provision-dentist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Dr. Imposter",
      email: "imposter@clinic.com",
      password: "password123",
      qualification: "BDS",
      licenseNumber: "LIC-000"
    })
  });
  assert(
    unauthProvision.status === 403,
    "Dentist provisioning without admin credentials is rejected with 403",
    `Status: ${unauthProvision.status}`
  );

  // -----------------------------------------------------------
  // TEST 6: Authorized Dentist Account Provisioning
  // -----------------------------------------------------------
  console.log("\nTest 6: Authorized Dentist Account Provisioning...");
  const authProvision = await fetch(`${BASE_URL}/api/auth/provision-dentist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_KEY
    },
    body: JSON.stringify({
      name: "Dr. Raihan K.",
      email: testDentistEmail,
      password: testDentistPass,
      qualification: "BDS, MDS (Periodontics)",
      licenseNumber: "DDC-88412",
      specialty: "Periodontics (Gum Care & Implants)",
      phone: "+1 555-0814",
      consultationFee: 75
    })
  });
  const authProvisionData = await authProvision.json();
  assert(
    authProvision.status === 201 && authProvisionData.success === true,
    "Dentist account successfully provisioned by authorized administrator",
    JSON.stringify(authProvisionData)
  );
  assert(
    authProvisionData.dentist?.role === "Dentist",
    "Provisioned account receives the DENTIST role",
    `Role: ${authProvisionData.dentist?.role}`
  );

  // -----------------------------------------------------------
  // TEST 7: Patient Login Verification
  // -----------------------------------------------------------
  console.log("\nTest 7: Patient Login...");
  const patientLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testPatientEmail,
      password: testPatientPass
    })
  });
  const patientLoginData = await patientLogin.json();
  assert(
    patientLogin.status === 200 && patientLoginData.role === "Patient",
    "Patient logs in using registered credentials and resolves PATIENT role",
    `Returned role: ${patientLoginData.role}`
  );
  const patientToken = patientLoginData.token;

  // -----------------------------------------------------------
  // TEST 8: Dentist Login Verification
  // -----------------------------------------------------------
  console.log("\nTest 8: Dentist Login...");
  const dentistLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testDentistEmail,
      password: testDentistPass
    })
  });
  const dentistLoginData = await dentistLogin.json();
  assert(
    dentistLogin.status === 200 && dentistLoginData.role === "Dentist",
    "Dentist logs in using provisioned credentials and resolves DENTIST role",
    `Returned role: ${dentistLoginData.role}`
  );
  const dentistToken = dentistLoginData.token;

  // -----------------------------------------------------------
  // TEST 9: Invalid Credentials Rejected
  // -----------------------------------------------------------
  console.log("\nTest 9: Invalid Credentials Rejection...");
  const badLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testPatientEmail,
      password: "WrongPassword999!"
    })
  });
  assert(
    badLogin.status === 401,
    "Invalid password is correctly rejected with 401 Unauthorized",
    `Status: ${badLogin.status}`
  );

  // -----------------------------------------------------------
  // TEST 10: Patient Access to Dentist-Only API is Blocked
  // -----------------------------------------------------------
  console.log("\nTest 10: Role-Based API Protection (Dentist-Only Access)...");
  const patientApiAccess = await fetch(`${BASE_URL}/api/dentist/patients`, {
    headers: {
      Authorization: `Bearer ${patientToken}`
    }
  });
  assert(
    patientApiAccess.status === 403,
    "Patient is forbidden from accessing dentist-only patient records endpoint (403)",
    `Status: ${patientApiAccess.status}`
  );

  const dentistApiAccess = await fetch(`${BASE_URL}/api/dentist/patients`, {
    headers: {
      Authorization: `Bearer ${dentistToken}`
    }
  });
  assert(
    dentistApiAccess.status === 200,
    "Dentist is authorized to access dentist patient records endpoint (200 OK)",
    `Status: ${dentistApiAccess.status}`
  );

  // -----------------------------------------------------------
  // TEST 11: Patient Cannot Modify Account Role
  // -----------------------------------------------------------
  console.log("\nTest 11: Role Modification Protection...");
  const patientRoleChange = await fetch(`${BASE_URL}/api/auth/update-role`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${patientToken}`
    },
    body: JSON.stringify({
      targetEmail: testPatientEmail,
      newRole: "Dentist"
    })
  });
  assert(
    patientRoleChange.status === 403,
    "Patient attempt to modify role is rejected with 403 Forbidden",
    `Status: ${patientRoleChange.status}`
  );

  // -----------------------------------------------------------
  // TEST RESULTS SUMMARY
  // -----------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`TEST SUMMARY: ${passedCount} / ${totalCount} TESTS PASSED`);
  console.log("=======================================================\n");

  if (passedCount === totalCount) {
    console.log("🎉 ALL ROLE AUTHENTICATION REQUIREMENTS VERIFIED SUCCESSFULLY!\n");
    process.exit(0);
  } else {
    console.error("❌ Some tests failed. Please review the output above.\n");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
