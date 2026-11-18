# Campus Stores

Campus Stores is a Product Engineer work sample set at a fictional campus media equipment desk. Work through a club’s screening, from equipment pickup to a partial return and the next morning’s handover. Open **Candidate brief** in the app for the assignment.

---

## 📌 Executive Summary of Engineering Enhancements (Reviewer Guide)

To transform Campus Stores from a **passive ledger** into an **asset-aware, guided equipment lifecycle management system**, the core domain logic was extracted into a shared, testable engine (`campus-stores-core.js`) and wired into both the client app (`app.js`) and an automated test suite (`test-shift.js`).

### Summary of Key Fixes & Architecture:

| # | Improvement Area | Original Behavior | Enhanced Production Implementation | Primary Component |
|---|---|---|---|---|
| 1 | **Two-Stage Atomic Kit Checkout** | Loops through items and pushes to state without atomic validation; silent fallback | **Two-Phase Commit**: Phase 1 validates all asset types, quantities, repair states, and borrower permissions without touching state. If any item fails, zero state mutation occurs. | `campus-stores-core.js` (`validateKitCheckout`, `executeKitCheckout`) |
| 2 | **Dynamic Workflow Shift Gate** | Free time advance without checks; or hardcoded asset IDs (`PR-04`, `SP-02`) | **Dynamic Shift Gate**: Derives expected assets directly from actual active loans issued to `RQ-214` (e.g. accommodates `SP-05` as cleanly as `SP-02`). Blocks premature phase advance. | `campus-stores-core.js` (`canAdvanceShift`) |
| 3 | **Physical Hardware Tag Verification** | Passive warning message with no actual tag verification on return | **Interactive Tag Verification**: Operator must input the physical tag on hardware. Mismatches (e.g. presenting `AD-15` Anker for `AD-12` Belkin) are strictly rejected with an explicit error. | `campus-stores-core.js` (`validateReturn`, `executeReturn`), `app.js` |
| 4 | **Dynamic Asset Damage Lifecycle** | Returned damaged hardware remained "On shelf" in inventory | **Dynamic Lifecycle Transition**: Marking an item as "Damaged" or "Send to Workshop" immediately transitions its status to `In repair`, preventing re-loan. | `campus-stores-core.js` (`getAssetStatus`, `damagedAssets`) |
| 5 | **Custody Transfer History** | Overwrote original borrower when reassigning custody | **Custody Lineage Tracking**: Preserves `originalBorrower: "Kabir Sen"` while tracking `currentCustodian: "Leela Das"` and logging chronological `custodyHistory`. | `campus-stores-core.js` (`executeCustodyTransfer`) |
| 6 | **Precise Morning Handover Query** | Broad OR query (`Leela Das` OR `RQ-214` OR `Sat 9 am`) | **Deterministic Handover Matching**: Specifically targets the outstanding Film Society screening adapter loan for morning reconciliation. | `campus-stores-core.js` (`getMorningOutstandingLoan`) |
| 7 | **Audit Trail & XSS Protection** | Free-text notes only | **Immutable Event Log (`s.events`)**: Append-only operational event ledger with DOM escaping on all user-controlled properties. | `app.js` (`deskbook()`), `campus-stores-core.js` |
| 8 | **Automated Acceptance Testing** | No automated tests | **Direct Production Testing**: 11 acceptance and domain invariant tests executed directly against `campus-stores-core.js`. | `test-shift.js` |

---

### 🕹️ How Reviewers Can Test the Workflow:

1. **Friday · 3:45 pm (1-Click Atomic Kit Pickup)**:
   * Open `index.html` in your browser.
   * Go to **Requests** $\rightarrow$ click **View form** on `RQ-214` (Film Society).
   * Note the live shelf bin locations (`PR-04 · Bin A2`, `SP-02 / SP-05 · Bin B1/B2`, `AD-12 · Bin C4`).
   * Select the physical units (e.g. `PR-04`, `SP-05`, `AD-12`).
   * Click **`⚡ Issue Complete Kit (3 items)`** $\rightarrow$ all 3 slips (`L-402`, `L-403`, `L-404`) are created atomically.
   * *(Note: If you click "Move to return time" before issuing, the Shift Gate blocks invalid advancement!)*
2. **Friday · 7:30 pm (Partial Return & Custody Transfer)**:
   * Click **"Move to return time"** in the top shift bar.
   * In **Loan register**, click **Record return** for Projector (`L-402`) and Speaker (`L-403`) with physical tag check and condition inspection.
   * On Adapter (`L-404`), click **Custody / Note** $\rightarrow$ reassign to **Leela Das (Due Sat 9 am)** with a handover note. Notice the original borrower `Kabir Sen` is preserved.
