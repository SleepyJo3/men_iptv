(() => {
  "use strict";

  const yearEl = document.getElementById("y");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  const notice = document.getElementById("renewalNotice");
  if (!notice) return;

  try {
    const raw = sessionStorage.getItem("meniptv_last_order");
    if (!raw) return;

    const data = JSON.parse(raw);
    if (data && data.type === "Renewal") {
      notice.classList.remove("is-hidden");
      notice.removeAttribute("hidden");
    }
  } catch {
    return;
  }
})();
