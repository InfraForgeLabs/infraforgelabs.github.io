/* =========================================================
   InfraForge Labs — main.js
   ========================================================= */

(function () {
  "use strict";

  const revealTargets = document.querySelectorAll(".reveal, section");

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
      { threshold: 0.12 }
    );

    revealTargets.forEach(el => observer.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add("visible"));
  }

  /* Footer year */
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = Math.max(2025, new Date().getFullYear());
  }
})();
