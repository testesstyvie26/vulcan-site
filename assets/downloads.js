(function () {
  "use strict";

  var packages = [
    { id: "windows", os: ["win"], selector: "[data-dl-os='windows']" },
    { id: "deb", os: ["linux"], selector: "[data-dl-os='deb']" },
    { id: "rpm", os: ["linux"], selector: "[data-dl-os='rpm']" }
  ];

  function detectPlatform() {
    var ua = navigator.userAgent || "";
    var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    var blob = (ua + " " + platform).toLowerCase();
    if (/win/.test(blob)) return "windows";
    if (/mac|iphone|ipad/.test(blob)) return "macos";
    if (/linux|android|x11/.test(blob)) {
      if (/fedora|red hat|centos|rhel|suse|opensuse|rocky|alma/.test(blob)) return "rpm";
      return "deb";
    }
    return "";
  }

  function highlightSuggested() {
    var suggested = detectPlatform();
    var hint = document.getElementById("dl-os-hint");
    if (!suggested) {
      if (hint) hint.hidden = true;
      return;
    }
    var labels = { windows: "Windows", deb: "Linux (.deb)", rpm: "Linux (.rpm)", macos: "macOS" };
    packages.forEach(function (pkg) {
      if (pkg.id === suggested) {
        document.querySelectorAll(pkg.selector).forEach(function (el) {
          el.classList.add("is-suggested");
        });
      }
    });
    if (hint && labels[suggested]) {
      hint.hidden = false;
      hint.innerHTML = "Detectamos <strong>" + labels[suggested] + "</strong> neste navegador — o pacote correspondente está destacado abaixo.";
    }
    if (suggested === "macos" && hint) {
      hint.innerHTML = "Detectamos <strong>macOS</strong>. O instalador universal para Mac será disponibilizado em breve; entre em contato para build antecipada.";
    }
  }

  document.querySelectorAll("[data-copy-sha]").forEach(function (button) {
    button.addEventListener("click", function () {
      var hash = button.getAttribute("data-copy-sha");
      if (!hash || !navigator.clipboard) return;
      navigator.clipboard.writeText(hash).then(function () {
        var prev = button.textContent;
        button.textContent = "Copiado";
        setTimeout(function () { button.textContent = prev; }, 1600);
      });
    });
  });

  highlightSuggested();
})();
