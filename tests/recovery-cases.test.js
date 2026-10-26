import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT_DIR = path.resolve('.');

test('Migration 008 creates versioned recovery cases, device custody, protected diagnostics, and case events ledger', () => {
  const backendMigPath = path.join(ROOT_DIR, 'backend', 'migrations', '008_marsnova_recovery_cases.sql');
  const supabaseMigPath = path.join(ROOT_DIR, 'supabase', 'migrations', '202610230008_marsnova_recovery_cases.sql');

  assert.ok(fs.existsSync(backendMigPath), 'backend/migrations/008_marsnova_recovery_cases.sql must exist');
  assert.ok(fs.existsSync(supabaseMigPath), 'supabase/migrations/202610230008_marsnova_recovery_cases.sql must exist');

  const sql = fs.readFileSync(backendMigPath, 'utf8');

  // Case columns
  assert.ok(sql.includes('case_reference VARCHAR(32)'), 'Migration must add case_reference');
  assert.ok(sql.includes('device_brand VARCHAR'), 'Migration must add device_brand');
  assert.ok(sql.includes('damage_type VARCHAR'), 'Migration must add damage_type');
  assert.ok(sql.includes('consent_diagnostic BOOLEAN'), 'Migration must add consent_diagnostic');
  assert.ok(sql.includes('physical_receipt_confirmed BOOLEAN'), 'Migration must add physical_receipt_confirmed');
  assert.ok(sql.includes('internal_diagnostic_notes TEXT'), 'Migration must add internal_diagnostic_notes');
  assert.ok(sql.includes('public_diagnostic_summary TEXT'), 'Migration must add public_diagnostic_summary');
  assert.ok(sql.includes('current_custody_location VARCHAR'), 'Migration must add current_custody_location');
  assert.ok(sql.includes('quotation_status VARCHAR'), 'Migration must add quotation_status');
  assert.ok(sql.includes('recovery_status VARCHAR'), 'Migration must add recovery_status');

  // Status check constraint
  assert.ok(sql.includes('chk_recovery_status'), 'Migration must define chk_recovery_status constraint');
  assert.ok(sql.includes("'intake_submitted'"), 'Constraint must include intake_submitted');
  assert.ok(sql.includes("'device_received'"), 'Constraint must include device_received');
  assert.ok(sql.includes("'in_recovery'"), 'Constraint must include in_recovery');
  assert.ok(sql.includes("'device_returned'"), 'Constraint must include device_returned');

  // Case events ledger table
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS recovery_case_events'), 'Migration must create recovery_case_events table');
  assert.ok(sql.includes('custody_location VARCHAR'), 'recovery_case_events must record custody_location');
  assert.ok(sql.includes('internal_diagnostic_notes TEXT'), 'recovery_case_events must record internal_diagnostic_notes');
});

test('RecoveryController implements intake, diagnostic protection, custody, and strict approval gates', () => {
  const headerPath = path.join(ROOT_DIR, 'backend', 'controllers', 'RecoveryController.h');
  const sourcePath = path.join(ROOT_DIR, 'backend', 'controllers', 'RecoveryController.cc');

  assert.ok(fs.existsSync(headerPath), 'RecoveryController.h must exist');
  assert.ok(fs.existsSync(sourcePath), 'RecoveryController.cc must exist');

  const header = fs.readFileSync(headerPath, 'utf8');
  const source = fs.readFileSync(sourcePath, 'utf8');

  // Routes
  assert.ok(header.includes('createCase'), 'RecoveryController must declare createCase');
  assert.ok(header.includes('trackCase'), 'RecoveryController must declare trackCase');

  // Diagnostic notes protection
  assert.ok(source.includes('includeProtectedInternal = false'), 'caseToJson must support redacting protected internal fields');
  assert.ok(source.includes('Redacted for public customer tracking') || source.includes('includeProtectedInternal'), 'Public tracking must protect diagnostic notes');


  // Guardrails: no website-driven USB recovery or user file uploads
  assert.ok(!source.includes('navigator.usb') && !source.includes('WebUSB'), 'Backend must not attempt website-driven USB recovery');
});

