(() => {
  const storageKey = "campus-stores.shift.v1";
  const root = document.getElementById("campus-stores");
  const q = (selector) => root.querySelector(selector);
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
  const pages = [
    ["Requests", "clipboard-list"],
    ["Inventory", "package"],
    ["Loan register", "book-open"],
    ["Desk book", "messages-square"],
  ];
  const original = () => ({
    version: 1,
    tab: "Requests",
    phase: 0,
    selected: "",
    filter: "All items",
    loans: [
      {
        num: 401,
        req: "RQ-209",
        asset: "MI-09",
        who: "Tara Shah",
        due: "Sat 10 am",
        back: false,
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
  });
  let s = original();
  const getAsset = (id) => assets.find((x) => x.id === id);
  const getReq = (id) => requests.find((x) => x.id === id);
  const out = (id) => s.loans.find((l) => l.asset === id && !l.back);
  const esc = (x) =>
    String(x).replace(
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
          (a) => a.type === itemType && !a.repair && !out(a.id),
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
        r.id +
        " · Approved</small><h3>" +
        r.event +
        "</h3><p>" +
        r.club +
        " · Filed by " +
        r.owner +
        "</p><p><b>Return by</b> " +
        r.due +
        "</p><p style='margin-top:8px;'><b>Approved equipment & live desk status:</b></p><div class='kit-items-list'>" +
        itemStatus
          .map((x) => {
            let statusBadge = "";
            let binInfo = "";
            if (x.activeLoan) {
              statusBadge = badge("On loan · Slip L-" + x.activeLoan.num, false);
              binInfo = "<small class='muted'>Held by " + esc(x.activeLoan.who) + " · Due " + esc(x.activeLoan.due) + " (" + x.activeLoan.asset + ")</small>";
            } else if (x.returnedLoan) {
              statusBadge = badge("Returned · Slip L-" + x.returnedLoan.num, true);
              binInfo = "<small class='muted'>Returned to shelf (" + x.returnedLoan.asset + ")</small>";
            } else if (x.availableUnit) {
              statusBadge = badge("Ready in Bin " + x.availableUnit.bin, true);
              binInfo = "<small class='muted'>Unit " + x.availableUnit.id + " (" + x.availableUnit.model + ")</small>";
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
        r.note +
        "</p></div>";

      // If unissued items exist, render Quick Kit Checkout with unit selection
      if (!allIssued) {
        const defaultCollector = (r.id === "RQ-214") ? "Kabir Sen" : r.owner;
        const unitSelectors = unissuedItems
          .map((x) => {
            const availUnits = assets.filter(
              (a) => a.type === x.itemType && !a.repair && !out(a.id),
            );
            if (!availUnits.length) {
              return "<p><small style='color:var(--mark);'>No units available for " + esc(x.itemType) + "</small></p>";
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
          "<div class='quick-kit-header'><h4>⚡ Quick Kit Checkout</h4><small>Issue all ready items in 1 click</small></div>" +
          "<form data-quick-kit='" + esc(r.id) + "'>" +
          "<div class='form'>" +
          "<label><span>Collected by</span><select name='who'>" +
          people.map((p) => "<option value='" + esc(p) + "'" + (p === defaultCollector ? " selected" : "") + ">" + esc(p) + "</option>").join("") +
          "</select></label>" +
          "<label><span>Return by</span><select name='due'>" +
          ["Fri 8 pm", "Sat 9 am", "Sat 10 am", "Sat noon"].map((d) => "<option value='" + esc(d) + "'" + (d === r.due ? " selected" : "") + ">" + esc(d) + "</option>").join("") +
          "</select></label>" +
          unitSelectors +
          "</div>" +
          "<button type='submit' class='primary' style='margin-top:10px;'>⚡ Issue Complete Kit (" + unissuedItems.length + " items)</button>" +
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
            summaryBadge = badge("Partial (" + (activeLoans + returnedLoans) + "/" + totalItems + ")", false);
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
      "Physical units · home shelf and current availability",
    );
    html +=
      '<div class="buttons"><label>Show <select data-filter>' +
      opts(
        ["All items", "On shelf", "On loan", "In repair"].map((f) => [f, f]),
      ) +
      "</select></label></div>";
    for (const a of assets) {
      const status = a.repair
        ? "In repair"
        : out(a.id)
          ? "On loan"
          : "On shelf";
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
    if (s.phase === 2) {
      const morningLoan = s.loans.find(
        (l) => !l.back && (l.who === "Leela Das" || l.req === "RQ-214" || l.due === "Sat 9 am"),
      );
      if (morningLoan) {
        const assetObj = getAsset(morningLoan.asset);
        html +=
          "<div class='handover-banner'>" +
          "<div class='handover-text'>" +
          "<strong>🔔 Morning Handover Task (9:00 am):</strong>" +
          "<span>Leela Das is returning <b>" + esc(morningLoan.asset) + "</b> (" + esc(assetObj ? assetObj.type + " · " + assetObj.model : "Equipment") + " · Slip L-" + morningLoan.num + ") for Film Society.</span>" +
          "<small style='display:block;margin-top:3px;color:var(--mark);font-weight:600;'>⚠️ Verify Physical Tag: Confirm unit is AD-12 (Belkin), NOT AD-15 (Anker).</small>" +
          "</div>" +
          btn("⚡ Verify AD-12 & Close Slip", "return_morning_adapter", String(morningLoan.num), "primary") +
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
      const available = assets.filter((a) => !a.repair && !out(a.id));
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
          (rec ? "<small class='muted' style='display:block;margin-top:2px;'>By " + esc(rec.returnedBy) + " · " + esc(rec.condition) + "</small>" : "");
      }
      const rightSide = l.back
        ? returnRecordBadge
        : '<div class="actions-group">' +
          btn("Record return", "start_return", String(l.num)) +
          btn("Custody / Note", "start_reassign", String(l.num)) +
          "</div>";

      html += row(
        "L-" + l.num + " · " + l.asset,
        l.req + " · " + l.who + " · Due " + l.due,
        rightSide,
      );

      if (isReturning) {
        const assetObj = getAsset(l.asset);
        html +=
          "<form data-confirm-return='" + l.num + "' class='reassign-box'>" +
          "<div style='font-weight:600; margin-bottom:4px;'>Physical Asset Return Verification</div>" +
          "<p><small>Verifying physical unit: <b>" + esc(l.asset) + "</b> (" + esc(assetObj.type) + " · " + esc(assetObj.model) + ")</small></p>" +
          (l.asset === "AD-12" ? "<p style='color:var(--mark);font-weight:600;'><small>⚠️ Caution: Verify physical tag reads AD-12 (Belkin). Do NOT accept AD-15 (Anker)!</small></p>" : "") +
          "<div class='form'>" +
          "<label><span>Returned by</span><select name='returnedBy'>" +
          people.map((p) => "<option value='" + esc(p) + "'" + (p === l.who ? " selected" : "") + ">" + esc(p) + "</option>").join("") +
          "</select></label>" +
          "<label><span>Condition</span><select name='condition'><option value='Good'>Good · Working</option><option value='Damaged'>Damaged / Needs Inspection</option></select></label>" +
          "<label class='full'><span>Shelf Destination</span><select name='disposition'><option value='Returned to shelf (Bin " + esc(assetObj.bin) + ")'>Returned to shelf (Bin " + esc(assetObj.bin) + ")</option><option value='Send to Workshop'>Send to Workshop</option></select></label>" +
          "</div>" +
          "<div class='actions-group'>" +
          "<button type='submit' class='primary'>Confirm Return & Restore to Stock</button>" +
          btn("Cancel", "cancel_return") +
          "</div>" +
          "</form>";
      }

      if (isReassigning) {
        const defaultNext = (l.who === "Kabir Sen") ? "Leela Das" : people[0];
        const defaultDue = (s.phase >= 1) ? "Sat 9 am" : l.due;
        html +=
          "<form data-reassign='" + l.num + "' class='reassign-box'>" +
          "<div class='form'>" +
          "<label><span>Reassign custody to</span><select name='who'>" +
          people.map((p) => "<option value='" + esc(p) + "'" + (p === defaultNext ? " selected" : "") + ">" + esc(p) + "</option>").join("") +
          "</select></label>" +
          "<label><span>New return time</span><select name='due'>" +
          ["Fri 8 pm", "Sat 9 am", "Sat 10 am", "Sat noon"].map((d) => "<option value='" + esc(d) + "'" + (d === defaultDue ? " selected" : "") + ">" + esc(d) + "</option>").join("") +
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

    // Append Audit Trail & Event History
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
            (e.actor || e.returnedBy || "") +
            (e.loanNum ? " (Slip L-" + e.loanNum + ")" : "") +
            " · " +
            esc(e.time) +
            "</small></div><div>" +
            badge(e.id, true) +
            "</div></div>",
        )
        .join("") +
      "</div>";

    return html;
  }
  function canAdvanceShift() {
    if (s.phase === 0) {
      const r = getReq("RQ-214");
      const activeLoans = s.loans.filter((l) => l.req === "RQ-214" && !l.back);
      if (activeLoans.length < r.items.length) {
        return {
          allowed: false,
          reason:
            "Film Society kit (RQ-214) has not been issued yet. Issue the kit to Kabir Sen before moving to evening return.",
        };
      }
    }
    if (s.phase === 1) {
      const returnedProj = s.loans.find(
        (l) => l.req === "RQ-214" && l.asset === "PR-04" && l.back,
      );
      const returnedSpeaker = s.loans.find(
        (l) => l.req === "RQ-214" && l.asset === "SP-02" && l.back,
      );
      if (!returnedProj || !returnedSpeaker) {
        return {
          allowed: false,
          reason:
            "Record return of projector (PR-04) and speaker (SP-02) from Kabir Sen before moving to morning shift.",
        };
      }
      const adapterLoan = s.loans.find(
        (l) => l.req === "RQ-214" && l.asset.startsWith("AD-") && !l.back,
      );
      if (adapterLoan && adapterLoan.who !== "Leela Das") {
        return {
          allowed: false,
          reason:
            "Reassign adapter (Slip L-" +
            adapterLoan.num +
            ") custody to Leela Das (Due Sat 9 am) before morning handover.",
        };
      }
    }
    return { allowed: true };
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
      localStorage.setItem(storageKey, JSON.stringify(s));
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
        s = original();
        break;
      case "advance": {
        const check = canAdvanceShift();
        if (!check.allowed) {
          s.notice = "⚠️ " + check.reason;
          break;
        }
        if (s.phase < 2) s.phase++;
        s.reassigning = null;
        s.returningLoan = null;
        s.events.push({
          id: "EVT-" + Date.now(),
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
      case "return_morning_adapter": {
        const num = Number(v);
        const l = s.loans.find((l) => l.num === num);
        if (!l || l.back) return;
        l.back = true;
        l.returnRecord = {
          returnedAt: shifts[s.phase].time,
          returnedBy: "Leela Das",
          condition: "Good",
          disposition: "Returned to shelf (Bin C4)",
        };
        s.events.push({
          id: "EVT-" + Date.now(),
          type: "ASSET_RETURNED",
          asset: l.asset,
          loanNum: l.num,
          returnedBy: "Leela Das",
          condition: "Good",
          time: shifts[s.phase].time,
        });
        s.notice =
          "Physical unit AD-12 (Belkin) verified & returned by Leela Das. Slip L-" +
          l.num +
          " closed.";
        break;
      }
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
        const l = s.loans.find((l) => l.num === Number(v));
        if (!l || l.back) return;
        l.back = true;
        if (s.reassigning === l.num) s.reassigning = null;
        if (s.returningLoan === l.num) s.returningLoan = null;
        s.notice = l.asset + " returned to stock. Slip L-" + l.num + " closed.";
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
    if (f.matches("[data-confirm-return]")) {
      const num = Number(f.dataset.confirmReturn);
      const l = s.loans.find((l) => l.num === num);
      if (!l) return;
      const returnedBy = form.get("returnedBy");
      const condition = form.get("condition");
      const disposition = form.get("disposition");
      l.back = true;
      l.returnRecord = {
        returnedAt: shifts[s.phase].time,
        returnedBy: returnedBy,
        condition: condition,
        disposition: disposition,
      };
      s.events.push({
        id: "EVT-" + Date.now(),
        type: "ASSET_RETURNED",
        asset: l.asset,
        loanNum: l.num,
        returnedBy: returnedBy,
        condition: condition,
        disposition: disposition,
        time: shifts[s.phase].time,
      });
      s.returningLoan = null;
      commit(
        l.asset +
          " returned by " +
          returnedBy +
          " (" +
          condition +
          "). Slip L-" +
          l.num +
          " closed.",
      );
      return;
    }
    if (f.matches("[data-quick-kit]")) {
      const reqId = f.dataset.quickKit;
      const r = getReq(reqId);
      if (!r) return;
      const who = form.get("who");
      const due = form.get("due");
      let nextNum = Math.max(...s.loans.map((l) => l.num), 400);
      const issuedSlips = [];
      const binList = [];

      for (const itemType of r.items) {
        const alreadyIssued = s.loans.some(
          (l) => l.req === reqId && !l.back && getAsset(l.asset).type === itemType,
        );
        if (alreadyIssued) continue;

        const chosenAssetId = form.get("asset_" + itemType);
        let unit = chosenAssetId ? getAsset(chosenAssetId) : null;
        if (!unit || unit.repair || out(unit.id)) {
          unit = assets.find(
            (a) => a.type === itemType && !a.repair && !out(a.id),
          );
        }
        if (!unit) continue;

        nextNum++;
        s.loans.push({
          num: nextNum,
          req: reqId,
          asset: unit.id,
          who: who,
          due: due,
          back: false,
        });
        s.events.push({
          id: "EVT-" + (nextNum + 100),
          type: "ASSET_ISSUED",
          asset: unit.id,
          loanNum: nextNum,
          req: reqId,
          actor: who,
          time: shifts[s.phase].time,
        });
        issuedSlips.push("L-" + nextNum + " (" + unit.id + ")");
        binList.push(unit.id + " at Bin " + unit.bin);
      }

      commit(
        "Issued complete kit to " +
          who +
          " [" +
          issuedSlips.join(", ") +
          "]. Collect from: " +
          binList.join(", ") +
          ".",
      );
      return;
    }
    if (f.matches("[data-reassign]")) {
      const num = Number(f.dataset.reassign);
      const l = s.loans.find((l) => l.num === num);
      if (!l) return;
      const who = form.get("who");
      const due = form.get("due");
      const noteText = String(form.get("note")).trim();
      const oldWho = l.who;
      l.who = who;
      l.due = due;
      if (noteText) {
        s.notes.push({
          phase: s.phase,
          text:
            "Slip L-" +
            l.num +
            " (" +
            l.asset +
            ") custody transferred from " +
            oldWho +
            " to " +
            who +
            " (Due " +
            due +
            "). Note: " +
            noteText,
        });
      }
      s.events.push({
        id: "EVT-" + Date.now(),
        type: "CUSTODY_TRANSFERRED",
        asset: l.asset,
        loanNum: l.num,
        from: oldWho,
        to: who,
        time: shifts[s.phase].time,
      });
      s.reassigning = null;
      commit(
        "Custody for Slip L-" +
          l.num +
          " transferred to " +
          who +
          " (Due " +
          due +
          "). Handover note logged in Desk book.",
      );
      return;
    }
    if (!f.matches("[data-issue]")) return;
    const [req, asset, who, due] = ["req", "asset", "who", "due"].map((k) =>
      form.get(k),
    );
    const unit = getAsset(asset),
      r = getReq(req);
    if (!r || !unit || unit.repair || out(asset) || !people.includes(who))
      return;
    if (!r.items.includes(unit.type)) {
      q("[data-status]").textContent =
        "This equipment type is outside the approved request. Choose an approved unit.";
      return;
    }
    if (
      s.loans.some(
        (l) => l.req === req && !l.back && getAsset(l.asset).type === unit.type,
      )
    ) {
      q("[data-status]").textContent =
        "The approved quantity of this equipment type is already on loan.";
      return;
    }
    const num = Math.max(...s.loans.map((l) => l.num)) + 1;
    s.loans.push({ num, req, asset, who, due, back: false });
    s.events.push({
      id: "EVT-" + (num + 100),
      type: "ASSET_ISSUED",
      asset: asset,
      loanNum: num,
      req: req,
      actor: who,
      time: shifts[s.phase].time,
    });
    s.editing = false;
    commit("Issued " + asset + " to " + who + " on slip L-" + num + ".");
  });
  function restore(d) {
    if (
      !d ||
      d.version !== 1 ||
      !Object.hasOwn(screens, d.tab) ||
      !shifts[d.phase] ||
      (d.selected && !getReq(d.selected)) ||
      !Array.isArray(d.notes) ||
      !d.notes.every(
        (n) => n && shifts[n.phase] && typeof n.text === "string",
      ) ||
      !Array.isArray(d.loans) ||
      !d.loans.length ||
      !d.loans.every(
        (l) =>
          l && getReq(l.req) && getAsset(l.asset) && Number.isInteger(l.num),
      )
    )
      return;
    s = {
      ...original(),
      ...d,
      loans: d.loans.map((l) => ({ ...l })),
      notes: d.notes.map((n) => ({ ...n })),
      events: Array.isArray(d.events)
        ? d.events.map((e) => ({ ...e }))
        : original().events,
    };
    paint();
  }
  paint();
  try {
    restore(JSON.parse(localStorage.getItem(storageKey)));
  } catch {
    // Keep the fresh shift when storage is unavailable or the saved data is invalid.
  }
})();
