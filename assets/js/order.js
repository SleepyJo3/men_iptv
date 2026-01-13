(() => {
  /* =========================
     WHITE-LABEL CONFIG
     ========================= */
  const CONFIG = {
    brand: "MENIPTV",
    language: "hu", // "hu" | "en" | "pl"

    telegramUsername: "BigBoxTV",
    makeWebhookUrl: "https://hook.eu2.make.com/ide_ird_a_kodot"
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
      success: "✅ Rendelés elküldve! Hamarosan válaszolunk."
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
          "Send failed. Üzenet másolása → Telegram megnyitása → Beillesztés → Küldés",
        network:
          "Network error. Üzenet másolása → Telegram megnyitása → Beillesztés → Küldés"
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
          "Nie udało się wysłać. Üzenet másolása → Telegram megnyitása → Beillesztés → Küldés",
        network:
          "Błąd sieci. Üzenet másolása → Telegram megnyitása → Beillesztés → Küldés"
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
