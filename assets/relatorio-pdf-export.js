/**
 * PDF: aguarda gráficos; antes de imprimir rasteriza Chart.js em PNG e só então
 * oculta o canvas (evita PDF em branco se a imagem não estiver pronta).
 * Remove snapshots no afterprint. Ctrl+P: só redimensiona canvas (sem snapshot).
 */
(function () {
  var BTN_LABEL = "Salvar como PDF";
  var WAIT_LABEL = "Aguardando gráficos…";
  var MAX_WAIT_MS = 120000;
  var printSnapshotRefs = [];

  function stampDate() {
    var el = document.getElementById("print-date-stamp");
    if (!el) return;
    el.textContent =
      "Gerado em " +
      new Date().toLocaleString("pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
      });
  }

  function resizeChartsForPrint() {
    if (typeof Chart === "undefined" || typeof Chart.getChart !== "function") {
      return;
    }
    var root = document.getElementById("relatorio-pdf-export");
    if (!root) return;
    var canvases = root.querySelectorAll("canvas");
    for (var i = 0; i < canvases.length; i++) {
      try {
        var ch = Chart.getChart(canvases[i]);
        if (ch) {
          ch.resize();
          ch.render();
        }
      } catch (_) {}
    }
  }

  function removeChartSnapshots() {
    for (var i = 0; i < printSnapshotRefs.length; i++) {
      var item = printSnapshotRefs[i];
      try {
        if (item.wrap && item.wrap.parentNode) {
          item.wrap.parentNode.removeChild(item.wrap);
        }
        if (item.canvas) {
          item.canvas.classList.remove("vulcan-print-hidden");
        }
      } catch (_) {}
    }
    printSnapshotRefs = [];
  }

  /**
   * Rasteriza cada gráfico em PNG; só oculta o canvas após decode da imagem.
   */
  function injectChartSnapshotsAsync() {
    removeChartSnapshots();
    if (typeof Chart === "undefined" || typeof Chart.getChart !== "function") {
      return Promise.resolve();
    }
    var root = document.getElementById("relatorio-pdf-export");
    if (!root) return Promise.resolve();

    var canvases = root.querySelectorAll("canvas");
    var promises = [];

    for (var j = 0; j < canvases.length; j++) {
      var canvas = canvases[j];
      var chart = Chart.getChart(canvas);
      if (!chart) continue;

      try {
        var hiddenHost = canvas.closest("[hidden]");
        if (hiddenHost) continue;

        chart.resize();
        chart.render();

        if (canvas.width < 4 || canvas.height < 4) continue;

        var dataUrl;
        try {
          dataUrl = canvas.toDataURL("image/png");
        } catch (_) {
          continue;
        }
        if (!dataUrl || dataUrl.length < 32) continue;

        var wrap = document.createElement("div");
        wrap.className = "print-chart-snapshot-wrap";
        wrap.setAttribute("aria-hidden", "true");

        var img = document.createElement("img");
        img.className = "print-chart-snapshot-img";
        img.src = dataUrl;
        img.alt = canvas.getAttribute("aria-label") || "Gráfico";

        wrap.appendChild(img);

        promises.push(
          new Promise(function (resolve) {
            function placeAndHide() {
              try {
                if (canvas.nextSibling) {
                  canvas.parentNode.insertBefore(wrap, canvas.nextSibling);
                } else {
                  canvas.parentNode.appendChild(wrap);
                }
                canvas.classList.add("vulcan-print-hidden");
                printSnapshotRefs.push({ canvas: canvas, wrap: wrap });
              } catch (_) {}
              resolve();
            }
            function skipHide() {
              resolve();
            }
            if (typeof img.decode === "function") {
              img.decode().then(placeAndHide).catch(skipHide);
            } else {
              img.onload = placeAndHide;
              img.onerror = skipHide;
            }
          })
        );
      } catch (_) {}
    }

    return Promise.all(promises);
  }

  function waitForAsyncCharts() {
    return new Promise(function (resolve) {
      var deadline = Date.now() + MAX_WAIT_MS;
      function ready() {
        return (
          window.__vulcanIncidentChartReady === true &&
          window.__vulcanCisChartsReady === true
        );
      }
      if (ready()) {
        resolve();
        return;
      }
      var id = window.setInterval(function () {
        if (ready() || Date.now() > deadline) {
          window.clearInterval(id);
          resolve();
        }
      }, 80);
    });
  }

  function waitForPaint() {
    return new Promise(function (resolve) {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          window.setTimeout(resolve, 200);
        });
      });
    });
  }

  function restorePdfButton(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = BTN_LABEL;
  }

  function onBeforePrint() {
    stampDate();
    resizeChartsForPrint();
  }

  function onAfterPrint() {
    removeChartSnapshots();
  }

  function runPrint() {
    var btn = document.getElementById("relatorio-pdf-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = WAIT_LABEL;
    }

    waitForAsyncCharts()
      .then(waitForPaint)
      .then(function () {
        stampDate();
        resizeChartsForPrint();
        return waitForPaint();
      })
      .then(function () {
        resizeChartsForPrint();
        return waitForPaint();
      })
      .then(function () {
        return injectChartSnapshotsAsync();
      })
      .then(waitForPaint)
      .then(function () {
        var restored = false;
        function finish() {
          if (restored) return;
          restored = true;
          removeChartSnapshots();
          restorePdfButton(btn);
        }
        function onAfterPrintBtn() {
          window.removeEventListener("afterprint", onAfterPrintBtn);
          finish();
        }
        window.addEventListener("afterprint", onAfterPrintBtn);
        window.setTimeout(finish, 5000);
        try {
          window.print();
        } catch (_) {
          finish();
        }
      })
      .catch(function () {
        restorePdfButton(btn);
      });
  }

  function init() {
    var btn = document.getElementById("relatorio-pdf-btn");
    if (btn) {
      btn.addEventListener("click", runPrint);
    }
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
