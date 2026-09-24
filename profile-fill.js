/* User-triggered personal-profile autofill. Profile values remain local to the extension. */
(() => {
  const ROOTS = ["uidai.gov.in", "gst.gov.in", "udyamregistration.gov.in", "eci.gov.in", "nsdl.com", "utiitsl.com", "fssai.gov.in", "parivahan.gov.in", "passportindia.gov.in", "incometax.gov.in", "mca.gov.in", "epfindia.gov.in", "eshram.gov.in", "gem.gov.in", "startupindia.gov.in", "icegate.gov.in", "dgft.gov.in", "crsorgi.gov.in", "india.gov.in"];
  const host = location.hostname.toLowerCase().replace(/^www\./, "");
  if (!ROOTS.some(root => host === root || host.endsWith(`.${root}`))) return;
  const normalize = s => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const aliases = {
    "full name": ["name", "fullname", "applicantname", "nameofapplicant", "nameasperaadhaar", "entrepreneurname"],
    "first name": ["firstname", "givenname"], "middle name": ["middlename"], "last name": ["lastname", "surname", "familyname"],
    "mobile number": ["mobile", "mobileno", "mobilenumber", "phone", "phoneno", "contactnumber"],
    "email": ["emailid", "emailaddress"], "date of birth": ["dob", "birthdate"], "gender": ["sex"],
    "father name": ["fathername", "fatherhusbandname", "guardianname"], "pan": ["pannumber", "pancardnumber"],
    "aadhaar": ["aadhaarnumber", "aadhaarno", "uid", "uidnumber"], "pin code": ["pincode", "pin", "postalcode", "zipcode"],
    "address": ["addressline1", "residentialaddress", "streetaddress"], "city": ["town", "village"], "state": ["stateut", "stateunionterritory"]
  };
  const labelsFor = el => {
    const id = el.id || "";
    const labels = el.labels ? [...el.labels].map(x => x.textContent || "") : [];
    const linked = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent || "" : "";
    return [el.name, id, el.placeholder, el.getAttribute("aria-label"), el.getAttribute("data-testid"), linked, ...labels].filter(Boolean).map(normalize);
  };
  const setValue = (el, value) => {
    if (!el || el.disabled || el.readOnly || !String(value ?? "").trim() || ["password", "hidden", "file", "submit", "button"].includes(el.type)) return false;
    if (el instanceof HTMLSelectElement) {
      const wanted = normalize(value); const option = [...el.options].find(o => normalize(o.textContent) === wanted || normalize(o.value) === wanted || (wanted.length > 2 && normalize(o.textContent).includes(wanted)));
      if (!option) return false; el.value = option.value;
    } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (["checkbox", "radio"].includes(el.type)) { const wanted = normalize(value); if (wanted !== normalize(el.value) && !["yes", "true"].includes(wanted)) return false; el.checked = true; }
      else { const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set; setter ? setter.call(el, String(value)) : el.value = String(value); }
    } else return false;
    el.dispatchEvent(new Event("input", {bubbles:true, composed:true})); el.dispatchEvent(new Event("change", {bubbles:true, composed:true})); return true;
  };
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "NB_FILL_PERSONAL_PROFILE") return;
    chrome.storage.local.get(["personalProfile"], ({personalProfile}) => {
      if (!personalProfile || typeof personalProfile !== "object" || !Object.keys(personalProfile).length) { sendResponse({ok:false, message:"No personal profile saved. Open Manage/customize personal data in the extension first."}); return; }
      const controls = [...document.querySelectorAll("input,select,textarea")].filter(el => el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const used = new Set(), unmatched = []; let filled = 0;
      for (const [label, value] of Object.entries(personalProfile)) {
        if (!String(value ?? "").trim()) continue;
        const key = normalize(label); const candidates = [key, ...(aliases[label.toLowerCase()] || []).map(normalize)];
        let target = null, best = 0;
        for (const el of controls) { if (used.has(el) || el.disabled || el.readOnly || el.type === "hidden") continue;
          const descriptors = labelsFor(el); let score = 0;
          for (const d of descriptors) for (const c of candidates) { if (!c || c.length < 3) continue; if (d === c) score = Math.max(score, 100 + c.length); else if (c.length >= 5 && d.includes(c)) score = Math.max(score, 50 + c.length); }
          if (score > best) {best = score; target = el;}
        }
        if (target && setValue(target, value)) {filled++; used.add(target);} else unmatched.push(label);
      }
      sendResponse({ok:true, filled, notMatched:unmatched, message:`Personal profile autofill attempted on ${host}. Review all populated fields; verification and submission remain manual.`});
    }); return true;
  });
})();