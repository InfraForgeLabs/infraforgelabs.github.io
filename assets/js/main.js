/* =========================================================
   InfraForge Labs — main.js
   - Scroll Reveal
   - Small UI helpers
   ========================================================= */

(function () {
  "use strict";

  /* -------------------------
     Scroll Reveal
     ------------------------- */

  const revealElements = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealElements.forEach(el => observer.observe(el));
  } else {
    // Fallback for very old browsers
    revealElements.forEach(el => el.classList.add("visible"));
  }

  /* -------------------------
     Dynamic Year (Footer)
     ------------------------- */

  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = Math.max(2025, new Date().getFullYear());
  }

})();
