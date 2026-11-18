/**
 * Campus Stores - Acceptance & Domain Invariant Test Suite
 * 
 * Verifies the actual production domain engine (campus-stores-core.js)
 * across 11 comprehensive workflow and business invariants:
 * 
 * 1. Initial State & Asset Lifecycle
 * 2. Shift Advancement Gate (Phase 0: Prevents unissued shift advance)
 * 3. Inventory Guardrail: Rejection of in-repair hardware (PR-06)
 * 4. Request Guardrail: Rejection of unapproved asset types
 * 5. Two-Stage Atomic Checkout: Rollback on partial failure (zero state mutation)
 * 6. Flexible Multi-Item Atomic Checkout: Distinct asset selection (e.g. SP-05)
 * 7. Asset-Level Accountability & Original Borrower Tracking
 * 8. Dynamic Shift Gate: Validates actual issued units (no hardcoded IDs)
 * 9. Structured Returns & Dynamic Damage Transition (Damaged -> In repair)
 * 10. Custody Transfer History Preservation (Kabir Sen -> Leela Das)
 * 11. Physical Unit Disambiguation & Full Reconciliation (AD-12 verified, AD-15 rejected)
 * 
 * Run with: node test-shift.js
 */

const assert = require("assert");
const core = require("./campus-stores-core.js");

console.log("\n========================================================");
console.log("  CAMPUS STORES - PRODUCTION DOMAIN ACCEPTANCE SUITE    ");
console.log("  (Executing directly against campus-stores-core.js)   ");
console.log("========================================================\n");

let passed = 0;
const state = core.createInitialState();

function test(name, fn) {
  try {
    fn();
    console.log(`  ✔ [PASS] Check ${++passed}: ${name}`);
  } catch (err) {
    console.error(`  ✖ [FAIL] Check ${passed + 1}: ${name}`);
    console.error(`    -> ${err.message}`);
    process.exit(1);
  }
}

// 1. Initial State & Asset Lifecycle
test("Initial state has 1 active loan (Debate Union MI-09) and clean damage log", () => {
  assert.strictEqual(state.loans.length, 1);
  assert.strictEqual(state.loans[0].asset, "MI-09");
  assert.strictEqual(state.loans[0].who, "Tara Shah");
  assert.strictEqual(state.loans[0].originalBorrower, "Tara Shah");
  assert.strictEqual(state.loans[0].back, false);
  assert.deepStrictEqual(state.damagedAssets, []);
  assert.strictEqual(core.getAssetStatus(state, "PR-06"), "In repair"); // Epson in workshop
  assert.strictEqual(core.getAssetStatus(state, "PR-04"), "On shelf");
  assert.strictEqual(core.getAssetStatus(state, "MI-09"), "On loan");
});

// 2. Shift Gate Invariant (Phase 0)
test("Shift Gate blocks advance to 7:30 pm if Film Society kit has not been issued", () => {
  const check = core.canAdvanceShift(state);
  assert.strictEqual(check.allowed, false);
  assert.match(check.reason, /Film Society kit \(RQ-214\) has not been issued yet/);
});

// 3. Domain Rule: In-repair unit rejection
test("Inventory Guardrail rejects issuing PR-06 (Epson projector in Workshop repair)", () => {
  assert.throws(() => {
    core.executeKitCheckout(state, "RQ-214", "Kabir Sen", "Fri 8 pm", {
      "HDMI projector": "PR-06",
      "Portable speaker": "SP-02",
      "USB-C → HDMI adapter": "AD-12",
    });
  }, /is currently in repair and cannot be issued/);
  // Ensure zero state was modified
  assert.strictEqual(state.loans.length, 1);
});

// 4. Domain Rule: Unapproved equipment type rejection
test("Request Guardrail rejects issuing equipment outside approved request", () => {
  assert.throws(() => {
    core.executeKitCheckout(state, "RQ-214", "Kabir Sen", "Fri 8 pm", {
      "HDMI projector": "CA-03", // Camera is not an HDMI projector
      "Portable speaker": "SP-02",
      "USB-C → HDMI adapter": "AD-12",
    });
  }, /does not match required type/);
  // Ensure zero state was modified
  assert.strictEqual(state.loans.length, 1);
});

// 5. Two-Stage Atomic Checkout Rollback
test("Two-Stage Atomic Checkout aborts cleanly without state mutation if any item fails", () => {
  const initialLoanCount = state.loans.length;
  const initialEventCount = state.events.length;

  assert.throws(() => {
    core.executeKitCheckout(state, "RQ-214", "Kabir Sen", "Fri 8 pm", {
      "HDMI projector": "PR-04", // Valid
      "Portable speaker": "SP-02", // Valid
      "USB-C → HDMI adapter": "NON-EXISTENT", // Invalid!
    });
  }, /does not exist/);

  // Atomicity verification: NO loans or events were created
  assert.strictEqual(state.loans.length, initialLoanCount);
  assert.strictEqual(state.events.length, initialEventCount);
});

// 6. Flexible Multi-Item Atomic Checkout
test("Atomic Kit Checkout issues PR-04, SP-05 (Bose), and AD-12 (Belkin) to Kabir Sen", () => {
  const slips = core.executeKitCheckout(state, "RQ-214", "Kabir Sen", "Fri 8 pm", {
    "HDMI projector": "PR-04",
    "Portable speaker": "SP-05", // Selected alternative physical unit!
    "USB-C → HDMI adapter": "AD-12",
  });
  assert.strictEqual(slips.length, 3);
  assert.strictEqual(slips[0].asset, "PR-04");
  assert.strictEqual(slips[1].asset, "SP-05");
  assert.strictEqual(slips[2].asset, "AD-12");
});

