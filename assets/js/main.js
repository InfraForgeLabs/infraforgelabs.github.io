/* =========================================================
   InfraForge Labs — main.js
   ========================================================= */

(function () {
  "use strict";


/* =====================================================
   First-Visit Full Page Fade-In
   ===================================================== */

(function () {
  const KEY = "ifl-first-visit";

  // If already visited, do nothing
  if (localStorage.getItem(KEY)) return;

  // Mark first visit immediately
  localStorage.setItem(KEY, "true");

  // Add marker class before render
  document.documentElement.classList.add("first-visit");

  // Fade in once DOM is ready
  window.addEventListener("DOMContentLoaded", () => {
    requestAnimationFrame(() => {
      document.body.classList.add("page-loaded");
    });
  });
})();
   

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

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
}


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
      if (data.latest_version && data.released_at) {
        devopsMindVersionEl.innerHTML =
          `v${data.latest_version} <span class="date">· released on ${formatDate(data.released_at)}</span>`;
        devopsMindVersionEl.title = `Released on ${data.released_at}`;
      }
    })
    .catch(() => {
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
      if (!data.latest_version) throw new Error("latest_version missing");

      const releasedAt = data.released_at
        ? ` <span class="date">· released on ${formatDate(data.released_at)}</span>`
        : "";

      infraForgeVersionEl.innerHTML =
        `v${data.latest_version}${releasedAt}`;

      if (data.released_at) {
        infraForgeVersionEl.title = `Released on ${data.released_at}`;
      }
    })
    .catch(() => {
      infraForgeVersionEl.style.display = "none";
    });
}



/* =====================================================
   Fade-Out Navigation + Progressive Loader
   ===================================================== */

document.addEventListener("click", function (e) {
  const link = e.target.closest("a[data-fade-link]");
  if (!link) return;

  // Respect modifiers & new tab
  if (
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey ||
    link.target === "_blank"
  ) {
    return;
  }

  const href = link.getAttribute("href");
  if (!href) return;

  e.preventDefault();

  const loader = document.getElementById("nav-loader");
  let loaderTimer;

  // Start fade-out
  document.body.classList.add("fade-out");

  // Show loader ONLY if navigation is slow
  loaderTimer = setTimeout(() => {
    if (loader) loader.classList.add("visible");
  }, 400);

  // Navigate
  setTimeout(() => {
    window.location.href = href;
  }, 350);

  // Safety cleanup (in case of interruption)
  window.addEventListener("pagehide", () => {
    clearTimeout(loaderTimer);
  });
});
