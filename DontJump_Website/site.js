(function () {
  const cfg = window.DONT_JUMP_SITE || {};
  const email = cfg.supportEmail || "REPLACE-WITH-YOUR-SUPPORT-EMAIL@example.com";

  document.querySelectorAll("[data-support-email]").forEach(el => {
    el.textContent = email;
    if (el.tagName === "A") el.href = "mailto:" + email;
  });

  document.querySelectorAll("[data-status]").forEach(el => {
    el.textContent = cfg.gameStatus || "Coming soon to iPhone";
  });

  const year = new Date().getFullYear();
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = year);
})();