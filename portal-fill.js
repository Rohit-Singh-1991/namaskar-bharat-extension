/* Shared, user-triggered autofill engine for explicitly approved Indian portal hosts. */
(() => {
  const HOST = location.hostname.toLowerCase().replace(/^www\./, "");
  const APPROVED_ROOTS = [
    "uidai.gov.in", "gst.gov.in", "udyamregistration.gov.in", "eci.gov.in",
    "nsdl.com", "utiitsl.com", "fssai.gov.in", "parivahan.gov.in",
    "passportindia.gov.in", "incometax.gov.in", "mca.gov.in", "epfindia.gov.in",
    "eshram.gov.in", "gem.gov.in", "startupindia.gov.in", "icegate.gov.in",
    "dgft.gov.in", "crsorgi.gov.in", "india.gov.in"
  ];
  const approvedHost = APPROVED_ROOTS.some(root => HOST === root || HOST.endsWith(`.${root}`));
  if (!approvedHost) return;

  // Shared aliases cover fields used by Namaskar Bharat service forms. Add portal-specific
  // aliases below; all portals continue to use the same matching, scoring and event logic.
  const COMMON_ALIASES = {
    full_name: ["name", "applicantname", "nameofapplicant", "fullname", "entrepreneurname", "nameasperaadhaar"],
    father_name: ["fathername", "husbandname", "guardianname", "fatherhusbandname"],
    dob: ["dob", "dateofbirth", "birthdate"],
    gender: ["gender", "sex"],
    mobile: ["mobile", "mobileno", "mobilenumber", "phoneno", "contactnumber"],
    email: ["email", "emailid", "emailaddress"],
    aadhaar: ["aadhaar", "aadhaarnumber", "aadhaarno", "uid", "uidnumber"],
    enrolment_id: ["enrolmentid", "enrollmentid", "eid"],
    pan: ["pan", "pannumber", "pancardnumber"],
    business_pan: ["businesspan", "panofbusiness", "proprietorpan", "pannumber"],
    existing_pan: ["existingpan", "pannumber"],
    legal_name: ["legalname", "nameofenterprise", "enterprisename", "businessname", "nameofbusiness"],
    trade_name: ["tradename", "tradingname", "brandname"],
    constitution: ["constitution", "organisationtype", "organizationtype", "typeoforganisation", "entitytype"],
    designation: ["designation", "role", "applicantdesignation"],
    commencement_date: ["commencementdate", "dateofcommencement", "businessstartdate"],
    incorporation_date: ["incorporationdate", "dateofincorporation", "registrationdate"],
    production_start_date: ["productionstartdate", "businessstartdate", "dateofstart"],
    activity: ["activity", "businessactivity", "principalactivity", "natureofbusiness"],
    major_activity: ["majoractivity", "mainactivity"],
    enterprise_type: ["enterprisetype", "typeofenterprise", "msmeclassification"],
    social_category: ["socialcategory", "category"],
    specially_abled: ["speciallyabled", "divyangjan", "disability"],
    employees: ["employees", "numberofemployees", "totalworkers", "totalnumberofworkers"],
    investment: ["investment", "plantmachinery", "investmentinplantmachinery"],
    turnover: ["turnover", "annualturnover"],
    gstin: ["gstin", "gstnumber", "gstregistrationnumber"],
    bank_account: ["bankaccount", "bankaccountnumber", "accountnumber"],
    ifsc: ["ifsc", "ifsccode"],
    address_line1: ["addressline1", "address", "house", "building", "flatdoorblockno", "street"],
    address_line2: ["addressline2", "area", "locality", "landmark", "nameofpremises", "roadstreetlane"],
    care_of: ["careof", "co", "careofdetails"],
    city: ["city", "town", "village"],
    district: ["district"],
    state: ["state", "stateut", "stateunionterritory"],
    pincode: ["pincode", "pin", "postalcode", "zipcode"],
    unit_name: ["unitname", "plantname", "nameofunit"],
    unit_address: ["unitaddress", "plantaddress"],
    nic_code: ["niccode", "nic"],
    assembly_constituency: ["assemblyconstituency", "constituency"],
    relative_epic: ["relativeepic", "familyepic", "epicnumber"],
    aadhaar_service: ["service", "aadhaarservice", "typeofservice"],
    address_proof_type: ["addressprooftype", "proofofaddress"],
    preferred_centre: ["preferredcentre", "aadhaarcentre", "center"],
    needs_centre_visit: ["centreviewisit", "needscentreviewisit"],
    application_type: ["applicationtype", "typeofapplication"],
    applicant_status: ["applicantstatus", "statusofapplicant"],
    card_mode: ["cardmode", "panmode"],
    last_name: ["lastname", "surname", "familyname"],
    first_name: ["firstname", "givenname"],
    middle_name: ["middlename"],
    name_on_card: ["nameoncard", "nametoprint"],
    income_source: ["incomesource", "sourceofincome"],
    dic_office: ["dicoffice", "districtindustriescentre"]
  };

  const ADAPTERS = {
    "udyamregistration.gov.in": {
      aadhaar: ["aadhaarnumber", "aadhaarno", "uid"],
      full_name: ["nameofentrepreneur", "nameasperaadhaar", "entrepreneurname"],
      legal_name: ["nameofenterprise", "enterprisename"],
      constitution: ["organisationtype", "organizationtype"],
      social_category: ["socialcategory"], specially_abled: ["speciallyabled", "divyangjan"],
      commencement_date: ["dateofcommencement"], incorporation_date: ["dateofincorporation"],
      major_activity: ["majoractivity"], enterprise_type: ["typeofenterprise"],
      employees: ["totalnumberofworkers"], investment: ["investmentinplantmachinery"],
      address_line1: ["flatdoorblockno"], address_line2: ["nameofpremises", "roadstreetlane"],
      pincode: ["pin"], unit_name: ["unitname"], unit_address: ["unitaddress"]
    },
    "reg.gst.gov.in": {
      legal_name: ["legalnameofbusiness", "tradelegalname"], business_pan: ["panofthebusiness"],
      constitution: ["constitutionofbusiness"],
    },
    "voters.eci.gov.in": { full_name: ["nameofapplicant", "applicantname"], relative_epic: ["relativeepicno"] },
    "foscos.fssai.gov.in": { legal_name: ["nameofbusiness", "businessname"],
      constitution: ["typeofbusiness", "kindofbusiness"] },
    "myaadhaar.uidai.gov.in": { aadhaar: ["uidnumber", "aadhaarnumber"] }
  };
  const adapterAliases = Object.entries(ADAPTERS).find(([host]) => HOST === host || HOST.endsWith(`.${host}`))?.[1] || {};
  const clean = value => String(value ?? "").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const visible = el => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));

  const describe = el => {
    const id = el.id || "";
    const labels = el.labels ? [...el.labels].map(label => label.textContent || "") : [];
    const explicit = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent || "" : "";
    const wrapping = el.closest("label")?.textContent || "";
    const described = (el.getAttribute("aria-describedby") || "").split(/\s+/)
      .map(ref => ref && document.getElementById(ref)?.textContent || "").join(" ");
    return [id, el.name, el.getAttribute("aria-label"), el.getAttribute("data-field"),
      el.getAttribute("data-testid"), el.placeholder, explicit, wrapping, described, ...labels]
      .filter(Boolean).map(clean);
  };

  const aliasesFor = field => [...new Set([...(adapterAliases[field] || []), ...(COMMON_ALIASES[field] || []), field]
    .map(clean).filter(alias => alias.length >= 3))];
  const findTarget = (controls, field, used) => {
    const aliases = aliasesFor(field);
    let best = null, bestScore = 0;
    for (const el of controls) {
      if (used.has(el) || !visible(el) || el.disabled || el.readOnly || el.type === "hidden") continue;
      const keys = describe(el);
      let score = 0;
      for (const key of keys) for (const alias of aliases) {
        if (key === alias) score = Math.max(score, 100 + alias.length);
        else if (alias.length >= 5 && key.includes(alias)) score = Math.max(score, 50 + alias.length);
        else if (key.length >= 5 && alias.length >= 5 && alias.includes(key)) score = Math.max(score, 20 + key.length);
      }
      if (score > bestScore) { best = el; bestScore = score; }
    }
    return best;
  };

  const setNativeValue = (el, value) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, String(value)); else el.value = String(value);
    el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  };
  const setValue = (el, value) => {
    if (!el || value === "" || value == null || el.disabled || el.readOnly) return false;
    if (el instanceof HTMLSelectElement) {
      const wanted = clean(value);
      const option = [...el.options].find(o => {
        const text = clean(o.textContent), val = clean(o.value);
        return text === wanted || val === wanted || (wanted.length >= 3 && (text.includes(wanted) || val.includes(wanted)));
      });
      if (!option) return false;
      el.value = option.value;
      el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      return true;
    }
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
    if (["password", "file", "hidden", "submit", "button", "reset"].includes(el.type)) return false;
    if (el.type === "checkbox" || el.type === "radio") {
      const wanted = clean(value);
      if (wanted !== clean(el.value) && wanted !== "true" && wanted !== "yes") return false;
      el.checked = true;
      el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      return true;
    }
    setNativeValue(el, value);
    return true;
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!["NB_FILL_ACTIVE_PORTAL", "NB_FILL_AND_REQUEST_OTP"].includes(message?.type)) return;
    chrome.storage.local.get(["preparedForm"], ({ preparedForm }) => {
      if (!preparedForm?.form) {
        sendResponse({ ok: false, message: "No prepared application. Return to Namaskar Bharat, prepare details, and send them to the extension first." });
        return;
      }
      let filled = 0;
      const matched = {}, notMatched = [], used = new Set();
      const controls = [...document.querySelectorAll("input,select,textarea")];
      for (const [field, value] of Object.entries(preparedForm.form)) {
        if (value === "" || value == null) continue;
        const target = findTarget(controls, field, used);
        if (setValue(target, value)) { filled++; matched[field] = true; used.add(target); }
        else notMatched.push(field);
      }
      if (message.type === "NB_FILL_AND_REQUEST_OTP") {
        if (!HOST.endsWith("udyamregistration.gov.in") || !matched.aadhaar || !matched.full_name) {
          sendResponse({ ok: true, filled, notMatched, message: "Autofill completed where matched. OTP-request assistance is limited to Udyam; review the page and request OTP manually if needed." });
          return;
        }
        const buttons = [...document.querySelectorAll("button,input[type=button],input[type=submit]")];
        const otpButton = buttons.find(el => !el.disabled && /generateotp|validateandgenerateotp|getotp/.test(clean(el.innerText || el.value || el.getAttribute("aria-label"))));
        if (!otpButton) { sendResponse({ ok: true, filled, notMatched, message: "Aadhaar/name filled where matched; OTP button not recognized. Click it manually after review." }); return; }
        if (!confirm("Namaskar Bharat filled Aadhaar/name. Request an Aadhaar OTP on the official Udyam portal? The OTP remains private and must be entered by you.")) {
          sendResponse({ ok: true, filled, notMatched, message: "Fields filled. OTP request cancelled." }); return;
        }
        otpButton.click();
        sendResponse({ ok: true, filled, notMatched, message: "OTP request button clicked after your confirmation. Retrieve and enter the OTP yourself." });
        return;
      }
      sendResponse({ ok: true, filled, notMatched, message: `Attempted generic autofill on ${HOST}. Review every populated field; portal verification and submission remain manual.` });
    });
    return true;
  });
})();
