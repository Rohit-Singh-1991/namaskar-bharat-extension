chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "NB_STORE_FORM") return;

  let senderOrigin = "";
  try {
    senderOrigin = sender.url ? new URL(sender.url).origin : "";
  } catch {
    sendResponse({ ok: false, message: "Could not verify the sending page." });
    return;
  }

  // Keep these exact origins in sync with app-bridge.js and manifest.json.
  const allowed = new Set([
    "https://namaskarbharat.shop",
    "https://namaskarbhar.shop", // legacy domain
    "https://indian-docs-desk.vercel.app",
  ]);

  if (!allowed.has(senderOrigin)) {
    sendResponse({ ok: false, message: `Untrusted sender origin: ${senderOrigin || "unknown"}. Open Namaskar Bharat on its official app domain.` });
    return;
  }

  const record = message.record;
  if (!record || typeof record !== "object" || !record.form || typeof record.form !== "object" || Array.isArray(record.form)) {
    sendResponse({ ok: false, message: "Invalid form payload. Reopen the application and prepare the details again." });
    return;
  }

  chrome.storage.local.set({ preparedForm: record }, () => {
    if (chrome.runtime.lastError) {
      sendResponse({ ok: false, message: chrome.runtime.lastError.message || "Could not save the form in extension storage." });
      return;
    }
    sendResponse({ ok: true, message: "Form saved locally in this browser." });
  });
  return true;
});
