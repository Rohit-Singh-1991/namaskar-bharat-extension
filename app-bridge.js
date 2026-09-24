/* User-triggered transfer bridge for Namaskar Bharat Form Assistant. */
(() => {
  const ALLOWED_ORIGINS = new Set([
    "https://namaskarbharat.shop",
    "https://namaskarbhar.shop", // legacy domain
    "https://indian-docs-desk.vercel.app",
  ]);
  if (!ALLOWED_ORIGINS.has(location.origin)) return;

  // Generic key supports all services; legacy key keeps older Udyam app builds working.
  const STORAGE_KEYS = ["namaskarBharFormAutofill", "namaskarBharUdyamAutofill"];
  const HOST_ID = "nb-form-assistant-host";
  let lastPath = location.pathname;

  const readPrepared = () => {
    for (const key of STORAGE_KEYS) {
      try {
        const stored = JSON.parse(localStorage.getItem(key) || "null");
        const form = stored?.form && typeof stored.form === "object" ? stored.form : stored;
        if (form && typeof form === "object" && !Array.isArray(form) && Object.keys(form).length) {
          const serviceId = decodeURIComponent(location.pathname.split("/").filter(Boolean).pop() || "");
          return {
            serviceId: stored?.serviceId || serviceId || "registration",
            serviceTitle: stored?.serviceTitle || document.querySelector("h1")?.textContent?.trim() || "Registration application",
            preparedAt: stored?.preparedAt || new Date().toISOString(),
            form,
          };
        }
      } catch {
        // Ignore malformed/stale values and try the alternate supported key.
      }
    }
    return null;
  };

  const safeForm = (form) => {
    const safe = {};
    for (const [key, value] of Object.entries(form || {})) {
      if (/^[a-zA-Z0-9_-]{1,80}$/.test(key) && ["string", "number", "boolean"].includes(typeof value)) {
        safe[key] = String(value).slice(0, 500);
      }
    }
    return safe;
  };

  const attachPanel = () => {
    if (!document.body) return;
    if (!location.pathname.includes("/apply/")) {
      document.getElementById(HOST_ID)?.remove();
      return;
    }
    if (document.getElementById(HOST_ID)) return;

    const host = document.createElement("div");
    host.id = HOST_ID;
    Object.assign(host.style, {
      position: "fixed", left: "16px", bottom: "16px", zIndex: "2147483647",
      width: "min(390px, calc(100vw - 32px))", maxWidth: "calc(100vw - 32px)",
      visibility: "visible", opacity: "1", pointerEvents: "auto",
    });

    const shadow = host.attachShadow({ mode: "open" });
    const panel = document.createElement("section");
    Object.assign(panel.style, {
      boxSizing: "border-box", padding: "14px", border: "2px solid #167c45",
      borderRadius: "12px", background: "#fff", color: "#173b29",
      font: "14px/1.45 system-ui, sans-serif", boxShadow: "0 5px 24px #0004",
    });

    const heading = document.createElement("div");
    heading.textContent = "Namaskar Bharat Form Assistant";
    Object.assign(heading.style, { fontWeight: "700", fontSize: "15px", marginBottom: "5px" });

    const status = document.createElement("div");
    status.setAttribute("role", "status");
    status.textContent = "On the application review page, click Open Portal once to prepare details, then send them here.";
    Object.assign(status.style, { marginBottom: "10px", color: "#475569" });

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Send saved details to Form Assistant";
    Object.assign(button.style, {
      display: "block", width: "100%", minHeight: "44px", padding: "11px 14px",
      border: "0", borderRadius: "8px", cursor: "pointer", background: "#167c45",
      color: "#fff", font: "700 14px system-ui, sans-serif",
    });

    button.addEventListener("click", () => {
      const record = readPrepared();
      if (!record) {
        status.textContent = "No prepared details found. Return to this application’s review page, click Open Udyam Registration once, wait for the ‘details prepared’ confirmation, then click Send saved details again.";
        return;
      }
      record.form = safeForm(record.form);
      if (!Object.keys(record.form).length) {
        status.textContent = "Saved data was found, but it has no supported fields. Recheck your application details and prepare them again.";
        return;
      }

      button.disabled = true;
      button.textContent = "Sending…";
      status.textContent = "Sending the prepared application to this browser extension…";
      chrome.runtime.sendMessage({ type: "NB_STORE_FORM", record }, (response) => {
        const runtimeError = chrome.runtime.lastError;
        button.disabled = false;
        button.textContent = "Send saved details to Form Assistant";
        if (!runtimeError && response?.ok) {
          status.textContent = `Success — ${Object.keys(record.form).length} fields saved for ${record.serviceTitle}. Now open the matching official portal tab and use the extension.`;
        } else {
          status.textContent = "Transfer failed. Open chrome://extensions, reload Namaskar Bharat Form Assistant, refresh this application page, and try again.";
        }
      });
    });

    panel.append(heading, status, button);
    shadow.append(panel);
    document.body.append(host);
  };

  const refreshForRoute = () => {
    if (lastPath !== location.pathname) lastPath = location.pathname;
    attachPanel();
  };

  attachPanel();
  new MutationObserver(attachPanel).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", refreshForRoute);
  window.addEventListener("pageshow", refreshForRoute);
  window.setInterval(refreshForRoute, 1200);
})();
