chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "NB_STORE_FORM") return;

  const senderOrigin = sender.url ? new URL(sender.url).origin : "";
  const allowed = new Set([
    "https://namaskarbhar.shop",
    "https://indian-docs-desk.vercel.app",
  ]);

  if (!allowed.has(senderOrigin)) {
    sendResponse({ ok: false, message: "Untrusted sender origin." });
    return;
  }

  const record = message.record;
  if (!record || typeof record !== "object" || !record.form || typeof record.form !== "object") {
    sendResponse({ ok: false, message: "Invalid form payload." });
    return;
  }

  chrome.storage.local.set({ preparedForm: record }, () => {
    sendResponse({ ok: true, message: "Form saved locally in this browser." });
  });
  return true;
});
