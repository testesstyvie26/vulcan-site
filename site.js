(function () {
  "use strict";

  var header = document.querySelector("body > header");
  if (!header) return;

  var main = document.querySelector("main");
  if (main) {
    main.id = main.id || "conteudo-principal";
    var skipLink = document.createElement("a");
    skipLink.className = "skip-link";
    skipLink.href = "#" + main.id;
    skipLink.textContent = "Ir para o conteúdo principal";
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  var headerWrap = header.querySelector(".header-wrap");
  var nav = headerWrap && headerWrap.querySelector(":scope > nav");
  if (!headerWrap || !nav) return;

  nav.id = nav.id || "primary-navigation";
  nav.setAttribute("aria-label", "Navegação principal");

  var menuButton = document.createElement("button");
  menuButton.className = "menu-toggle";
  menuButton.type = "button";
  menuButton.setAttribute("aria-controls", nav.id);
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Abrir menu");
  menuButton.innerHTML = '<span></span><span></span><span></span>';
  headerWrap.insertBefore(menuButton, nav);

  function setMenu(open) {
    header.classList.toggle("menu-open", open);
    document.body.classList.toggle("nav-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }

  menuButton.addEventListener("click", function () {
    setMenu(!header.classList.contains("menu-open"));
  });

  nav.addEventListener("click", function (event) {
    if (event.target.closest("a") && window.innerWidth <= 980) setMenu(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && header.classList.contains("menu-open")) {
      setMenu(false);
      menuButton.focus();
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 980) setMenu(false);
  });

  var currentPage = window.location.pathname.split("/").pop() || "index.html";
  nav.querySelectorAll("a").forEach(function (link) {
    var target = (link.getAttribute("href") || "").split("#")[0];
    if (!target || target.indexOf(":") !== -1) return;
    var isCurrent = target === currentPage;
    link.classList.toggle("active", isCurrent);
    if (isCurrent) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  nav.querySelectorAll(".has-submenu").forEach(function (item) {
    if (item.querySelector(".submenu a[aria-current='page']")) {
      var parentLink = item.querySelector(":scope > a");
      if (parentLink) parentLink.classList.add("active");
    }
  });

  var progress = document.createElement("div");
  progress.className = "reading-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.appendChild(progress);

  function updatePageState() {
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
    progress.style.transform = "scaleX(" + ratio + ")";
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  updatePageState();
  window.addEventListener("scroll", updatePageState, { passive: true });

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sections = document.querySelectorAll("main > section");
  if (!reducedMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("motion-ready");
    sections.forEach(function (section) { section.classList.add("site-reveal"); });
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        sectionObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.04 });
    sections.forEach(function (section) { sectionObserver.observe(section); });
  }
})();
