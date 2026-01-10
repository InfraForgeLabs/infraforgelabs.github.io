/* =========================================================
   InfraForge Labs — main.js
   ========================================================= */

(function () {
  "use strict";

  /* -------------------------------------------------------
     First Visit Detection (Hero + Breadcrumb Fade-In)
     ------------------------------------------------------- */

  const FIRST_VISIT_KEY = "ifl-first-visit";

  if (!localStorage.getItem(FIRST_VISIT_KEY)) {
    document.body.classList.add("first-visit");
    localStorage.setItem(FIRST_VISIT_KEY, "true");
  }

  /* -------------------------------------------------------
     Scroll Reveal + Section Fade-In Continuity
     ------------------------------------------------------- */

  const revealTargets = document.querySelectorAll(".reveal, section");

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealTargets.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback for very old browsers
    revealTargets.forEach(el => el.classList.add("visible"));
  }

  /* -------------------------------------------------------
     Scroll-Aware Breadcrumb (Active Section)
     ------------------------------------------------------- */

  const breadcrumbLinks = document.querySelectorAll(".breadcrumb a");

  if ("IntersectionObserver" in window && breadcrumbLinks.length) {
    const sectionToLink = new Map();

    breadcrumbLinks.forEach(link => {
      const targetId = link.getAttribute("href")?.replace("#", "");
      const section = document.getElementById(targetId);
      if (section) {
        sectionToLink.set(section, link);
      }
    });

    const breadcrumbObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            breadcrumbLinks.forEach(l => l.classList.remove("active"));
            const activeLink = sectionToLink.get(entry.target);
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

    sectionToLink.forEach((_, section) =>
      breadcrumbObserver.observe(section)
    );
  }

/* -------------------------------------------------------
   Scroll-To-Top Button
   ------------------------------------------------------- */

const scrollBtn = document.getElementById("scrollTop");

if (scrollBtn) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 400) {
      scrollBtn.classList.add("visible");
    } else {
      scrollBtn.classList.remove("visible");
    }
  });

  scrollBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
   
  /* -------------------------------------------------------
     Footer Year
     ------------------------------------------------------- */

  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = Math.max(2025, new Date().getFullYear());
  }

})();

/* -------------------------------------------------------
   Product Version Fetch (DevOpsMind)
   ------------------------------------------------------- */

const devopsMindVersionEl = document.getElementById("devopsmind-version");

if (devopsMindVersionEl) {
  fetch(
    "https://raw.githubusercontent.com/InfraForgeLabs/infraforgelabs.github.io/main/meta/devopsmind/version.json",
    { cache: "no-store" }
  )
    .then(res => {
      if (!res.ok) throw new Error("Version fetch failed");
      return res.json();
    })
    .then(data => {
      if (data.latest_version) {
        devopsMindVersionEl.textContent = `v${data.latest_version}`;
        devopsMindVersionEl.title = `Released ${data.released_at}`;
      }
    })
    .catch(() => {
      // Silent fail: keep UI clean if offline
      devopsMindVersionEl.style.display = "none";
    });
}

/* -------------------------------------------------------
   Product Version Fetch (InfraForge)
   ------------------------------------------------------- */

const infraForgeVersionEl = document.getElementById("infraforge-version");

if (infraForgeVersionEl) {
  fetch(
    "https://raw.githubusercontent.com/InfraForgeLabs/infraforgelabs.github.io/main/meta/infraforge/version.json",
    { cache: "no-store" }
  )
    .then(res => {
      if (!res.ok) throw new Error("Version fetch failed");
      return res.json();
    })
    .then(data => {
      if (data.latest_version) {
        infraForgeVersionEl.textContent = `v${data.latest_version}`;
        infraForgeVersionEl.title = `Released ${data.released_at}`;
      }
    })
    .catch(() => {
      infraForgeVersionEl.style.display = "none";
    });
}