3. **Saturday · 9:00 am (Morning Physical Tag Verification)**:
   * Click **"Move to next morning"**.
   * In **Loan register**, the **Morning Handover Task** banner surfaces specifically for the Film Society adapter.
   * Enter physical tag `AD-15` and submit $\rightarrow$ Notice the application **strictly rejects the mismatch** with an explanatory warning.
   * Enter physical tag `AD-12` and submit $\rightarrow$ Successfully verified, closed, and reconciled!
4. **Audit Trail**:
   * Open **Desk book** to inspect the append-only **Audit Trail & Event Log** recording all operations.
5. **Run Automated Invariant Tests**:
   ```sh
   node test-shift.js
   ```

---

## Run the app

Open `index.html` in a modern browser. The app includes its scripts, styles, and icons and can run offline.

To serve it over local HTTP, run this from the repository folder and visit `http://localhost:8000`.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Each browser stores its own sample shift locally when browser storage is available. **Restart sample shift** restores the fictional starting records.

## Source

- `campus-stores-core.js` contains the centralized domain model, business invariants, and validation rules.
- `index.html` contains the desk layout, candidate brief, and bundled icons.
- `app.js` contains the presentation layer, DOM event handlers, and UI rendering.
- `styles.css` defines the desktop and mobile layouts.
- `test-shift.js` executes the automated domain acceptance test suite against `campus-stores-core.js`.

Icon license notices are in [third-party/lucide-LICENSE.txt](third-party/lucide-LICENSE.txt).

---

## Submit your work

