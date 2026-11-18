/**
 * Campus Stores - Core Domain & Business Logic Engine
 * 
 * Centralized, pure domain module shared by both the browser client (app.js)
 * and the Node.js test runner (test-shift.js).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CampusStoresCore = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const requests = [
    {
      id: "RQ-214",
      club: "Film Society",
      event: "Courtyard screening",
      owner: "Isha Rao",
      due: "Fri 8 pm",
      items: ["HDMI projector", "Portable speaker", "USB-C → HDMI adapter"],
      note: "Playback is from a USB-C-only laptop. The host will collect at 4 pm.",
    },
    {
      id: "RQ-209",
      club: "Debate Union",
      event: "Finals rehearsal",
      owner: "Tara Shah",
      due: "Sat 10 am",
      items: ["Wireless microphone"],
      note: "Rehearsal runs into the evening.",
    },
    {
      id: "RQ-217",
      club: "Photo Circle",
      event: "Street portrait walk",
      owner: "Dev Menon",
      due: "Sat noon",
      items: ["Digital camera"],
      note: "Collection on Saturday morning.",
    },
  ];

  const assets = [
    { id: "PR-04", type: "HDMI projector", model: "BenQ MH550", bin: "A2" },
    {
      id: "PR-06",
      type: "HDMI projector",
      model: "Epson EB-X49",
      bin: "Workshop",
      repair: true,
    },
    { id: "SP-02", type: "Portable speaker", model: "JBL Eon One", bin: "B1" },
    { id: "SP-05", type: "Portable speaker", model: "Bose S1", bin: "B2" },
    {
      id: "AD-12",
      type: "USB-C → HDMI adapter",
      model: "Belkin AVC002",
      bin: "C4",
    },
    {
      id: "AD-15",
      type: "USB-C → HDMI adapter",
      model: "Anker A8312",
      bin: "C4",
    },
    { id: "MI-09", type: "Wireless microphone", model: "Shure BLX", bin: "B3" },
    { id: "CA-03", type: "Digital camera", model: "Sony A6400", bin: "D2" },
  ];

  const people = [
    "Isha Rao",
    "Kabir Sen",
    "Leela Das",
    "Tara Shah",
    "Dev Menon",
  ];

  const shifts = [
    {
      time: "Friday · 3:45 pm",
      title: "Pickup at the counter",
      text: "Kabir is here for the Film Society screening. The film starts at four. Can he leave with everything he needs?",
      next: "Move to return time",
    },
    {
      time: "Friday · 7:30 pm",
      title: "The kit comes back in pieces",
      text: "Kabir has brought back the projector and speaker. “Leela still has the adapter. She’ll drop it off tomorrow at nine.” Take the return and hand over to the morning shift.",
      next: "Move to next morning",
    },
    {
      time: "Saturday · 9:00 am",
      title: "Morning shift",
      text: "You’ve just taken over. Leela walks in with an adapter. Work out what was outstanding from the screening and close the loan for the right item.",
    },
  ];

  function getAsset(id) {
    return assets.find((a) => a.id === id);
  }

  function getReq(id) {
    return requests.find((r) => r.id === id);
  }

  function isAssetOut(state, assetId) {
    return state.loans.some((l) => l.asset === assetId && !l.back);
  }

  function isAssetInRepair(state, assetId) {
    const a = getAsset(assetId);
    if (!a) return true;
    if (a.repair) return true;
    return Array.isArray(state.damagedAssets) && state.damagedAssets.includes(assetId);
  }

  function getAssetStatus(state, assetId) {
    if (isAssetInRepair(state, assetId)) return "In repair";
    if (isAssetOut(state, assetId)) return "On loan";
    return "On shelf";
  }

  function createInitialState() {
    return {
      version: 2,
      tab: "Requests",
      phase: 0,
      selected: "",
      filter: "All items",
      damagedAssets: [],
      loans: [
        {
          num: 401,
          req: "RQ-209",
          asset: "MI-09",
          originalBorrower: "Tara Shah",
          who: "Tara Shah",
          due: "Sat 10 am",
          back: false,
          custodyHistory: [],
        },
      ],
      notes: [],
      events: [
        {
          id: "EVT-100",
          type: "INITIAL_LOAN",
          asset: "MI-09",
          loanNum: 401,
          actor: "Tara Shah",
          time: "Friday · 3:30 pm",
        },
      ],
      editing: false,
      reassigning: null,
      returningLoan: null,
      onlyOpen: true,
      notice: "Sample shift · All records are fictional.",
    };
  }

  /**
   * Two-Stage Atomic Kit Checkout Validation
   */
  function validateKitCheckout(state, reqId, who, due, chosenUnits) {
    const r = getReq(reqId);
    if (!r) return { ok: false, error: "Request not found." };
    if (!people.includes(who)) return { ok: false, error: "Borrower must be a registered person." };
    if (!due || typeof due !== "string") return { ok: false, error: "Due date is required." };

    const selectedAssetIds = new Set();
    const validatedItems = [];

    for (const itemType of r.items) {
      // Check if this type is already on active loan for this request
      const alreadyLoaned = state.loans.some(
        (l) => l.req === reqId && !l.back && getAsset(l.asset).type === itemType,
      );
      if (alreadyLoaned) continue;

      const assetId = chosenUnits[itemType];
      if (!assetId) {
        return { ok: false, error: `No physical unit selected for ${itemType}.` };
      }

      const unit = getAsset(assetId);
      if (!unit) {
        return { ok: false, error: `Asset ID "${assetId}" does not exist.` };
      }

      // Explicit type verification
      if (unit.type !== itemType) {
        return {
          ok: false,
          error: `Unit ${assetId} (${unit.type}) does not match required type "${itemType}".`,
        };
      }

      // Explicit in-repair check (no silent substitution)
      if (isAssetInRepair(state, unit.id)) {
        return {
          ok: false,
          error: `Unit ${assetId} (${unit.model}) is currently in repair and cannot be issued.`,
        };
      }

      // Availability check
      if (isAssetOut(state, unit.id)) {
        return {
          ok: false,
          error: `Unit ${assetId} (${unit.model}) is already on loan.`,
        };
      }

      // Duplicate asset check in same submission
      if (selectedAssetIds.has(unit.id)) {
        return {
          ok: false,
          error: `Duplicate selection: Unit ${assetId} cannot be issued twice.`,
        };
      }
      selectedAssetIds.add(unit.id);

      validatedItems.push({ itemType, unit });
    }

    if (validatedItems.length === 0) {
      return { ok: false, error: "All items for this request are already checked out." };
    }

    return { ok: true, validatedItems };
  }

  /**
   * Two-Stage Atomic Kit Checkout Execution
   */
  function executeKitCheckout(state, reqId, who, due, chosenUnits) {
    const validation = validateKitCheckout(state, reqId, who, due, chosenUnits);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    let nextNum = Math.max(...state.loans.map((l) => l.num), 400);
    const createdSlips = [];
    const eventTime = shifts[state.phase] ? shifts[state.phase].time : "Current shift";

    for (const item of validation.validatedItems) {
      nextNum++;
      const slip = {
        num: nextNum,
        req: reqId,
        asset: item.unit.id,
        originalBorrower: who,
        who: who,
        due: due,
        back: false,
        custodyHistory: [],
      };
      state.loans.push(slip);

      state.events.push({
        id: "EVT-" + nextNum + "-" + Date.now().toString(36),
        type: "ASSET_ISSUED",
        asset: item.unit.id,
        loanNum: nextNum,
        req: reqId,
        actor: who,
        time: eventTime,
      });

      createdSlips.push(slip);
    }

    return createdSlips;
  }

  /**
   * Dynamic Shift Gate Validation
   */
  function canAdvanceShift(state) {
    if (state.phase === 0) {
      const r = getReq("RQ-214");
      if (!r) return { allowed: true };
      const filmLoans = state.loans.filter((l) => l.req === "RQ-214" && !l.back);
      const checkedOutTypes = new Set(filmLoans.map((l) => getAsset(l.asset).type));
      const allCheckedOut = r.items.every((itemType) => checkedOutTypes.has(itemType));

      if (!allCheckedOut) {
        return {
          allowed: false,
          reason: "Film Society kit (RQ-214) has not been issued yet. Issue the kit to Kabir Sen before moving to evening return.",
        };
      }
    }

    if (state.phase === 1) {
      const filmLoans = state.loans.filter((l) => l.req === "RQ-214");
      const projLoan = filmLoans.find((l) => getAsset(l.asset).type === "HDMI projector");
      const speakerLoan = filmLoans.find((l) => getAsset(l.asset).type === "Portable speaker");
      const adapterLoan = filmLoans.find((l) => getAsset(l.asset).type === "USB-C → HDMI adapter");

      if (!projLoan || !projLoan.back || !speakerLoan || !speakerLoan.back) {
        const projId = projLoan ? projLoan.asset : "projector";
        const spId = speakerLoan ? speakerLoan.asset : "speaker";
        return {
          allowed: false,
          reason: `Record the return of projector (${projId}) and speaker (${spId}) from Kabir Sen before moving to morning shift.`,
        };
      }

      if (adapterLoan && !adapterLoan.back && adapterLoan.who !== "Leela Das") {
        return {
          allowed: false,
          reason: `Reassign adapter (${adapterLoan.asset} · Slip L-${adapterLoan.num}) custody to Leela Das (Due Sat 9 am) before morning handover.`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Centralized Physical Asset Return Validation
   */
  function validateReturn(state, loanNum, presentedTag, returnedBy, condition, disposition) {
    const l = state.loans.find((x) => x.num === Number(loanNum));
    if (!l) return { ok: false, error: `Slip L-${loanNum} not found.` };
    if (l.back) return { ok: false, error: `Slip L-${loanNum} has already been returned.` };

    if (!presentedTag || typeof presentedTag !== "string") {
      return { ok: false, error: "Physical asset tag is required for verification." };
    }

    const cleanPresented = presentedTag.trim().toUpperCase();
    const cleanExpected = l.asset.trim().toUpperCase();
    if (cleanPresented !== cleanExpected) {
      const expectedUnit = getAsset(l.asset);
      const expectedModel = expectedUnit ? expectedUnit.model : "Unknown";
      const presentedUnit = getAsset(cleanPresented);
      const presentedModel = presentedUnit ? presentedUnit.model : "Unknown unit";
      return {
        ok: false,
        error: `Physical Tag Mismatch! Presented hardware tag is "${cleanPresented}" (${presentedModel}), but Slip L-${l.num} was issued for "${cleanExpected}" (${expectedModel}). Do NOT accept the wrong physical asset.`,
      };
    }

    if (!returnedBy || typeof returnedBy !== "string") {
      return { ok: false, error: "Returner identity is required." };
    }

    if (!["Good", "Damaged"].includes(condition)) {
      return { ok: false, error: "Invalid equipment condition specified." };
    }

    return { ok: true, loan: l };
  }

  /**
   * Centralized Physical Asset Return Execution
   */
  function executeReturn(state, loanNum, presentedTag, returnedBy, condition, disposition) {
    const validation = validateReturn(state, loanNum, presentedTag, returnedBy, condition, disposition);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    const l = validation.loan;
    const eventTime = shifts[state.phase] ? shifts[state.phase].time : "Current shift";
    const assetObj = getAsset(l.asset);

    l.back = true;
    l.returnRecord = {
      returnedAt: eventTime,
      returnedBy: returnedBy.trim(),
      condition,
      disposition:
        disposition ||
        (condition === "Damaged"
          ? "Send to Workshop"
          : `Returned to shelf (Bin ${assetObj ? assetObj.bin : "General"})`),
      verifiedAssetTag: presentedTag.trim().toUpperCase(),
    };

    if (condition === "Damaged" || (disposition && disposition.includes("Workshop"))) {
      if (!Array.isArray(state.damagedAssets)) state.damagedAssets = [];
      if (!state.damagedAssets.includes(l.asset)) {
        state.damagedAssets.push(l.asset);
      }
    }

    state.events.push({
      id: "EVT-" + l.num + "-" + Date.now().toString(36),
      type: "ASSET_RETURNED",
      asset: l.asset,
      loanNum: l.num,
      returnedBy: returnedBy.trim(),
      condition,
      disposition: l.returnRecord.disposition,
      time: eventTime,
    });

    return l;
  }

  /**
   * Custody Transfer with Original Borrower Preservation
   */
  function executeCustodyTransfer(state, loanNum, newCustodian, newDue, noteText) {
    const l = state.loans.find((x) => x.num === Number(loanNum));
    if (!l || l.back) throw new Error("Cannot transfer inactive loan: L-" + loanNum);
    if (!people.includes(newCustodian)) throw new Error("Invalid custodian: " + newCustodian);

    const oldCustodian = l.who;
    if (!l.originalBorrower) l.originalBorrower = oldCustodian;
    if (!l.custodyHistory) l.custodyHistory = [];

    const eventTime = shifts[state.phase] ? shifts[state.phase].time : "Current shift";

    l.custodyHistory.push({
      from: oldCustodian,
      to: newCustodian,
      time: eventTime,
      note: noteText || "",
    });

    l.who = newCustodian;
    l.due = newDue || l.due;

    if (noteText) {
      state.notes.push({
        phase: state.phase,
        text: `Slip L-${l.num} (${l.asset}) custody transferred from ${oldCustodian} to ${newCustodian} (Due ${l.due}). Note: ${noteText}`,
      });
    }

    state.events.push({
      id: "EVT-CUSTODY-" + l.num + "-" + Date.now().toString(36),
      type: "CUSTODY_TRANSFERRED",
      asset: l.asset,
      loanNum: l.num,
      from: oldCustodian,
      to: newCustodian,
      time: eventTime,
    });

    return l;
  }

  /**
   * Precise Morning Handover Query
   */
  function getMorningOutstandingLoan(state) {
    if (state.phase !== 2) return null;
    return (
      state.loans.find(
        (l) =>
          l.req === "RQ-214" &&
          !l.back &&
          getAsset(l.asset) &&
          getAsset(l.asset).type === "USB-C → HDMI adapter",
      ) || null
    );
  }

  return {
    requests,
    assets,
    people,
    shifts,
    getAsset,
    getReq,
    isAssetOut,
    isAssetInRepair,
    getAssetStatus,
    createInitialState,
    validateKitCheckout,
    executeKitCheckout,
    canAdvanceShift,
    validateReturn,
    executeReturn,
    executeCustodyTransfer,
    getMorningOutstandingLoan,
  };
});
