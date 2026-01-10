/* =========================================================
   InfraForge Labs — main.js
   ========================================================= */

(function () {
  "use strict";

  /* -------------------------------------------------------
     Scroll Reveal + Section Visibility
     ------------------------------------------------------- */

  const revealTargets = document.querySelectorAll(".reveal, section");

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
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

    revealTargets.forEach(el => revealObserver.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add("visible"));
  }

  /* -------------------------------------------------------
     Scroll-aware Breadcrumb
     ------------------------------------------------------- */

  const breadcrumbLinks = document.querySelectorAll(".breadcrumb a");

  if ("IntersectionObserver" in window && breadcrumbLinks.length) {
    const sectionMap = new Map();

    breadcrumbLinks.forEach(link => {
      const id = link.getAttribute("href")?.replace("#", "");
      const section = document.getElementById(id);
      if (section) {
        sectionMap.set(section, link);
      }
    });

    const breadcrumbObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            breadcrumbLinks.forEach(l => l.classList.remove("active"));
            const activeLink = sectionMap.get(entry.target);
            if (activeLink) {
              activeLink.classList.add("active");
            }
          }
        });
      },
      {
        threshold: 0.45
      }
    );

    sectionMap.forEach((_, section) => breadcrumbObserver.observe(section));
  }

  /* -------------------------------------------------------
     Footer Year
     ------------------------------------------------------- */

  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = Math.max(2025, new Date().getFullYear());
  }

})();
