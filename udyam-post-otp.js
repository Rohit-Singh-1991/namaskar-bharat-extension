/*
 * Udyam post-OTP continuation.
 * Armed only by the user's explicit "Udyam: fill Aadhaar/name + request OTP" action.
 * Watches dynamic/reloaded Udyam steps and fills only currently blank fields from
 * the already-prepared local application. Never handles OTP/CAPTCHA or submits.
 */
(() => {
  const HOST = location.hostname.toLowerCase().replace(/^www\./, "");
  if (!(HOST === "udyamregistration.gov.in" || HOST.endsWith(".udyamregistration.gov.in"))) return;

  const STATE_KEY = "nbUdyamPostOtpAutofill";
  const MAX_AGE_MS = 10 * 60 * 1000;
  let observer;
  let scanTimer;
  let scanning = false;

  const clean = value => String(value ?? "").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const ALIASES = {
    aadhaar: ["aadhaar", "aadhaarnumber", "aadhaarno", "uid", "uidnumber"],
    full_name: ["nameofpanholder", "nameasperpan", "nameofentrepreneur", "nameasperaadhaar", "entrepreneurname", "fullname", "applicantname"],
    pan: ["pan", "pannumber", "pancardnumber"],
    business_pan: ["panofthebusiness", "businesspan", "proprietorpan"],
    legal_name: ["nameofenterprise", "enterprisename", "legalname", "businessname"],
    trade_name: ["tradename", "tradingname", "brandname"],
    constitution: ["typeoforganisation", "typeoforganization", "organisationtype", "organizationtype", "constitutionofbusiness"],
    social_category: ["socialcategory"], specially_abled: ["speciallyabled", "divyangjan"],
    commencement_date: ["dateofcommencement", "commencementdate"], incorporation_date: ["dateofincorporation", "incorporationdate"],
    major_activity: ["majoractivity", "mainactivity"], enterprise_type: ["typeofenterprise", "enterprisetype"],
    employees: ["totalnumberofworkers", "numberofemployees", "employees"],
    investment: ["investmentinplantmachinery", "investment"], turnover: ["annualturnover", "turnover"],
    gstin: ["gstin", "gstnumber"], bank_account: ["bankaccountnumber", "accountnumber"], ifsc: ["ifsccode", "ifsc"],
    address_line1: ["flatdoorblockno", "addressline1", "house", "building", "street"],
    address_line2: ["nameofpremises", "roadstreetlane", "addressline2", "locality", "area"],
    city: ["city", "town", "village"], district: ["district"], state: ["state", "stateut"],
    pincode: ["pincode", "pin", "postalcode"], unit_name: ["unitname", "nameofunit"], unit_address: ["unitaddress"]
  };

  function keysFor(el) {
    const labels = el.labels ? [...el.labels].map(label => label.textContent || "") : [];
    const labelFor = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent || "" : "";
    return [el.id, el.name, el.getAttribute("aria-label"), el.getAttribute("data-field"),
      el.getAttribute("data-testid"), el.placeholder, labelFor, ...labels]
      .filter(Boolean).map(clean);
  }
  function findTarget(controls, field, used) {
    const aliases = [...new Set([...(ALIASES[field] || []), field].map(clean).filter(a => a.length >= 3))];
    let best = null, bestScore = 0;
    for (const el of controls) {
      if (used.has(el) || el.disabled || el.readOnly || el.type === "hidden" ||
          ["password", "file", "submit", "button", "reset"].includes(el.type)) continue;
      // Do not overwrite values populated by the portal or entered by the user.
      if (String(el.value ?? "").trim() !== "" || el.checked) continue;
      const keys = keysFor(el);
      let score = 0;
      for (const key of keys) for (const alias of aliases) {
        if (key === alias) score = Math.max(score, 100 + alias.length);
        else if (alias.length >= 5 && key.includes(alias)) score = Math.max(score, 50 + alias.length);
        else if (key.length >= 5 && alias.length >= 5 && alias.includes(key)) score = Math.max(score, 20 + key.length);
      }
      if (score > bestScore) { best = el; bestScore = score; }
    }
    return best;
  }
  function setValue(el, value) {
    if (!el || value == null || String(value).trim() === "" || el.disabled || el.readOnly || String(el.value ?? "").trim() !== "") return false;
    if (el instanceof HTMLSelectElement) {
      const wanted = clean(value);
      const option = [...el.options].find(o => {
        const text = clean(o.textContent), val = clean(o.value);
        return text === wanted || val === wanted || (wanted.length >= 3 && (text.includes(wanted) || val.includes(wanted)));
      });
      if (!option) return false;
      el.value = option.value;
    } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (["checkbox", "radio"].includes(el.type)) return false;
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setter) setter.call(el, String(value)); else el.value = String(value);
    } else return false;
    el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    return true;
  }

  async function scan() {
    if (scanning) return;
    scanning = true;
    try {
      const state = await chrome.storage.local.get([STATE_KEY, "preparedForm"]);
      const armed = state[STATE_KEY];
      if (!armed?.armed || !armed.startedAt || Date.now() - armed.startedAt > MAX_AGE_MS) {
        await chrome.storage.local.remove(STATE_KEY);
        observer?.disconnect();
        clearTimeout(scanTimer);
        return;
      }
      const form = state.preparedForm?.form;
      if (!form || typeof form !== "object") return;
      const controls = [...document.querySelectorAll("input,select,textarea")];
      const used = new Set();
      let filled = 0;
      for (const [field, value] of Object.entries(form)) {
        if (value == null || String(value).trim() === "") continue;
        const target = findTarget(controls, field, used);
        if (setValue(target, value)) { used.add(target); filled++; }
      }
      if (filled) {
        chrome.runtime.sendMessage({ type: "NB_UDYAM_POST_OTP_FILLED", filled }).catch(() => {});
      }
    } finally {
      scanning = false;
    }
  }

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 350);
  }
  function startObserver() {
    if (!observer && document.documentElement) {
      observer = new MutationObserver(scheduleScan);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    scheduleScan();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "NB_FILL_AND_REQUEST_OTP") return;
    chrome.storage.local.set({ [STATE_KEY]: { armed: true, startedAt: Date.now() } }, () => {
      startObserver();
      sendResponse({ ok: true, message: "Udyam post-OTP autofill armed for newly displayed fields. OTP entry and submission remain manual." });
    });
    return true;
  });

  chrome.storage.local.get([STATE_KEY], result => {
    const armed = result[STATE_KEY];
    if (armed?.armed && armed.startedAt && Date.now() - armed.startedAt <= MAX_AGE_MS) startObserver();
  });
})();