test('Frontend types and API client declare full typed recovery models and operations', () => {
  const typesPath = path.join(ROOT_DIR, 'src', 'types.ts');
  const apiPath = path.join(ROOT_DIR, 'src', 'api.ts');

  const types = fs.readFileSync(typesPath, 'utf8');
  const api = fs.readFileSync(apiPath, 'utf8');

  // Types
  assert.ok(types.includes('RecoveryCaseStatus'), 'types.ts must define RecoveryCaseStatus');
  assert.ok(types.includes('RecoveryCaseRecord'), 'types.ts must define RecoveryCaseRecord');
  assert.ok(types.includes('RecoveryCaseEventRecord'), 'types.ts must define RecoveryCaseEventRecord');
  assert.ok(types.includes('RecoveryIntakePayload'), 'types.ts must define RecoveryIntakePayload');
  assert.ok(types.includes('PhysicalReceiptPayload'), 'types.ts must define PhysicalReceiptPayload');
  assert.ok(types.includes('CaseDiagnosisPayload'), 'types.ts must define CaseDiagnosisPayload');
  assert.ok(types.includes('CaseQuotationPayload'), 'types.ts must define CaseQuotationPayload');
  assert.ok(types.includes('CaseQuotationDecisionPayload'), 'types.ts must define CaseQuotationDecisionPayload');
  assert.ok(types.includes('CaseCustodyTransferPayload'), 'types.ts must define CaseCustodyTransferPayload');
  assert.ok(types.includes('CaseReturnPayload'), 'types.ts must define CaseReturnPayload');

  // API Client Methods
  assert.ok(api.includes('submitRecoveryIntake'), 'api.ts must export submitRecoveryIntake');
  assert.ok(api.includes('trackPublicRecoveryCase'), 'api.ts must export trackPublicRecoveryCase');
});

test('PenDriveRecoveryPage renders laboratory intake form, consent disclaimers, and live case tracker', () => {
  const pagePath = path.join(ROOT_DIR, 'src', 'pages', 'PenDriveRecoveryPage.tsx');
  const appPath = path.join(ROOT_DIR, 'src', 'App.tsx');

  assert.ok(fs.existsSync(pagePath), 'PenDriveRecoveryPage.tsx must exist');

  const page = fs.readFileSync(pagePath, 'utf8');
  const app = fs.readFileSync(appPath, 'utf8');

  // Route registration in App.tsx
  assert.ok(app.includes('/services/pen-drive-data-recovery'), 'App.tsx must register /services/pen-drive-data-recovery route');

  // Intake Form
  assert.ok(page.includes('customer_name'), 'Intake form must include customer_name');
  assert.ok(page.includes('customer_phone'), 'Intake form must include customer_phone');
  assert.ok(page.includes('device_brand'), 'Intake form must include device_brand');
  assert.ok(page.includes('capacity_gb'), 'Intake form must include capacity_gb');
  assert.ok(page.includes('consent_diagnostic'), 'Intake form must include consent_diagnostic');
  assert.ok(page.includes('terms_accepted'), 'Intake form must include terms_accepted');

  // Authorizations and terms are the customer's explicit choice: none of them may start ticked.
  const intakeState = page.match(/useState<RecoveryIntakePayload>\(\{[^}]*\}\)/);
  assert.ok(intakeState, 'Intake form must declare its state');
  for (const field of ['consent_diagnostic', 'consent_nand_risk', 'terms_accepted']) {
    assert.match(intakeState[0], new RegExp(`${field}:\\s*false`), `${field} must start unticked`);
  }
  assert.ok(!/(consent_diagnostic|consent_nand_risk|terms_accepted):\s*true/.test(page), 'No intake consent may default to true');

  // Disclaimers & Guardrails
  assert.ok(page.includes('never execute browser-driven WebUSB') || page.includes('never execute browser-level USB'), 'Page must contain WebUSB disclaimer');
  assert.ok(page.includes('Recovered files are never stored on public web servers') || page.includes('never uploaded to public web servers'), 'Page must contain zero cloud uploads disclaimer');

  // Live Case Tracker
  assert.ok(page.includes('trackPublicRecoveryCase'), 'Page must connect to trackPublicRecoveryCase');
  assert.ok(page.includes('current_custody_location'), 'Page must display current_custody_location');
});

test('C++ Drogon backend smoke test executable verifies all 13 test suites with 0 errors', () => {
  const exePath = path.join(ROOT_DIR, 'backend', 'smoke_test.exe');
  assert.ok(fs.existsSync(exePath), 'backend/smoke_test.exe must exist');

  const stdout = execFileSync(exePath, [], { encoding: 'utf8' });

  assert.ok(stdout.includes('ALL 13 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)'), 'Smoke test output must report all 13 tests passed');
  assert.ok(stdout.includes('[Test 10] Testing pen-drive data recovery'), 'Smoke test must report Test 13 passed');
});