// 7. Asset-Level Accountability & Original Borrower Tracking
test("Individual physical slips (L-402, L-403, L-404) track originalBorrower", () => {
  const filmSlips = state.loans.filter((l) => l.req === "RQ-214");
  assert.strictEqual(filmSlips.length, 3);
  assert.deepStrictEqual(filmSlips.map((l) => l.num), [402, 403, 404]);
  assert.strictEqual(filmSlips[0].originalBorrower, "Kabir Sen");
  assert.strictEqual(filmSlips[1].originalBorrower, "Kabir Sen");
  assert.strictEqual(filmSlips[2].originalBorrower, "Kabir Sen");
});

// 8. Dynamic Shift Gate (Validates actual selected units, e.g. SP-05)
test("Shift Gate dynamically validates actual selected units (SP-05) and enforces partial return", () => {
  // Now allowed to advance to Phase 1 (7:30 pm)
  assert.strictEqual(core.canAdvanceShift(state).allowed, true);
  state.phase = 1;

  // At 7:30 pm, cannot advance to morning until partial return is logged
  const check = core.canAdvanceShift(state);
  assert.strictEqual(check.allowed, false);
  // Verify it references the actual issued units PR-04 and SP-05, NOT hardcoded SP-02!
  assert.match(check.reason, /PR-04/);
  assert.match(check.reason, /SP-05/);
});

// 9. Structured Returns & Dynamic Damage Lifecycle
test("Structured Return of PR-04 (Damaged) dynamically transitions it to 'In repair'", () => {
  // Return PR-04 with damage
  core.executeReturn(state, 402, "PR-04", "Kabir Sen", "Damaged", "Send to Workshop");
  // Return SP-05 in Good condition
  core.executeReturn(state, 403, "SP-05", "Kabir Sen", "Good", "Returned to shelf (Bin B2)");

  const l402 = state.loans.find((l) => l.num === 402);
  const l403 = state.loans.find((l) => l.num === 403);
  const l404 = state.loans.find((l) => l.num === 404);

  assert.strictEqual(l402.back, true);
  assert.strictEqual(l402.returnRecord.condition, "Damaged");
  assert.strictEqual(l403.back, true);
  assert.strictEqual(l404.back, false); // AD-12 remains outstanding!

  // Dynamic status verification: PR-04 is now "In repair", NOT "On shelf"!
  assert.strictEqual(core.getAssetStatus(state, "PR-04"), "In repair");
  assert.strictEqual(core.getAssetStatus(state, "SP-05"), "On shelf");
});

// 10. Custody Transfer History Preservation
test("Custody Transfer preserves originalBorrower while updating current custodian and history", () => {
  core.executeCustodyTransfer(state, 404, "Leela Das", "Sat 9 am", "Leela returning adapter at 9 am");

  const l404 = state.loans.find((l) => l.num === 404);
  assert.strictEqual(l404.who, "Leela Das"); // Current custodian
  assert.strictEqual(l404.originalBorrower, "Kabir Sen"); // Original collector preserved!
  assert.strictEqual(l404.custodyHistory.length, 1);
  assert.strictEqual(l404.custodyHistory[0].from, "Kabir Sen");
  assert.strictEqual(l404.custodyHistory[0].to, "Leela Das");
});

// 11. Physical Unit Disambiguation & Full Reconciliation
test("Reconciliation strictly rejects wrong tag (AD-15) and verifies correct tag (AD-12)", () => {
  // Shift Gate allows morning advance
  assert.strictEqual(core.canAdvanceShift(state).allowed, true);
  state.phase = 2; // Saturday 9:00 am

  // Precise morning query matches only Film Society adapter
  const morningLoan = core.getMorningOutstandingLoan(state);
  assert.notStrictEqual(morningLoan, null);
  assert.strictEqual(morningLoan.num, 404);
  assert.strictEqual(morningLoan.asset, "AD-12");

  // Attempt to close with wrong physical tag AD-15
  assert.throws(() => {
    core.executeReturn(state, 404, "AD-15", "Leela Das", "Good", "Returned to shelf (Bin C4)");
  }, /Physical Tag Mismatch/);

  // Successfully reconcile with verified physical tag AD-12
  const reconciled = core.executeReturn(state, 404, "AD-12", "Leela Das", "Good", "Returned to shelf (Bin C4)");
  assert.strictEqual(reconciled.back, true);
  assert.strictEqual(reconciled.returnRecord.verifiedAssetTag, "AD-12");

  // Film Society request RQ-214 is 100% reconciled and closed
  const outstandingFilm = state.loans.filter((l) => l.req === "RQ-214" && !l.back);
  assert.strictEqual(outstandingFilm.length, 0);

  // Debate Union microphone remains outstanding
  const outstandingDebate = state.loans.filter((l) => l.req === "RQ-209" && !l.back);
  assert.strictEqual(outstandingDebate.length, 1);
  assert.strictEqual(outstandingDebate[0].asset, "MI-09");

  // Audit log contains complete immutable event trail
  assert.strictEqual(state.events.length >= 7, true);
});

console.log("\n--------------------------------------------------------");
console.log(`  🎉 ALL 11/11 PRODUCTION INVARIANT CHECKS PASSED!      `);
console.log("--------------------------------------------------------\n");