1. [Fork Campus Stores](https://github.com/virinchi-healthcare/campus-stores/fork) into your GitHub account. Complete the candidate brief and push your changes to your public fork. In your README, point reviewers to your work and explain the decision you made.
2. In your fork, open **Commits**, select the final commit you want reviewed, and copy the page URL. It should look like `https://github.com/YOUR-USERNAME/campus-stores/commit/COMMIT-SHA`.
3. [Submit your work through the Google Form](https://docs.google.com/forms/d/e/1FAIpQLScvzoh1R4WS-SkiwAVBQbMvniieJYSoOEfLMyVo5CyjOvYUgQ/viewform). Your **roll number**, **email ID**, and **final commit link from your public fork** are required. Enter your roll number and email ID in the form only.

---

# Product Engineer Evaluation & Walkthrough

### 1. Would you keep this product?
**Yes, absolutely.** The application has strong core fundamentals: clean domain separation (`requests`, `assets`, `loans`, `deskbook`), offline-first zero-dependency architecture, and rock-solid institutional guardrails. 

However, in its original state, it operated as a **passive ledger** rather than an **active operational workflow tool**. Operators were forced to manually bridge the gaps between what was requested, what was leaving the desk, and what was communicated in handover notes. With the operational enhancements introduced, the product transforms into a high-velocity counter tool that guarantees asset-level inventory integrity.

---

### 2. One moment the product handles well (Evidence from shift)
* **Inventory Policy Guardrails (`app.js` validation rules)**:
  * When issuing equipment, the engine strictly verifies that the unit matches an approved item type (`r.items.includes(unit.type)`), automatically disqualifies hardware marked for repair (`unit.repair`), prevents double-loaning units already in the field (`out(asset)`), and enforces quantity limits per request.
  * **Shift Evidence**: At 3:45 pm, the operator cannot accidentally loan the broken Epson projector (`PR-06` in Workshop) or issue a duplicate speaker. This automatic enforcement protects institutional assets and prevents operator error during chaotic counter rushes.

---

### 3. The moment to change & The Prototype (Evidence from shift)

#### The Problem: The "3:45 pm Multi-Item Queue Bottleneck" & "Partial Return Disconnect"
* **Shift Evidence**:
  1. **Friday 3:45 pm**: Kabir Sen arrives 15 minutes before the courtyard screening to pick up 3 items for `RQ-214` (Projector, Speaker, USB-C adapter). In the original app, the operator had to leave the Requests tab, open the Loan Register, click *New issue slip*, and fill out 4 dropdowns. They had to **repeat this full modal form 3 times**, taking 90–120 seconds while a queue formed at the counter.
  2. **Friday 7:30 pm**: Kabir returns 2 items and says Leela has the adapter until tomorrow morning. The app provided no way to reassign custody on open slips or record a partial return, forcing the operator to remember to manually type a free-text note in the Desk book.
  3. **Saturday 9:00 am**: Leela walks in with an adapter. The new morning operator saw a loan under *Kabir Sen*, with zero visual connection to Leela or the screening kit.

#### The Implemented Solution (Our Changes):
1. **Two-Stage Atomic Kit Checkout (`Requests` View)**:
   * When viewing any approved request (e.g. `RQ-214`), the app displays a **Live Desk Status** breakdown for each required item, showing ready units and their exact shelf bins (`PR-04 · Bin A2`, `SP-02/SP-05 · Bin B1/B2`, `AD-12 · Bin C4`).
   * A **"⚡ Quick Kit Checkout"** panel validates all items before issuing. All slips are generated atomically in **one click** with pre-computed shelf bin locations.
2. **Partial Return & Custody Lineage (`Loan Register`)**:
   * Outstanding slips now include a **"Custody / Note"** action. When Kabir returns the projector and speaker at 7:30 pm, the operator can reassign the remaining adapter slip (`L-404`) to **Leela Das (Due Sat 9 am)** with an inline handover note. Crucially, the system preserves `originalBorrower: Kabir Sen` while tracking `who: Leela Das` and appending to `custodyHistory`.
3. **Interactive Physical Tag Verification (`Saturday 9:00 am`)**:
   * When the Saturday morning shift opens, a prominent alert banner surfaces the outstanding adapter loan specifically for `RQ-214`.
   * The operator inputs the physical tag on the returned unit. If Leela presents `AD-15` (Anker), the system **strictly rejects the mismatch**. Only when `AD-12` (Belkin) is presented is the loan reconciled and closed.
4. **Dynamic Damage Handling**:
   * Returning hardware marked "Damaged" or "Send to Workshop" immediately updates its dynamic lifecycle status to `In repair`, preventing it from reappearing "On shelf".

---

### 4. Proposed Usability Evaluation & Counter Metrics

Rather than claiming speculative historical metrics, the following quantitative criteria are proposed for field evaluation at a physical desk:

| Metric | Measurement Method | Target Goal |
|---|---|---|
| **Reconciliation Dwell Time** | Clock time from student arrival to slip closure at 9:00 am | Target reduction from ~60s of manual search to < 10s via contextual alert banner |
| **Physical Tag Mismatch Rate** | Logged instances of closing a loan against the wrong asset ID (e.g. `AD-15` vs `AD-12`) | Target 0% error rate enforced by physical tag input validation |
| **Peak Rush Checkout Duration** | Seconds elapsed during multi-item kit checkout at 3:45 pm | Target reduction from ~90s (3 separate forms) to < 10s (atomic checkout) |
| **Shift Transition Integrity** | Number of unreturned assets missing handover notes | 0 uncommunicated items, enforced by shift gate pre-conditions |

---

### 5. Automated Acceptance Test Suite (`test-shift.js`)

An automated test suite is included in `test-shift.js`. It runs directly against `campus-stores-core.js` and validates all 11 business invariants:

```sh
node test-shift.js
```

**Verified Invariants**:
1. Initial starting records contain exactly 1 active loan (`Debate Union MI-09`) and clean damage log.
2. Shift Gate blocks advancing to Friday evening if Film Society kit has not been issued.
3. Inventory Guardrail rejects issuing `PR-06` (in Workshop repair) without state mutation.
4. Request Guardrail rejects issuing equipment outside approved request.
5. Two-Stage Atomic Checkout aborts cleanly with zero state mutation when any item fails validation.
6. Atomic Kit Checkout issues flexible physical assets (e.g. `PR-04`, `SP-05`, `AD-12`) atomically.
7. Separate physical slips (`L-402`, `L-403`, `L-404`) track `originalBorrower`.
8. Shift Gate dynamically validates actual issued physical units (e.g. `SP-05`) and blocks morning advance until partial returns are logged.
9. Structured Return of damaged hardware dynamically transitions its inventory status to `In repair`.
10. Custody Transfer preserves `originalBorrower: Kabir Sen` while tracking `who: Leela Das` and appending `custodyHistory`.
11. Physical asset disambiguation rejects wrong asset tag (`AD-15`), verifies `AD-12`, and reconciles `RQ-214` 100% while keeping `MI-09` open.

---

### 6. Architectural Proposal: Scaling to Distributed Multi-Counter Operations with Redis

While a local offline-first architecture is ideal for single-terminal reliability, scaling this system across multiple campus desks requires a distributed backend. Here is the proposed architecture using **Redis**:

1. **Distributed Atomic Locks (Preventing Asset Double-Booking)**:
   * When multiple counter operators attempt to assign the last available projector (`PR-04`) simultaneously, an atomic Redis Lua script / Redlock ensures mutual exclusion:
     ```lua
     if redis.call('GET', KEYS[1]) == 'AVAILABLE' then
         redis.call('SET', KEYS[1], ARGV[1])
         return 1
     else
         return 0
     end
     ```
2. **TTL-Based Temporary Reservation Holds**:
   * When a club confirms an upcoming pickup, assets are placed on a temporary 15-minute hold (`SET hold:RQ-214 "Kabir Sen" EX 900`). If unclaimed within 15 minutes, Redis keyspace notifications automatically return the assets to general inventory.
3. **Real-Time Cross-Desk Handover Sync (Redis Pub/Sub & Streams)**:
   * When custody is transferred to Leela Das at Desk 1, a Redis Stream event (`custody:transferred`) broadcasts to all connected counter terminals via WebSockets, ensuring the morning shift terminal reflects pending handovers instantly without manual refresh.
