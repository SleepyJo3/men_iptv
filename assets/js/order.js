(() => {
  const form = document.getElementById("orderForm");
  const statusEl = document.getElementById("status");
  const typeEl = document.getElementById("type");
  const renewField = document.getElementById("renewUserField");
  const renewInput = document.getElementById("renew_username");
  const telegramPrefill = document.getElementById("telegramPrefill");
  const companyEl = document.getElementById("company");

  // Ha a form nincs az oldalon, ne csináljunk semmit
  if (!form || !statusEl || !typeEl || !renewField || !renewInput) return;

  // ✅ Telegram public username / bot deep link (NO @)
  const TELEGRAM_PUBLIC_LINK = "https://t.me/RepGemS";

  // ✅ Make webhook URL
  const MAKE_WEBHOOK_URL = "https://hook.eu2.make.com/ide_masold_a_make_urlt";

  const safe = (v) => String(v ?? "").trim();

  function buildMessage(data) {
    const lines = [
      "📦 ÚJ MENIPTV RENDELÉS",
      `Típus: ${safe(data.type)}`,
      `Csomag: ${safe(data.plan)}`,
      `Tartalom: ${safe(data.devices)}`, // mező neve marad devices, csak a label "Tartalom"
      safe(data.app) ? `App/Eszköz: ${safe(data.app)}` : null,
      safe(data.renew_username) ? `Fiók neve: ${safe(data.renew_username)}` : null,
      `Kapcsolat: ${safe(data.contact)}`,
      `Idő: ${new Date().toISOString()}`
    ].filter(Boolean);

    return lines.join("\n");
  }

  function updateRenewUI() {
    const isRenew = typeEl.value === "Renewal";
    renewField.classList.toggle("hidden", !isRenew);
    renewInput.required = isRenew;

    // UX: ha nem renewal, töröljük a mezőt (hogy ne küldje véletlen)
    if (!isRenew) renewInput.value = "";
  }

  function setTelegramPrefill(data) {
    if (!telegramPrefill) return; // ha nincs gomb, ne haljon el
    const text = encodeURIComponent(buildMessage(data));
    telegramPrefill.href = `${TELEGRAM_PUBLIC_LINK}?text=${text}`;
  }

  updateRenewUI();
  typeEl.addEventListener("change", () => {
    updateRenewUI();
    const data = Object.fromEntries(new FormData(form).entries());
    setTelegramPrefill(data);
  });

  // Prefill frissítés mezőváltozásra
  ["plan", "devices", "type", "app", "contact", "renew_username"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const handler = () => {
      const data = Object.fromEntries(new FormData(form).entries());
      setTelegramPrefill(data);
    };

    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "";

    // Honeypot
    if (companyEl && safe(companyEl.value) !== "") {
      statusEl.textContent = "Hiba. Kérlek próbáld újra.";
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());

    // Required check
    if (!safe(data.plan) || !safe(data.devices) || !safe(data.type) || !safe(data.contact)) {
      statusEl.textContent = "Kérlek töltsd ki a kötelező mezőket.";
      return;
    }

    // Renewal check
    if (data.type === "Renewal" && !safe(data.renew_username)) {
      statusEl.textContent = "Megújításhoz add meg a meglévő felhasználóneved.";
      return;
    }

    setTelegramPrefill(data);

    try {
      statusEl.textContent = "Küldés folyamatban…";

      // Make payload (urlencoded – kevesebb CORS gond)
      const payloadObj = {
        ...data,
        message: buildMessage(data),
        source: "website"
      };

      const payload = new URLSearchParams();
      Object.entries(payloadObj).forEach(([k, v]) => payload.append(k, String(v ?? "")));

      const res = await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: payload.toString()
      });

      if (!res.ok) {
        statusEl.textContent = "Nem sikerült elküldeni. Küldd el Telegramon a kitöltött üzenetet.";
        return;
      }

      statusEl.textContent = "✅ Megrendelés elküldve! Hamarosan válaszolunk.";
      form.reset();
      updateRenewUI();

      // reset után frissítsük a Telegram linket is (üres állapot)
      const fresh = Object.fromEntries(new FormData(form).entries());
      setTelegramPrefill(fresh);
    } catch (err) {
      statusEl.textContent = "Hálózati hiba. Küldd el Telegramon a kitöltött üzenetet.";
    }
  });
})();
