(() => {
  const form = document.getElementById("orderForm");
  const statusEl = document.getElementById("status");
  const typeEl = document.getElementById("type");
  const renewField = document.getElementById("renewUserField");
  const renewInput = document.getElementById("renew_username");
  const telegramPrefill = document.getElementById("telegramPrefill");

  // OPTIONAL: your Telegram public username OR bot deep link for prefill fallback
  // ✅ IMPORTANT: no "@" in the URL
  const TELEGRAM_PUBLIC_LINK = "https://t.me/RepGemS";

  // ✅ MAKE WEBHOOK URL (API key auth will be OFF in Make)
  const MAKE_WEBHOOK_URL = "https://hook.eu2.make.com/ide_masold_a_make_urlt";

function buildMessage(data) {
  const lines = [
    "📦 ÚJ MENIPTV RENDELÉS",
    `Típus: ${data.type}`,
    `Csomag: ${data.plan}`,
    `Tartalom: ${data.devices}`, // <- csak szövegben átnevezve
    data.app ? `App/Eszköz: ${data.app}` : null,
    data.renew_username ? `Fiók neve: ${data.renew_username}` : null,
    `Kapcsolat: ${data.contact}`,
    `Idő: ${new Date().toISOString()}`
  ].filter(Boolean);
  return lines.join("\n");
}


  function updateRenewUI() {
    const isRenew = typeEl.value === "Renewal";
    renewField.classList.toggle("hidden", !isRenew);
    renewInput.required = isRenew;
  }

  function setTelegramPrefill(data) {
    const text = encodeURIComponent(buildMessage(data));
    telegramPrefill.href = `${TELEGRAM_PUBLIC_LINK}?text=${text}`;
  }

  updateRenewUI();
  typeEl.addEventListener("change", updateRenewUI);

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
    if ((document.getElementById("company").value || "").trim() !== "") {
      statusEl.textContent = "Error. Please try again.";
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());

    if (!data.plan || !data.devices || !data.type || !data.contact) {
      statusEl.textContent = "Please fill required fields.";
      return;
    }
    if (data.type === "Renewal" && !data.renew_username) {
      statusEl.textContent = "Please add your renewal username.";
      return;
    }

    setTelegramPrefill(data);

    try {
      statusEl.textContent = "Sending…";

      // ✅ SOLUTION A: "simple" POST to avoid CORS preflight issues
      // Send as application/x-www-form-urlencoded
      const payloadObj = {
        ...data,
        message: buildMessage(data),
        source: "website"
      };

      const payload = new URLSearchParams();
      Object.entries(payloadObj).forEach(([k, v]) => {
        payload.append(k, String(v ?? ""));
      });

      const res = await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: payload.toString()
      });

      if (!res.ok) {
        statusEl.textContent =
          "Send failed. Open Telegram and send the prefilled message.";
        return;
      }

      statusEl.textContent = "✅ Order sent! We’ll reply shortly.";
      form.reset();
      updateRenewUI();
    } catch (err) {
      statusEl.textContent =
        "Network error. Open Telegram and send the prefilled message.";
    }
  });
})();
