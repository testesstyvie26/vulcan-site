/**
 * Resumo visual — vetores iniciais citados no DBIR (ordens de grandeza públicas).
 * Atualize os valores quando citar nova edição do relatório no HTML.
 */
(function () {
  /* Percentuais aproximados (DBIR 2024, amostra global — mesma base do texto da página) */
  const SLICES = {
    labels: [
      "Uso ou roubo de credenciais",
      "Phishing",
      "Exploração de vulnerabilidade",
      "Demais vetores iniciais",
    ],
    /* Três primeiros: texto da página; último: saldo para fechar 100% na visualização */
    values: [38, 15, 4, 43],
  };

  function run() {
    const canvas = document.getElementById("incident-summary-chart-canvas");
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext("2d");
    const colors = [
      "rgba(103, 232, 249, 0.88)",
      "rgba(59, 130, 246, 0.82)",
      "rgba(251, 146, 60, 0.78)",
      "rgba(255, 255, 255, 0.14)",
    ];
    const borders = [
      "rgba(103, 232, 249, 1)",
      "rgba(59, 130, 246, 1)",
      "rgba(251, 146, 60, 1)",
      "rgba(255, 255, 255, 0.28)",
    ];

    if (window.__incidentSummaryChart) {
      window.__incidentSummaryChart.destroy();
    }

    window.__incidentSummaryChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: SLICES.labels,
        datasets: [
          {
            data: SLICES.values,
            backgroundColor: colors,
            borderColor: borders,
            borderWidth: 1,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "52%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "rgba(255,255,255,.72)",
              padding: 12,
              font: { size: 11 },
              boxWidth: 12,
            },
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const v = ctx.raw;
                return " ~" + v + "% do recorte visual (aprox.)";
              },
            },
          },
        },
      },
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
