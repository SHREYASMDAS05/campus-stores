(() => {
  "use strict";

  const core = (typeof CampusStoresCore !== "undefined") ? CampusStoresCore : null;
  if (!core) {
    console.error("CampusStoresCore engine failed to load.");
    return;
  }

  const {
    requests,
    assets,
    people,
    shifts,
    getAsset,
    getReq,
    createInitialState,
    validateKitCheckout,
    executeKitCheckout,
    canAdvanceShift,
    validateReturn,
    executeReturn,
    executeCustodyTransfer,
    getMorningOutstandingLoan,
  } = core;

  const storageKey = "campus-stores.shift.v2";
  const root = document.getElementById("campus-stores");
  const q = (selector) => root.querySelector(selector);

  const pages = [
    ["Requests", "clipboard-list"],
    ["Inventory", "package"],
    ["Loan register", "book-open"],
    ["Desk book", "messages-square"],
  ];

  let s = createInitialState();

  const out = (id) => core.isAssetOut(s, id);
  const inRepair = (id) => core.isAssetInRepair(s, id);

  const esc = (x) =>
    String(x == null ? "" : x).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  const opts = (list) =>
    list
      .map(([v, t]) => '<option value="' + esc(v) + '">' + esc(t) + "</option>")
      .join("");

  const btn = (label, act, val = "", style = "") =>
    '<button type="button" data-action="' +
    act +
    '" data-val="' +
    esc(val) +
    '" class="' +
    style +
    '">' +
    esc(label) +
    "</button>";

  const head = (title, sub, control = "") =>
    '<div class="sectionhead"><div><h2>' +
    title +
    "</h2><small>" +
    sub +
    "</small></div>" +
    control +
    "</div>";

  const row = (label, sub, right) =>
    '<div class="row"><div><strong>' +
    esc(label) +
    "</strong><small>" +
    esc(sub) +
    "</small></div><div>" +
    right +
    "</div></div>";

  const badge = (t, good = false) =>
    '<span class="tag' + (good ? " good" : "") + '">' + esc(t) + "</span>";

  function requestPage() {
    let html = head(
      "Approved requests",
      "Student Activities Office · 3 approved forms",
    );
    if (s.selected) {
      const r = getReq(s.selected);
      // Analyze live desk fulfillment status for each requested item
      const itemStatus = r.items.map((itemType) => {
        const activeLoan = s.loans.find(
          (l) => l.req === r.id && !l.back && getAsset(l.asset).type === itemType,
        );
        const returnedLoan = s.loans.find(
          (l) => l.req === r.id && l.back && getAsset(l.asset).type === itemType,
        );
        const availableUnit = assets.find(
          (a) => a.type === itemType && !inRepair(a.id) && !out(a.id),
        );
        return { itemType, activeLoan, returnedLoan, availableUnit };
      });

      const unissuedItems = itemStatus.filter(
        (x) => !x.activeLoan && !x.returnedLoan,
      );
      const allIssued = unissuedItems.length === 0;

      html +=
        btn("← Back to list", "close") +
        '<div class="record"><small>' +
        esc(r.id) +
        " · Approved</small><h3>" +
        esc(r.event) +
        "</h3><p>" +
        esc(r.club) +
        " · Filed by " +
        esc(r.owner) +
        "</p><p><b>Return by</b> " +
        esc(r.due) +
        "</p><p style='margin-top:8px;'><b>Approved equipment & live desk status:</b></p><div class='kit-items-list'>" +
        itemStatus
          .map((x) => {
            let statusBadge = "";
            let binInfo = "";
            if (x.activeLoan) {
              statusBadge = badge("On loan · Slip L-" + x.activeLoan.num, false);
              binInfo =
                "<small class='muted'>Held by " +
                esc(x.activeLoan.who) +
                (x.activeLoan.originalBorrower && x.activeLoan.originalBorrower !== x.activeLoan.who
                  ? " (originally " + esc(x.activeLoan.originalBorrower) + ")"
                  : "") +
                " · Due " +
                esc(x.activeLoan.due) +
                " (" +
                esc(x.activeLoan.asset) +
                ")</small>";
            } else if (x.returnedLoan) {
              statusBadge = badge("Returned · Slip L-" + x.returnedLoan.num, true);
              binInfo =
                "<small class='muted'>Returned to stock (" +
                esc(x.returnedLoan.asset) +
                ")</small>";
            } else if (x.availableUnit) {
              statusBadge = badge("Ready in Bin " + x.availableUnit.bin, true);
              binInfo =
                "<small class='muted'>Unit " +
                esc(x.availableUnit.id) +
                " (" +
                esc(x.availableUnit.model) +
                ")</small>";
            } else {
              statusBadge = badge("Unavailable", false);
              binInfo = "<small class='muted'>No units ready in stock</small>";
            }
            return (
              "<div class='kit-item-row'><div><strong>" +
              esc(x.itemType) +
              "</strong>" +
              binInfo +
              "</div><div>" +
              statusBadge +
              "</div></div>"
            );
          })
          .join("") +
        "</div><p style='margin-top:8px;'><b>Note:</b> " +
        esc(r.note) +
        "</p></div>";

      // If unissued items exist, render Two-Stage Atomic Quick Kit Checkout with unit selection
      if (!allIssued) {
        const defaultCollector = (r.id === "RQ-214") ? "Kabir Sen" : r.owner;
        const unitSelectors = unissuedItems
          .map((x) => {
            const availUnits = assets.filter(
              (a) => a.type === x.itemType && !inRepair(a.id) && !out(a.id),
            );
            if (!availUnits.length) {
              return (
                "<p><small style='color:var(--mark);'>No units available for " +
                esc(x.itemType) +
                "</small></p>"
              );
            }
            return (
              "<label><span>" +
              esc(x.itemType) +
              " physical unit</span><select name='asset_" +
              esc(x.itemType) +
              "'>" +
              availUnits
                .map(
                  (u) =>
                    "<option value='" +
                    esc(u.id) +
                    "'>" +
                    esc(u.id) +
                    " · " +
                    esc(u.model) +
                    " (Bin " +
                    esc(u.bin) +
                    ")</option>",
                )
                .join("") +
              "</select></label>"
            );
          })
          .join("");

        html +=
          "<div class='quick-kit-card'>" +
          "<div class='quick-kit-header'><h4>⚡ Quick Kit Checkout</h4><small>Two-stage atomic checkout</small></div>" +
          "<form data-quick-kit='" +
          esc(r.id) +
          "'>" +
          "<div class='form'>" +
          "<label><span>Collected by</span><select name='who'>" +
          people
            .map(
              (p) =>
                "<option value='" +
                esc(p) +
                "'" +
                (p === defaultCollector ? " selected" : "") +
                ">" +
                esc(p) +
                "</option>",
            )
            .join("") +
          "</select></label>" +
          "<label><span>Return by</span><select name='due'>" +
          ["Fri 8 pm", "Sat 9 am", "Sat 10 am", "Sat noon"]
            .map(
              (d) =>
                "<option value='" +
                esc(d) +
                "'" +
                (d === r.due ? " selected" : "") +
                ">" +
                esc(d) +
                "</option>",
            )
            .join("") +
          "</select></label>" +
          unitSelectors +
          "</div>" +
          "<button type='submit' class='primary' style='margin-top:10px;'>⚡ Issue Complete Kit (" +
          unissuedItems.length +
          " items)</button>" +
          "</form></div>";
      } else {
        html +=
          "<div class='quick-kit-card' style='background: var(--ok); color: var(--oktxt);'>" +
          "<strong>✓ All items for this request have been issued.</strong>" +
          "<div style='margin-top:6px;'>" +
          btn("View active slips in Loan Register →", "tab", "Loan register") +
          "</div></div>";
      }
    } else {
      html += requests
        .map((r) => {
          const activeLoans = s.loans.filter((l) => l.req === r.id && !l.back).length;
          const returnedLoans = s.loans.filter((l) => l.req === r.id && l.back).length;
          const totalItems = r.items.length;
          let summaryBadge = "";
          if (activeLoans === totalItems) {
            summaryBadge = badge("Fully on loan", false);
          } else if (returnedLoans === totalItems) {
            summaryBadge = badge("Completed", true);
          } else if (activeLoans > 0 || returnedLoans > 0) {
            summaryBadge = badge(
              "Partial (" + (activeLoans + returnedLoans) + "/" + totalItems + ")",
              false,
            );
          } else {
            summaryBadge = badge("Ready to issue", true);
          }
          return row(
            r.event,
            r.id + " · " + r.club + " (" + totalItems + " items)",
            "<div class='actions-group'>" + summaryBadge + btn("View form", "request", r.id) + "</div>",
          );
        })
        .join("");
    }
    return html;
  }

  function inventory() {
    let html = head(
      "Inventory",
      "Physical units · home shelf and dynamic lifecycle status",
    );
    html +=
      '<div class="buttons"><label>Show <select data-filter>' +
      opts(
        ["All items", "On shelf", "On loan", "In repair"].map((f) => [f, f]),
      ) +
      "</select></label></div>";
    for (const a of assets) {
      const status = core.getAssetStatus(s, a.id);
      if (s.filter !== "All items" && s.filter !== status) continue;
      html += row(
        a.id + " · " + a.type,
        a.model + " · " + a.bin,
        badge(status, status === "On shelf"),
      );
    }
    return html;
  }

  function register() {
    let html = "";

    // Precise morning handover reconciliation task
    if (s.phase === 2) {
      const morningLoan = getMorningOutstandingLoan(s);
      if (morningLoan) {
        const assetObj = getAsset(morningLoan.asset);
        html +=
          "<div class='handover-banner'>" +
          "<div class='handover-text'>" +
          "<strong>🔔 Morning Handover Task (9:00 am):</strong>" +
          "<span>Leela Das is returning the screening adapter for Film Society (Slip L-" +
          morningLoan.num +
          ").</span>" +
          "<small style='display:block;margin-top:3px;'>Expected Unit: <b>" +
          esc(morningLoan.asset) +
          "</b> (" +
          esc(assetObj.model) +
          " · Bin " +
          esc(assetObj.bin) +
          ")</small>" +
          "<small style='display:block;color:var(--mark);font-weight:600;'>⚠️ Verify Physical Hardware Tag: Enter the tag on the item to reconcile.</small>" +
          "</div>" +
          "<form data-verify-morning class='handover-verify-form' style='margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;'>" +
          "<input type='hidden' name='loanNum' value='" +
          morningLoan.num +
          "'>" +
          "<label style='display:flex; gap:6px; align-items:center; font-size:12px; font-weight:600;'>" +
          "<span>Physical Tag on Hardware:</span>" +
          "<input type='text' name='presentedTag' placeholder='e.g. " +
          esc(morningLoan.asset) +
          "' style='width:95px; text-transform:uppercase;' required>" +
          "</label>" +
          "<button type='submit' class='primary'>Verify Tag & Reconcile Loan</button>" +
          "</form>" +
          "</div>";
      }
    }

    html += head(
      "Loan register",
      "One slip per physical unit",
      s.editing
        ? btn("Cancel", "cancel")
        : btn("New issue slip", "new", "", "primary"),
    );

    if (s.editing) {
      const available = assets.filter((a) => !inRepair(a.id) && !out(a.id));
      const select = (label, key, options) =>
        "<label><span>" +
        label +
        '</span><select name="' +
        key +
        '" required><option value="">Select…</option>' +
        opts(options) +
        "</select></label>";
      return (
        html +
        '<form data-issue><div class="form">' +
        select(
          "Approved request",
          "req",
          requests.map((r) => [r.id, r.id + " · " + r.club]),
        ) +
        select(
          "Unit leaving the desk",
          "asset",
          available.map((a) => [a.id, a.id + " · " + a.type]),
        ) +
        select(
          "Collected by",
          "who",
          people.map((p) => [p, p]),
        ) +
        select(
          "Return by",
          "due",
          ["Fri 8 pm", "Sat 9 am", "Sat 10 am", "Sat noon"].map((d) => [d, d]),
        ) +
        '</div><button type="submit" class="primary">Save issue slip</button></form>'
      );
    }

    html +=
      '<div class="buttons">' +
      ["Outstanding", "All slips"]
        .map(
          (v, i) =>
            '<button type="button" data-action="scope" data-val="' +
            i +
            '" aria-pressed="' +
            (s.onlyOpen === (i === 0)) +
            '">' +
            v +
            "</button>",
        )
        .join("") +
      "</div>";

    const shown = s.loans
      .filter((l) => !s.onlyOpen || !l.back)
      .slice()
      .reverse();

    if (!shown.length) html += "<p>No outstanding slips.</p>";

    for (const l of shown) {
      const isReassigning = s.reassigning === l.num;
      const isReturning = s.returningLoan === l.num;
      let returnRecordBadge = "";

      if (l.back) {
        const rec = l.returnRecord;
        returnRecordBadge =
          badge("Returned", true) +
          (rec
            ? "<small class='muted' style='display:block;margin-top:2px;'>By " +
              esc(rec.returnedBy) +
              " · " +
              esc(rec.condition) +
              " (" +
              esc(rec.disposition) +
              ")</small>"
            : "");
      }

      const rightSide = l.back
        ? returnRecordBadge
        : '<div class="actions-group">' +
          btn("Record return", "start_return", String(l.num)) +
          btn("Custody / Note", "start_reassign", String(l.num)) +
          "</div>";

      const custodianInfo =
        l.originalBorrower && l.originalBorrower !== l.who
          ? " · Held by " + esc(l.who) + " (originally " + esc(l.originalBorrower) + ")"
          : " · " + esc(l.who);

      html += row(
        "L-" + l.num + " · " + l.asset,
        l.req + custodianInfo + " · Due " + l.due,
        rightSide,
      );

      // Return verification form with physical tag check
      if (isReturning) {
        const assetObj = getAsset(l.asset);
        html +=
          "<form data-confirm-return='" +
          l.num +
          "' class='reassign-box'>" +
          "<div style='font-weight:600; margin-bottom:4px;'>Physical Asset Return Verification</div>" +
          "<p><small>Issued Unit: <b>" +
          esc(l.asset) +
          "</b> (" +
          esc(assetObj.type) +
          " · " +
          esc(assetObj.model) +
          ")</small></p>" +
          "<div class='form'>" +
          "<label><span>Verify Physical Hardware Tag</span><input type='text' name='presentedTag' value='" +
          esc(l.asset) +
          "' style='text-transform:uppercase;' placeholder='Enter tag on hardware' required></label>" +
          "<label><span>Returned by</span><select name='returnedBy'>" +
          people
            .map(
              (p) =>
                "<option value='" +
                esc(p) +
                "'" +
                (p === l.who ? " selected" : "") +
                ">" +
                esc(p) +
                "</option>",
            )
            .join("") +
          "</select></label>" +
          "<label><span>Condition</span><select name='condition'><option value='Good'>Good · Working</option><option value='Damaged'>Damaged / Needs Workshop Inspection</option></select></label>" +
          "<label><span>Shelf Destination</span><select name='disposition'><option value='Returned to shelf (Bin " +
          esc(assetObj.bin) +
          ")'>Returned to shelf (Bin " +
          esc(assetObj.bin) +
          ")</option><option value='Send to Workshop'>Send to Workshop</option></select></label>" +
          "</div>" +
          "<div class='actions-group'>" +
          "<button type='submit' class='primary'>Confirm Return & Update Stock</button>" +
          btn("Cancel", "cancel_return") +
          "</div>" +
          "</form>";
      }

      // Custody transfer form preserving original borrower
      if (isReassigning) {
        const defaultNext = (l.who === "Kabir Sen") ? "Leela Das" : people[0];
        const defaultDue = (s.phase >= 1) ? "Sat 9 am" : l.due;
        html +=
          "<form data-reassign='" +
          l.num +
          "' class='reassign-box'>" +
          "<div style='font-weight:600; margin-bottom:4px;'>Transfer Equipment Custody</div>" +
          "<p><small>Original Collector: <b>" +
          esc(l.originalBorrower || l.who) +
          "</b> · Current Custodian: <b>" +
          esc(l.who) +
          "</b></small></p>" +
          "<div class='form'>" +
          "<label><span>Reassign custody to</span><select name='who'>" +
          people
            .map(
              (p) =>
                "<option value='" +
                esc(p) +
                "'" +
                (p === defaultNext ? " selected" : "") +
                ">" +
                esc(p) +
                "</option>",
            )
            .join("") +
          "</select></label>" +
          "<label><span>New return time</span><select name='due'>" +
          ["Fri 8 pm", "Sat 9 am", "Sat 10 am", "Sat noon"]
            .map(
              (d) =>
                "<option value='" +
                esc(d) +
                "'" +
                (d === defaultDue ? " selected" : "") +
                ">" +
                esc(d) +
                "</option>",
            )
            .join("") +
          "</select></label>" +
          "<label class='full'><span>Handover note for Desk book</span><input type='text' name='note' value='Kabir returned kit; Leela holds adapter for morning shift.' required></label>" +
          "</div>" +
          "<div class='actions-group'>" +
          "<button type='submit' class='primary'>Save Custody Transfer</button>" +
          btn("Cancel", "cancel_reassign") +
          "</div>" +
          "</form>";
      }
    }
    return html;
  }

  function deskbook() {
    let html = head(
      "Desk book",
      "Messages from clubs and notes for the next shift",
    );
    const entries = [
      [
        "Friday · 3:20 pm",
        "Isha Rao · Film Society",
        "Kabir Sen is picking up our whole screening kit. Please issue it in his name. I’m setting up in the courtyard.",
      ],
      [
        "Friday · 3:30 pm",
        "Tara Shah · Debate Union",
        "Our microphone stays with me overnight. I’ll return it by 10 am Saturday.",
      ],
    ];
    if (s.phase >= 1)
      entries.push([
        "Friday · 7:30 pm",
        "Kabir Sen · Film Society",
        "I brought the projector and speaker. Leela Das has our adapter. She’ll be at the counter at 9 am tomorrow.",
      ]);
    for (const n of s.notes)
      entries.push([shifts[n.phase].time, "Counter handover", n.text]);

    for (const [t, author, body] of entries.slice().reverse())
      html +=
        '<article class="record"><small>' +
        esc(t) +
        "</small><h3>" +
        esc(author) +
        "</h3><p>" +
        esc(body) +
        "</p></article>";

    html +=
      '<form data-note><div class="form"><label class="full"><span>Note for the next shift</span><textarea name="note" rows="2" maxlength="400" required></textarea></label></div><button type="submit">Add handover note</button></form>';

    // Fully escaped Audit Trail & Event History
    html +=
      '<div class="sectionhead" style="margin-top:24px;border-top:1px solid var(--line);padding-top:14px;"><div><h3>Audit Trail & Event Log</h3><small>Immutable chronological log · ' +
      s.events.length +
      ' events recorded</small></div></div><div class="kit-items-list">' +
      s.events
        .slice()
        .reverse()
        .map(
          (e) =>
            '<div class="kit-item-row"><div><strong>' +
            esc(e.type) +
            (e.asset ? " · " + esc(e.asset) : "") +
            "</strong><small class='muted'>" +
            esc(e.actor || e.returnedBy || "") +
            (e.loanNum ? " (Slip L-" + esc(e.loanNum) + ")" : "") +
            " · " +
            esc(e.time) +
            (e.condition ? " · Condition: " + esc(e.condition) : "") +
            "</small></div><div>" +
            badge(esc(e.id), true) +
            "</div></div>",
        )
        .join("") +
      "</div>";

    return html;
  }

  const screens = {
    Requests: requestPage,
    Inventory: inventory,
    "Loan register": register,
    "Desk book": deskbook,
  };

  function paint() {
    const phase = shifts[s.phase];
    q("[data-clock]").textContent = phase.time;
    q("[data-shift-title]").textContent = phase.title;
    q("[data-shift]").textContent = phase.text;
    const advance = q('[data-action="advance"]');
    advance.hidden = !phase.next;
    advance.textContent = phase.next || "";
    q("[data-nav]").innerHTML = pages
      .map(
        ([n, icon]) =>
          '<button type="button" data-action="tab" data-val="' +
          n +
          '" aria-pressed="' +
          (s.tab === n) +
          '"><svg aria-hidden="true" class="store-icon"><use href="#icon-' +
          icon +
          '"></use></svg>' +
          n +
          "</button>",
      )
      .join("");
    q("[data-page]").innerHTML = screens[s.tab]();
    if (q("[data-filter]")) q("[data-filter]").value = s.filter;
    q("[data-status]").textContent = s.notice;
  }

  function commit(msg) {
    if (msg) s.notice = msg;
    paint();
    try {
      localStorage.setItem(storageKey, core.serializeState(s));
    } catch {
      q("[data-status]").textContent +=
        " Browser storage is unavailable. Progress lasts for this visit.";
    }
  }

  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const v = b.dataset.val;
    switch (b.dataset.action) {
      case "restart":
        s = createInitialState();
        break;
      case "advance": {
        const check = canAdvanceShift(s);
        if (!check.allowed) {
          s.notice = "⚠️ " + check.reason;
          break;
        }
        if (s.phase < 2) s.phase++;
        s.reassigning = null;
        s.returningLoan = null;
        s.events.push({
          id: "EVT-SHIFT-" + Date.now().toString(36),
          type: "SHIFT_ADVANCED",
          time: shifts[s.phase].time,
          actor: "Counter staff",
        });
        s.notice = "Shift advanced to " + shifts[s.phase].time + ".";
        break;
      }
      case "tab":
        s.tab = v;
        s.editing = false;
        s.reassigning = null;
        s.returningLoan = null;
        break;
      case "close":
        s.selected = "";
        break;
      case "request":
        s.selected = v;
        break;
      case "new":
        s.editing = true;
        s.reassigning = null;
        s.returningLoan = null;
        break;
      case "cancel":
        s.editing = false;
        s.returningLoan = null;
        break;
      case "start_return":
        s.returningLoan = Number(v);
        s.reassigning = null;
        break;
      case "cancel_return":
        s.returningLoan = null;
        break;
      case "start_reassign":
        s.reassigning = Number(v);
        s.returningLoan = null;
        break;
      case "cancel_reassign":
        s.reassigning = null;
        break;
      case "scope":
        s.onlyOpen = v === "0";
        break;
      case "return": {
        // Immediate return shortcut: open verification box
        s.returningLoan = Number(v);
        s.reassigning = null;
        break;
      }
    }
    commit();
  });

  root.addEventListener("change", (e) => {
    if (e.target.matches("[data-filter]")) {
      s.filter = e.target.value;
      commit();
    }
  });

  root.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const form = new FormData(f);

    if (f.matches("[data-note]")) {
      const text = String(form.get("note")).trim();
      if (!text) return;
      s.notes.push({ phase: s.phase, text });
      commit("Handover note saved.");
      return;
    }

    // Two-stage atomic quick kit checkout
    if (f.matches("[data-quick-kit]")) {
      const reqId = f.dataset.quickKit;
      const r = getReq(reqId);
      if (!r) return;
      const who = form.get("who");
      const due = form.get("due");
      const chosenUnits = {};
      for (const itemType of r.items) {
        chosenUnits[itemType] = form.get("asset_" + itemType);
      }

      try {
        const slips = executeKitCheckout(s, reqId, who, due, chosenUnits);
        const slipList = slips.map((sl) => "L-" + sl.num + " (" + sl.asset + ")");
        const binList = slips.map((sl) => sl.asset + " at Bin " + getAsset(sl.asset).bin);
        commit(
          "Issued complete kit to " +
            who +
            " [" +
            slipList.join(", ") +
            "]. Collect from: " +
            binList.join(", ") +
            ".",
        );
      } catch (err) {
        s.notice = "⚠️ Checkout Failed: " + err.message;
        paint();
      }
      return;
    }

    // Physical tag verification for morning handover
    if (f.matches("[data-verify-morning]")) {
      const loanNum = form.get("loanNum");
      const presentedTag = form.get("presentedTag");
      try {
        const closedLoan = executeReturn(
          s,
          loanNum,
          presentedTag,
          "Leela Das",
          "Good",
          "Returned to shelf (Bin C4)",
        );
        commit(
          "Physical unit " +
            closedLoan.asset +
            " verified and accepted from Leela Das. Slip L-" +
            closedLoan.num +
            " closed.",
        );
      } catch (err) {
        s.notice = "⚠️ Verification Error: " + err.message;
        paint();
      }
      return;
    }

    // Physical tag verification for individual return slips
    if (f.matches("[data-confirm-return]")) {
      const loanNum = f.dataset.confirmReturn;
      const presentedTag = form.get("presentedTag");
      const returnedBy = form.get("returnedBy");
      const condition = form.get("condition");
      const disposition = form.get("disposition");

      try {
        const closedLoan = executeReturn(
          s,
          loanNum,
          presentedTag,
          returnedBy,
          condition,
          disposition,
        );
        s.returningLoan = null;
        commit(
          closedLoan.asset +
            " returned by " +
            returnedBy +
            " (" +
            condition +
            "). Slip L-" +
            closedLoan.num +
            " closed.",
        );
      } catch (err) {
        s.notice = "⚠️ Return Error: " + err.message;
        paint();
      }
      return;
    }

    // Custody transfer
    if (f.matches("[data-reassign]")) {
      const loanNum = f.dataset.reassign;
      const who = form.get("who");
      const due = form.get("due");
      const noteText = String(form.get("note")).trim();

      try {
        const updated = executeCustodyTransfer(s, loanNum, who, due, noteText);
        s.reassigning = null;
        commit(
          "Slip L-" +
            updated.num +
            " custody transferred to " +
            who +
            " (Originally: " +
            updated.originalBorrower +
            "). Note logged in Desk book.",
        );
      } catch (err) {
        s.notice = "⚠️ Transfer Error: " + err.message;
        paint();
      }
      return;
    }

    // Single issue slip form
    if (f.matches("[data-issue]")) {
      const [req, asset, who, due] = ["req", "asset", "who", "due"].map((k) =>
        form.get(k),
      );
      const chosen = {};
      const unit = getAsset(asset);
      if (!unit) {
        s.notice = "⚠️ Asset does not exist.";
        paint();
        return;
      }
      chosen[unit.type] = asset;

      try {
        const slips = executeKitCheckout(s, req, who, due, chosen);
        s.editing = false;
        commit("Issued " + asset + " to " + who + " on slip L-" + slips[0].num + ".");
      } catch (err) {
        s.notice = "⚠️ " + err.message;
        paint();
      }
    }
  });

  function restore() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const res = core.restoreState(raw);
      s = res.state;
      if (res.recovered) {
        s.notice = "⚠️ LocalStorage restored safely (" + res.reason + ").";
      }
      paint();
    } catch {
      s = createInitialState();
      paint();
    }
  }

  paint();
  restore();
})();
