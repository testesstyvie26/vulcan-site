/**
 * Gráficos locais opcionais — dados em assets/cis-anpd-snapshot.json
 * (espelho dos cortes do painel ANPD embutido; a fonte oficial é o iframe Power BI).
 */
(function () {
  function sumItems(items) {
    if (!items || !items.length) return 0;
    return items.reduce(function (acc, x) {
      var v = Number(x.value);
      return acc + (isFinite(v) && v > 0 ? v : 0);
    }, 0);
  }

  function run(data) {
    var tipo = data.tipoComunicacao;
    var setor = data.setor;
    var sumTipo = sumItems(tipo);
    var sumSetor = sumItems(setor);

    var wrap = document.getElementById("cis-privacy-charts-wrap");
    if (!wrap || !window.Chart) return;
    if (sumTipo === 0 && sumSetor === 0) {
      wrap.setAttribute("hidden", "");
      return;
    }
    wrap.removeAttribute("hidden");

    var grid = wrap.querySelector(".visal-cis-charts-grid");
    if (grid) {
      grid.classList.toggle(
        "visal-cis-charts-grid--single",
        (sumTipo > 0) !== (sumSetor > 0)
      );
    }

    var palette = {
      fill: [
        "rgba(196, 181, 253, 0.88)",
        "rgba(129, 140, 248, 0.82)",
        "rgba(167, 139, 250, 0.78)",
        "rgba(216, 180, 254, 0.72)",
      ],
      border: [
        "rgba(196, 181, 253, 1)",
        "rgba(129, 140, 248, 1)",
        "rgba(167, 139, 250, 1)",
        "rgba(216, 180, 254, 1)",
      ],
    };

    if (sumTipo > 0) {
      var c1 = document.getElementById("cis-chart-tipo-canvas");
      if (c1) {
        var labelsT = tipo.map(function (x) {
          return x.label;
        });
        var valsT = tipo.map(function (x) {
          return Math.max(0, Number(x.value) || 0);
        });
        var ctx1 = c1.getContext("2d");
        if (window.__cisChartTipo) window.__cisChartTipo.destroy();
        window.__cisChartTipo = new Chart(ctx1, {
          type: "bar",
          data: {
            labels: labelsT,
            datasets: [
              {
                label: "Comunicações",
                data: valsT,
                backgroundColor: valsT.map(function (_, i) {
                  return palette.fill[i % palette.fill.length];
                }),
                borderColor: valsT.map(function (_, i) {
                  return palette.border[i % palette.border.length];
                }),
                borderWidth: 1,
                borderRadius: 6,
              },
            ],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function (ctx) {
                    return " " + ctx.formattedValue + " comunicações";
                  },
                },
              },
            },
            scales: {
              x: {
                beginAtZero: true,
                grid: { color: "rgba(255,255,255,.06)" },
                ticks: { color: "rgba(255,255,255,.55)" },
              },
              y: {
                grid: { display: false },
                ticks: { color: "rgba(255,255,255,.72)", font: { size: 11 } },
              },
            },
          },
        });
      }
    }

    if (sumSetor > 0) {
      var c2 = document.getElementById("cis-chart-setor-canvas");
      if (c2) {
        var labelsS = setor.map(function (x) {
          return x.label;
        });
        var valsS = setor.map(function (x) {
          return Math.max(0, Number(x.value) || 0);
        });
        var ctx2 = c2.getContext("2d");
        if (window.__cisChartSetor) window.__cisChartSetor.destroy();
        window.__cisChartSetor = new Chart(ctx2, {
          type: "doughnut",
          data: {
            labels: labelsS,
            datasets: [
              {
                data: valsS,
                backgroundColor: [
                  "rgba(196, 181, 253, 0.88)",
                  "rgba(99, 102, 241, 0.82)",
                  "rgba(167, 139, 250, 0.75)",
                ],
                borderColor: [
                  "rgba(196, 181, 253, 1)",
                  "rgba(99, 102, 241, 1)",
                  "rgba(167, 139, 250, 1)",
                ],
                borderWidth: 1,
                hoverOffset: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "54%",
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  color: "rgba(255,255,255,.72)",
                  padding: 12,
                  font: { size: 11 },
                },
              },
              tooltip: {
                callbacks: {
                  label: function (ctx) {
                    var v = ctx.raw;
                    var total = ctx.dataset.data.reduce(function (a, b) {
                      return a + b;
                    }, 0);
                    var pct = total ? ((v / total) * 100).toFixed(1) : "0";
                    return " " + v + " (" + pct + "%)";
                  },
                },
              },
            },
          },
        });
      }
    }

    var colTipo = document.getElementById("cis-chart-tipo-col");
    var colSetor = document.getElementById("cis-chart-setor-col");
    if (colTipo) colTipo.style.display = sumTipo > 0 ? "" : "none";
    if (colSetor) colSetor.style.display = sumSetor > 0 ? "" : "none";
  }

  function signalCisChartsReady() {
    try {
      window.__vulcanCisChartsReady = true;
      document.dispatchEvent(
        new CustomEvent("vulcan:cis-charts-ready", { bubbles: true })
      );
    } catch (_) {}
  }

  function init() {
    fetch("assets/cis-anpd-snapshot.json?v=1", { cache: "no-store" })
      .then(function (r) {
        return r.json();
      })
      .then(run)
      .catch(function () {
        var wrap = document.getElementById("cis-privacy-charts-wrap");
        if (wrap) wrap.setAttribute("hidden", "");
      })
      .finally(signalCisChartsReady);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
