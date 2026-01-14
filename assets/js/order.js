(() => {
  /* =========================
     WHITE-LABEL CONFIG
     ========================= */
  const CONFIG = {
    brand: "MENIPTV",
    language: "hu", // "hu" | "en" | "pl"
    telegramUsername: "BigBoxTV",
    makeWebhookUrl: "https://hook.eu2.make.com/make_ide_beilleszt",

    // redirect after successful submit
    thankYouUrl: "thank-you.html",
    redirectDelayMs: 2500,

    // sessionStorage key for thank-you page
    sessionKey: "meniptv_last_order"
  };

  /* =========================
     I18N STRINGS
     ========================= */
  const I18N = {
    hu: {
      sending: "Küldés…",
      success: "✅ Rendelés elküldve! Néhány másodpercen belül továbbítunk…",
      errors: {
        required: "Kérjük töltsd ki a kötelező mezőket.",
        renew: "Megújításhoz add meg a meglévő fiók nevét.",
        generic: "Hiba. Kérjük próbáld újra.",
        sendFail:
          "Nem sikerült elküldeni. Üzenet másolása → Telegram megnyitása → Beillesztés → Küldés",
        network:
          "Hálózati hiba. Üzenet másolása → Telegram megnyitása → Beillesztés → Küldés"
      },
      copied: "✔ Másolva"
    },

    en: {
      sending: "Sending…",
      success: "✅ Order sent! Redirecting in a few seconds…",
      errors: {
        required: "Please fill the required fields.",
        renew: "For renewal, please enter your existing account name.",
        generic: "Error. Please try again.",
        sendFail:
          "Couldn’t send. Copy message → Open Telegram → Paste → Send",
        network:
          "Network error. Copy message → Open Telegram → Paste → Send"
      },
      copied: "✔ Copied"
    },

    pl: {
      sending: "Wysyłanie…",
      success: "✅ Zamówienie wysłane! Za chwilę przekierujemy…",
      errors: {
        required: "Uzupełnij wymagane pola.",
        renew: "Dla odnowienia podaj nazwę istniejącego konta.",
        generic: "Błąd. Spróbuj ponownie.",
        sendFail:
          "Nie udało się wysłać. Skopiuj wiadomość → Otwórz Telegram → Wklej → Wyślij",
        network:
          "Błąd sieci. Skopiuj wiadomość → Otwórz Telegram → Wklej → Wyślij"
      },
      copied: "✔ Skopiowano"
    }
  };

  const T = I18N[CONFIG.language] || I18N.hu;

  /* =========================
     DOM HOOKS (DO NOT RENAME)
     ========================= */
  const form = document.getElementById("orderForm");
  const statusEl = document.getElementById("status");
  const typeEl = document.getElementById("type");
  const renewField = document.getElementById("renewUserField");
  const renewInput = document.getElementById("renew_username");
  const companyEl = document.getElementById("company");

  // Old version (prefill single link)
  const telegramPrefill = document.getElementById("telegramPrefill");

  // New version (copy/open/fallback UI)
  const telegramCopy = document.getElementById("copyOrderBtn");
  const telegramOpen = document.getElementById("openTelegram");
  const telegramFallback = document.getElementById("tgFallback");

  // Minimal required elements
  if (!form || !statusEl || !typeEl || !renewField || !renewInput) return;

  /* =========================
     HELPERS
     ========================= */
  function getFormData() {
    return Object.fromEntries(new FormData(form).entries());
  }

  function buildMessage(data) {
    const lines = [
      `📦 ÚJ ${CONFIG.brand} RENDELÉS`,
      `${CONFIG.language === "hu" ? "Típus" : CONFIG.language === "pl" ? "Typ" : "Type"}: ${data.type || ""}`,
      `${CONFIG.language === "hu" ? "Csomag" : CONFIG.language === "pl" ? "Pakiet" : "Plan"}: ${data.plan || ""}`,
      `${CONFIG.language === "hu" ? "Tartalom" : CONFIG.language === "pl" ? "Zawartość" : "Content"}: ${data.devices || ""}`,
      data.app ? `${CONFIG.language === "hu" ? "App/Eszköz" : CONFIG.language === "pl" ? "Aplikacja/Urządzenie" : "App/Device"}: ${data.app}` : null,
      data.renew_username ? `${CONFIG.language === "hu" ? "Fiók neve" : CONFIG.language === "pl" ? "Nazwa konta" : "Account name"}: ${data.renew_username}` : null,
      `${CONFIG.language === "hu" ? "Kapcsolat" : CONFIG.language === "pl" ? "Kontakt" : "Contact"}: ${data.contact || ""}`,
      `${CONFIG.language === "hu" ? "Idő" : CONFIG.language === "pl" ? "Czas" : "Time"}: ${new Date().toISOString()}`
    ].filter(Boolean);

    return lines.join("\n");
  }

  function updateRenewUI() {
    const isRenew = typeEl.value === "Renewal";
    renewField.classList.toggle("hidden", !isRenew);
    renewInput.required = isRenew;
    if (!isRenew) renewInput.value = "";
  }

  // Old prefill link (tg:// + fallback)
  function setTelegramPrefillLink(data) {
    if (!telegramPrefill) return;

    const text = encodeURIComponent(buildMessage(data));
    const deepLink = `tg://resolve?domain=${CONFIG.telegramUsername}&text=${text}`;
    const webFallback = `https://t.me/share/url?url=&text=${text}`;

    telegramPrefill.href = deepLink;
    telegramPrefill.setAttribute("data-fallback", webFallback);
  }

  // New fallback UI: copy/open buttons
  function setTelegramCopyOpenFallback(data) {
    const msg = buildMessage(data);

    if (telegramCopy) telegramCopy.setAttribute("data-message", msg);
    if (telegramOpen) telegramOpen.href = `https://t.me/${CONFIG.telegramUsername}`;

    // default hidden (only show on error)
    if (telegramFallback) telegramFallback.classList.add("hidden");
  }

  function updateTelegramUI(data) {
    setTelegramPrefillLink(data);
    setTelegramCopyOpenFallback(data);
  }

  function showTelegramFallback(data) {
    // ensure message/link is fresh
    updateTelegramUI(data);

    // Show the UI box (preferred)
    if (telegramFallback) {
      telegramFallback.classList.remove("hidden");
      try {
        telegramFallback.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (_) {}
    }

    // If only old link exists, scroll to it
    if (!telegramFallback && telegramPrefill) {
      try {
        telegramPrefill.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (_) {}
    }
  }

  function persistForThankYou(data) {
    const payload = {
      ...data,
      brand: CONFIG.brand,
      lang: CONFIG.language,
      savedAt: new Date().toISOString()
    };

    try {
      sessionStorage.setItem(CONFIG.sessionKey, JSON.stringify(payload));
    } catch (_) {
      // ignore
    }
  }

  function redirectToThankYou() {
    window.setTimeout(() => {
      window.location.href = CONFIG.thankYouUrl;
    }, CONFIG.redirectDelayMs);
  }

  /* =========================
     TELEGRAM UI EVENTS
     ========================= */

  // Old prefill click fallback (tg:// blocked -> web fallback)
  if (telegramPrefill) {
    telegramPrefill.addEventListener("click", () => {
      const fallback = telegramPrefill.getAttribute("data-fallback");
      if (!fallback) return;

      // NOTE: iOS may block non-user-gesture redirects; this click IS a gesture, so ok.
      setTimeout(() => {
        try {
          window.location.href = fallback;
        } catch (_) {}
      }, 600);
    });
  }

  // Copy button behavior
  if (telegramCopy) {
    const original = telegramCopy.textContent || "Megrendelés másolása";

    telegramCopy.addEventListener("click", async () => {
      const msg =
        telegramCopy.getAttribute("data-message") || buildMessage(getFormData());

      try {
        await navigator.clipboard?.writeText?.(msg);
      } catch (_) {}

      telegramCopy.textContent = T.copied || "✔ Másolva";
      telegramCopy.classList.add("is-copied");

      setTimeout(() => {
        telegramCopy.textContent = original;
        telegramCopy.classList.remove("is-copied");
      }, 2000);
    });
  }

  /* =========================
     INIT
     ========================= */
  updateRenewUI();
  updateTelegramUI(getFormData());

  typeEl.addEventListener("change", () => {
    updateRenewUI();
    updateTelegramUI(getFormData());
  });

  ["plan", "devices", "type", "app", "contact", "renew_username"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const handler = () => updateTelegramUI(getFormData());
    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
  });

  /* =========================
     SUBMIT
     ========================= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "";

    // Honeypot
    if (companyEl && (companyEl.value || "").trim() !== "") {
      statusEl.textContent = T.errors.generic;
      return;
    }

    const data = getFormData();

    if (!data.plan || !data.devices || !data.type || !data.contact) {
      statusEl.textContent = T.errors.required;
      updateTelegramUI(data);
      return;
    }

    if (data.type === "Renewal" && !data.renew_username) {
      statusEl.textContent = T.errors.renew;
      updateTelegramUI(data);
      return;
    }

    updateTelegramUI(data);

    try {
      statusEl.textContent = T.sending;

      const payloadObj = {
        ...data,
        message: buildMessage(data),
        source: "website",
        brand: CONFIG.brand,
        lang: CONFIG.language
      };

      const payload = new URLSearchParams();
      Object.entries(payloadObj).forEach(([k, v]) =>
        payload.append(k, String(v ?? ""))
      );

      const res = await fetch(CONFIG.makeWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: payload.toString()
      });

      if (!res.ok) {
        statusEl.textContent = T.errors.sendFail;
        showTelegramFallback(data);
        return;
      }

      // ✅ success
      statusEl.textContent = T.success;

      // save for thank-you page
      persistForThankYou(data);

      // reset
      form.reset();
      updateRenewUI();
      updateTelegramUI(getFormData());

      // redirect with delay
      redirectToThankYou();
    } catch (_) {
      statusEl.textContent = T.errors.network;
      showTelegramFallback(data);
    }
  });
})();
  const T = I18N[CONFIG.language] || I18N.hu;

  /* =========================
     DOM HOOKS
     ========================= */
  const form = document.getElementById("orderForm");
  const statusEl = document.getElementById("status");
  const typeEl = document.getElementById("type");
  const renewField = document.getElementById("renewUserField");
  const renewInput = document.getElementById("renew_username");
  const companyEl = document.getElementById("company");

  // Old version (prefill link)
  const telegramPrefill = document.getElementById("telegramPrefill");

  // New version (copy/open/fallback)
  const telegramCopy = document.getElementById("copyOrderBtn");
  const telegramOpen = document.getElementById("openTelegram");
  const telegramFallback = document.getElementById("tgFallback");

  // Minimal required elements
  if (!form || !statusEl || !typeEl || !renewField || !renewInput) return;

  /* =========================
     HELPERS
     ========================= */
  function getFormData() {
    return Object.fromEntries(new FormData(form).entries());
  }

  function buildMessage(data) {
    const lines = [
      `📦 ÚJ ${CONFIG.brand} RENDELÉS`,
      `Típus: ${data.type || ""}`,
      `Csomag: ${data.plan || ""}`,
      `Tartalom: ${data.devices || ""}`,
      data.app ? `App/Eszköz: ${data.app}` : null,
      data.renew_username ? `Fiók neve: ${data.renew_username}` : null,
      `Kapcsolat: ${data.contact || ""}`,
      `Idő: ${new Date().toISOString()}`
    ].filter(Boolean);

    return lines.join("\n");
  }

  function updateRenewUI() {
    const isRenew = typeEl.value === "Renewal";
    renewField.classList.toggle("hidden", !isRenew);
    renewInput.required = isRenew;
    if (!isRenew) renewInput.value = "";
  }

  function setTelegramPrefillLink(data) {
    if (!telegramPrefill) return;

    const text = encodeURIComponent(buildMessage(data));
    const deepLink = `tg://resolve?domain=${CONFIG.telegramUsername}&text=${text}`;
    const webFallback = `https://t.me/share/url?url=&text=${text}`;

    telegramPrefill.href = deepLink;
    telegramPrefill.setAttribute("data-fallback", webFallback);
  }

  function setTelegramCopyOpenFallback(data) {
    const msg = buildMessage(data);

    if (telegramCopy) telegramCopy.setAttribute("data-message", msg);
    if (telegramOpen) telegramOpen.href = `https://t.me/${CONFIG.telegramUsername}`;

    // ha van egy fallback dobozod, alapból rejtsük
    if (telegramFallback) telegramFallback.classList.add("hidden");
  }

  function updateTelegramUI(data) {
    // támogatjuk mindkét rendszert
    setTelegramPrefillLink(data);
    setTelegramCopyOpenFallback(data);
  }

  function showTelegramFallback() {
    // új UI-nál
    if (telegramFallback) telegramFallback.classList.remove("hidden");
  }

  function persistForThankYou(data) {
    const payload = {
      ...data,
      brand: CONFIG.brand,
      lang: CONFIG.language,
      savedAt: new Date().toISOString()
    };

    try {
      sessionStorage.setItem(CONFIG.sessionKey, JSON.stringify(payload));
    } catch (_) {
      // ignore
    }
  }

  function redirectToThankYou() {
    window.setTimeout(() => {
      window.location.href = CONFIG.thankYouUrl;
    }, CONFIG.redirectDelayMs);
  }

  /* =========================
     TELEGRAM UI EVENTS
     ========================= */

  // Old prefill click fallback (tg:// blocked -> web fallback)
  if (telegramPrefill) {
    telegramPrefill.addEventListener("click", () => {
      const fallback = telegramPrefill.getAttribute("data-fallback");
      if (!fallback) return;
      setTimeout(() => {
        try {
          window.location.href = fallback;
        } catch (_) {}
      }, 600);
    });
  }

  // New copy button behavior (optional)
  if (telegramCopy) {
    const original = telegramCopy.textContent || "Megrendelés másolása";
    telegramCopy.addEventListener("click", async () => {
      const msg = telegramCopy.getAttribute("data-message") || buildMessage(getFormData());
      try {
        await navigator.clipboard?.writeText?.(msg);
      } catch (_) {}
      telegramCopy.textContent = "✔ Másolva";
      telegramCopy.classList.add("is-copied");
      setTimeout(() => {
        telegramCopy.textContent = original;
        telegramCopy.classList.remove("is-copied");
      }, 2000);
    });
  }

  /* =========================
     INIT
     ========================= */
  updateRenewUI();
  updateTelegramUI(getFormData());

  typeEl.addEventListener("change", () => {
    updateRenewUI();
    updateTelegramUI(getFormData());
  });

  ["plan", "devices", "type", "app", "contact", "renew_username"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => updateTelegramUI(getFormData());
    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
  });

  /* =========================
     SUBMIT
     ========================= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "";

    // Honeypot
    if (companyEl && (companyEl.value || "").trim() !== "") {
      statusEl.textContent = T.errors.generic;
      return;
    }

    const data = getFormData();

    if (!data.plan || !data.devices || !data.type || !data.contact) {
      statusEl.textContent = T.errors.required;
      updateTelegramUI(data);
      return;
    }

    if (data.type === "Renewal" && !data.renew_username) {
      statusEl.textContent = T.errors.renew;
      updateTelegramUI(data);
      return;
    }

    updateTelegramUI(data);

    try {
      statusEl.textContent = T.sending;

      const payloadObj = {
        ...data,
        message: buildMessage(data),
        source: "website",
        brand: CONFIG.brand,
        lang: CONFIG.language
      };

      const payload = new URLSearchParams();
      Object.entries(payloadObj).forEach(([k, v]) => payload.append(k, String(v ?? "")));

      const res = await fetch(CONFIG.makeWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: payload.toString()
      });

      if (!res.ok) {
        statusEl.textContent = T.errors.sendFail;
        showTelegramFallback();
        return;
      }

      // ✅ siker
      statusEl.textContent = T.success;

      // mentsük a thank-you oldalnak (ellenőrzéshez / javításhoz)
      persistForThankYou(data);

      // reset form
      form.reset();
      updateRenewUI();
      updateTelegramUI(getFormData());

      // ✅ redirect késleltetéssel
      redirectToThankYou();
    } catch (_) {
      statusEl.textContent = T.errors.network;
      showTelegramFallback();
    }
  });
})();
      `Kapcsolat: ${data.contact || ""}`,
      `Idő: ${new Date().toISOString()}`
    ].filter(Boolean);

    return lines.join("\n");
  }

  function updateRenewUI() {
    const isRenew = typeEl.value === "Renewal";
    renewField.classList.toggle("hidden", !isRenew);
    renewInput.required = isRenew;
    if (!isRenew) renewInput.value = "";
  }

  function setTelegramPrefillLink(data) {
    if (!telegramPrefill) return;

    const text = encodeURIComponent(buildMessage(data));
    const deepLink = `tg://resolve?domain=${CONFIG.telegramUsername}&text=${text}`;
    const webFallback = `https://t.me/share/url?url=&text=${text}`;

    telegramPrefill.href = deepLink;
    telegramPrefill.setAttribute("data-fallback", webFallback);
  }

  function setTelegramCopyOpenFallback(data) {
    const msg = buildMessage(data);

    if (telegramCopy) telegramCopy.setAttribute("data-message", msg);
    if (telegramOpen) telegramOpen.href = `https://t.me/${CONFIG.telegramUsername}`;

    // ha van egy fallback dobozod, alapból rejtsük
    if (telegramFallback) telegramFallback.classList.add("hidden");
  }

  function updateTelegramUI(data) {
    // támogatjuk mindkét rendszert
    setTelegramPrefillLink(data);
    setTelegramCopyOpenFallback(data);
  }

  function showTelegramFallback() {
    // új UI-nál
    if (telegramFallback) telegramFallback.classList.remove("hidden");
  }

  function persistForThankYou(data) {
    const payload = {
      ...data,
      brand: CONFIG.brand,
      lang: CONFIG.language,
      savedAt: new Date().toISOString()
    };

    try {
      sessionStorage.setItem(CONFIG.sessionKey, JSON.stringify(payload));
    } catch (_) {
      // ignore
    }
  }

  function redirectToThankYou() {
    window.setTimeout(() => {
      window.location.href = CONFIG.thankYouUrl;
    }, CONFIG.redirectDelayMs);
  }

  /* =========================
     TELEGRAM UI EVENTS
     ========================= */

  // Old prefill click fallback (tg:// blocked -> web fallback)
  if (telegramPrefill) {
    telegramPrefill.addEventListener("click", () => {
      const fallback = telegramPrefill.getAttribute("data-fallback");
      if (!fallback) return;
      setTimeout(() => {
        try {
          window.location.href = fallback;
        } catch (_) {}
      }, 600);
    });
  }

  // New copy button behavior (optional)
  if (telegramCopy) {
    const original = telegramCopy.textContent || "Megrendelés másolása";
    telegramCopy.addEventListener("click", async () => {
      const msg = telegramCopy.getAttribute("data-message") || buildMessage(getFormData());
      try {
        await navigator.clipboard?.writeText?.(msg);
      } catch (_) {}
      telegramCopy.textContent = "✔ Másolva";
      telegramCopy.classList.add("is-copied");
      setTimeout(() => {
        telegramCopy.textContent = original;
        telegramCopy.classList.remove("is-copied");
      }, 2000);
    });
  }

  /* =========================
     INIT
     ========================= */
  updateRenewUI();
  updateTelegramUI(getFormData());

  typeEl.addEventListener("change", () => {
    updateRenewUI();
    updateTelegramUI(getFormData());
  });

  ["plan", "devices", "type", "app", "contact", "renew_username"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => updateTelegramUI(getFormData());
    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
  });

  /* =========================
     SUBMIT
     ========================= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "";

    // Honeypot
    if (companyEl && (companyEl.value || "").trim() !== "") {
      statusEl.textContent = T.errors.generic;
      return;
    }

    const data = getFormData();

    if (!data.plan || !data.devices || !data.type || !data.contact) {
      statusEl.textContent = T.errors.required;
      updateTelegramUI(data);
      return;
    }

    if (data.type === "Renewal" && !data.renew_username) {
      statusEl.textContent = T.errors.renew;
      updateTelegramUI(data);
      return;
    }

    updateTelegramUI(data);

    try {
      statusEl.textContent = T.sending;

      const payloadObj = {
        ...data,
        message: buildMessage(data),
        source: "website",
        brand: CONFIG.brand,
        lang: CONFIG.language
      };

      const payload = new URLSearchParams();
      Object.entries(payloadObj).forEach(([k, v]) => payload.append(k, String(v ?? "")));

      const res = await fetch(CONFIG.makeWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: payload.toString()
      });

      if (!res.ok) {
        statusEl.textContent = T.errors.sendFail;
        showTelegramFallback();
        return;
      }

      // ✅ siker
      statusEl.textContent = T.success;

      // mentsük a thank-you oldalnak (ellenőrzéshez / javításhoz)
      persistForThankYou(data);

      // reset form
      form.reset();
      updateRenewUI();
      updateTelegramUI(getFormData());

      // ✅ redirect késleltetéssel
      redirectToThankYou();
    } catch (_) {
      statusEl.textContent = T.errors.network;
      showTelegramFallback();
    }
  });
})();
     WHITE-LABEL CONFIG
     ========================= */
  const CONFIG = {
    brand: "MENIPTV",
    language: "hu", // "hu" | "en" | "pl"

    telegramUsername: "BigBoxTV",
    makeWebhookUrl: "https://hook.eu2.make.com/ide_ird_a_kodot",

    thankYouUrl: "thank-you.html",
    redirectDelayMs: 3000
  };

  /* =========================
     I18N STRINGS
     ========================= */
  const I18N = {
    hu: {
      newOrder: "📦 ÚJ RENDELÉS",
      type: "Típus",
      plan: "Csomag",
      devices: "Tartalom",
      app: "App/Eszköz",
      renewUser: "Fiók neve",
      contact: "Kapcsolat",
      time: "Idő",
      errors: {
        required: "Kérjük töltsd ki a kötelező mezőket.",
        renew: "Megújításhoz add meg a meglévő fiók nevét.",
        generic: "Hiba. Kérjük próbáld újra.",
        sendFail:
          "Nem sikerült elküldeni. Üzenet másolása → Telegram megnyitása → Beillesztés → Küldés",
        network:
          "Hálózati hiba. Üzenet másolása → Telegram megnyitása → Beillesztés → Küldés"
      },
      sending: "Küldés…",
      success: "✅ Rendelés elküldve! Néhány másodpercen belül továbbítunk…"
    },

    en: {
      newOrder: "📦 NEW ORDER",
      type: "Type",
      plan: "Plan",
      devices: "Content",
      app: "App/Device",
      renewUser: "Account name",
      contact: "Contact",
      time: "Time",
      errors: {
        required: "Please fill required fields.",
        renew: "Please enter your existing account name.",
        generic: "Error. Please try again.",
        sendFail:
          "Send failed. Copy message → Open Telegram → Paste → Send",
        network:
          "Network error. Copy message → Open Telegram → Paste → Send"
      },
      sending: "Sending…",
      success: "✅ Order sent! Redirecting shortly…"
    },

    pl: {
      newOrder: "📦 NOWE ZAMÓWIENIE",
      type: "Typ",
      plan: "Pakiet",
      devices: "Zawartość",
      app: "Aplikacja/Urządzenie",
      renewUser: "Nazwa konta",
      contact: "Kontakt",
      time: "Czas",
      errors: {
        required: "Uzupełnij wymagane pola.",
        renew: "Podaj nazwę istniejącego konta.",
        generic: "Błąd. Spróbuj ponownie.",
        sendFail:
          "Nie udało się wysłać. Skopiuj wiadomość → Otwórz Telegram → Wklej → Wyślij",
        network:
          "Błąd sieci. Skopiuj wiadomość → Otwórz Telegram → Wklej → Wyślij"
      },
      sending: "Wysyłanie…",
      success: "✅ Zamówienie wysłane! Za chwilę przekierujemy…"
    }
  };

  const T = I18N[CONFIG.language] || I18N.hu;

  /* =========================
     DOM HOOKS
     ========================= */
  const form = document.getElementById("orderForm");
  const statusEl = document.getElementById("status");
  const typeEl = document.getElementById("type");
  const renewField = document.getElementById("renewUserField");
  const renewInput = document.getElementById("renew_username");
  const telegramCopy = document.getElementById("copyOrderBtn");
  const telegramOpen = document.getElementById("openTelegram");
  const telegramFallback = document.getElementById("tgFallback");
  const companyEl = document.getElementById("company");

  if (!form || !statusEl || !typeEl || !renewField || !renewInput) return;

  /* =========================
     HELPERS
     ========================= */
  function getFormData() {
    return Object.fromEntries(new FormData(form).entries());
  }

  function buildMessage(data) {
    return [
      `${T.newOrder} – ${CONFIG.brand}`,
      `${T.type}: ${data.type || ""}`,
      `${T.plan}: ${data.plan || ""}`,
      `${T.devices}: ${data.devices || ""}`,
      data.app ? `${T.app}: ${data.app}` : null,
      data.renew_username ? `${T.renewUser}: ${data.renew_username}` : null,
      `${T.contact}: ${data.contact || ""}`,
      `${T.time}: ${new Date().toISOString()}`
    ]
      .filter(Boolean)
      .join("\n");
  }

  function updateRenewUI() {
    const isRenew = typeEl.value === "Renewal";
    renewField.classList.toggle("hidden", !isRenew);
    renewInput.required = isRenew;
    if (!isRenew) renewInput.value = "";
  }

  function updateTelegramFallback(data) {
    if (telegramCopy) {
      telegramCopy.setAttribute("data-message", buildMessage(data));
    }
    if (telegramOpen) {
      telegramOpen.href = `https://t.me/${CONFIG.telegramUsername}`;
    }
  }

  function redirectToThankYou() {
    window.setTimeout(() => {
      window.location.assign(CONFIG.thankYouUrl);
    }, CONFIG.redirectDelayMs);
  }

  /* =========================
     INIT
     ========================= */
  updateRenewUI();
  updateTelegramFallback(getFormData());
  if (telegramFallback) telegramFallback.classList.add("hidden");

  typeEl.addEventListener("change", () => {
    updateRenewUI();
    updateTelegramFallback(getFormData());
  });

  ["plan", "devices", "type", "app", "contact", "renew_username"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => updateTelegramFallback(getFormData());
    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
  });

  /* =========================
     SUBMIT
     ========================= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "";

    if (companyEl && companyEl.value.trim() !== "") {
      statusEl.textContent = T.errors.generic;
      return;
    }

    const data = getFormData();

    if (!data.plan || !data.devices || !data.type || !data.contact) {
      statusEl.textContent = T.errors.required;
      updateTelegramFallback(data);
      return;
    }

    if (data.type === "Renewal" && !data.renew_username) {
      statusEl.textContent = T.errors.renew;
      updateTelegramFallback(data);
      return;
    }

    try {
      statusEl.textContent = T.sending;
      if (telegramFallback) telegramFallback.classList.add("hidden");

      const payload = new URLSearchParams({
        ...data,
        message: buildMessage(data),
        source: "website",
        brand: CONFIG.brand,
        lang: CONFIG.language
      });

      const res = await fetch(CONFIG.makeWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: payload.toString()
      });

      if (!res.ok) {
        statusEl.textContent = T.errors.sendFail;
        if (telegramFallback) telegramFallback.classList.remove("hidden");
        return;
      }

      // ✅ SUCCESS
      statusEl.textContent = T.success;

      // disable form (no double submit)
      const submitBtn = form.querySelector(
        'button[type="submit"], input[type="submit"]'
      );
      if (submitBtn) submitBtn.disabled = true;

      Array.from(form.elements).forEach((el) => {
        if (el && typeof el.disabled === "boolean") el.disabled = true;
      });

      redirectToThankYou();
    } catch {
      statusEl.textContent = T.errors.network;
      if (telegramFallback) telegramFallback.classList.remove("hidden");
    }
  });
})();
    },

    en: {
      newOrder: "📦 NEW ORDER",
      type: "Type",
      plan: "Plan",
      devices: "Content",
      app: "App/Device",
      renewUser: "Account name",
      contact: "Contact",
      time: "Time",
      errors: {
        required: "Please fill required fields.",
        renew: "Please enter your existing account name.",
        generic: "Error. Please try again.",
        sendFail:
          "Send failed. Copy message → Open Telegram → Paste → Send",
        network:
          "Network error. Copy message → Open Telegram → Paste → Send"
      },
      sending: "Sending…",
      success: "✅ Order sent! We’ll reply shortly."
    },

    pl: {
      newOrder: "📦 NOWE ZAMÓWIENIE",
      type: "Typ",
      plan: "Pakiet",
      devices: "Zawartość",
      app: "Aplikacja/Urządzenie",
      renewUser: "Nazwa konta",
      contact: "Kontakt",
      time: "Czas",
      errors: {
        required: "Uzupełnij wymagane pola.",
        renew: "Podaj nazwę istniejącego konta.",
        generic: "Błąd. Spróbuj ponownie.",
        sendFail:
          "Nie udało się wysłać. Skopiuj wiadomość → Otwórz Telegram → Wklej → Wyślij",
        network:
          "Błąd sieci. Skopiuj wiadomość → Otwórz Telegram → Wklej → Wyślij"
      },
      sending: "Wysyłanie…",
      success: "✅ Zamówienie wysłane! Wkrótce odpowiemy."
    }
  };

  const T = I18N[CONFIG.language] || I18N.hu;

  /* =========================
     DOM HOOKS (DO NOT RENAME)
     ========================= */
  const form = document.getElementById("orderForm");
  const statusEl = document.getElementById("status");
  const typeEl = document.getElementById("type");
  const renewField = document.getElementById("renewUserField");
  const renewInput = document.getElementById("renew_username");
  const telegramCopy = document.getElementById("copyOrderBtn");
  const telegramOpen = document.getElementById("openTelegram");
  const telegramFallback = document.getElementById("tgFallback");
  const companyEl = document.getElementById("company");

  if (!form || !statusEl || !typeEl || !renewField || !renewInput) return;

  /* =========================
     HELPERS
     ========================= */
  function getFormData() {
    return Object.fromEntries(new FormData(form).entries());
  }

  function buildMessage(data) {
    const lines = [
      `${T.newOrder} – ${CONFIG.brand}`,
      `${T.type}: ${data.type || ""}`,
      `${T.plan}: ${data.plan || ""}`,
      `${T.devices}: ${data.devices || ""}`,
      data.app ? `${T.app}: ${data.app}` : null,
      data.renew_username ? `${T.renewUser}: ${data.renew_username}` : null,
      `${T.contact}: ${data.contact || ""}`,
      `${T.time}: ${new Date().toISOString()}`
    ].filter(Boolean);

    return lines.join("\n");
  }

  function updateRenewUI() {
    const isRenew = typeEl.value === "Renewal";
    renewField.classList.toggle("hidden", !isRenew);
    renewInput.required = isRenew;
    if (!isRenew) renewInput.value = "";
  }

  function updateTelegramFallback(data) {
    if (telegramCopy) {
      telegramCopy.setAttribute("data-message", buildMessage(data));
    }
    if (telegramOpen) {
      telegramOpen.href = `https://t.me/${CONFIG.telegramUsername}`;
    }
  }

  if (telegramCopy) {
    const originalCopyText = telegramCopy.textContent || "Megrendelés másolása";

    telegramCopy.addEventListener("click", async () => {
      const message =
        telegramCopy.getAttribute("data-message") || buildMessage(getFormData());

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(message);
        } catch (_) {
          // Silently fail
        }
      }

      telegramCopy.textContent = "✔ Másolva";
      telegramCopy.classList.add("is-copied");

      window.setTimeout(() => {
        telegramCopy.textContent = originalCopyText;
        telegramCopy.classList.remove("is-copied");
      }, 2000);
    });
  }

  /* =========================
     INIT
     ========================= */
  updateRenewUI();
  updateTelegramFallback(getFormData());
  if (telegramFallback) {
    telegramFallback.classList.add("hidden");
  }

  typeEl.addEventListener("change", () => {
    updateRenewUI();
    updateTelegramFallback(getFormData());
  });

  ["plan", "devices", "type", "app", "contact", "renew_username"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const handler = () => updateTelegramFallback(getFormData());
    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
  });

  /* =========================
     SUBMIT
     ========================= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "";

    if (companyEl && (companyEl.value || "").trim() !== "") {
      statusEl.textContent = T.errors.generic;
      return;
    }

    const data = getFormData();

    if (!data.plan || !data.devices || !data.type || !data.contact) {
      statusEl.textContent = T.errors.required;
      updateTelegramFallback(data);
      return;
    }

    if (data.type === "Renewal" && !data.renew_username) {
      statusEl.textContent = T.errors.renew;
      updateTelegramFallback(data);
      return;
    }

    updateTelegramFallback(data);

    try {
      statusEl.textContent = T.sending;
      if (telegramFallback) {
        telegramFallback.classList.add("hidden");
      }

      const payloadObj = {
        ...data,
        message: buildMessage(data),
        source: "website",
        brand: CONFIG.brand,
        lang: CONFIG.language
      };

      const payload = new URLSearchParams();
      Object.entries(payloadObj).forEach(([k, v]) =>
        payload.append(k, String(v ?? ""))
      );

      const res = await fetch(CONFIG.makeWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: payload.toString()
      });

      if (!res.ok) {
        statusEl.textContent =
          "Nem sikerült automatikusan elküldeni. Másold ki a megrendelést, majd illeszd be Telegramon.";
        if (telegramFallback) {
          telegramFallback.classList.remove("hidden");
        }
        return;
      }

      statusEl.textContent = T.success;
      if (telegramFallback) {
        telegramFallback.classList.add("hidden");
      }
      form.reset();
      updateRenewUI();
      updateTelegramFallback(getFormData());
    } catch {
      statusEl.textContent =
        "Nem sikerült automatikusan elküldeni. Másold ki a megrendelést, majd illeszd be Telegramon.";
      if (telegramFallback) {
        telegramFallback.classList.remove("hidden");
      }
    }
  });
})();
