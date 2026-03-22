/**
 * Gráfico estático (dados de relatório público Gartner, jul/2025).
 * Atualize os valores quando houver nova previsão oficial.
 */
(function () {
  /* USD bilhões — Gartner: Worldwide end-user spending on information security, 2025 */
  const SEGMENTS = {
    labels: [
      "Software de segurança",
      "Serviços de segurança",
      "Segurança de rede",
    ],
    values: [105.9, 83.8, 23.3],
  };

  function run() {
    const canvas = document.getElementById("spending-chart-canvas");
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext("2d");
    const colors = [
      "rgba(103, 232, 249, 0.85)",
      "rgba(59, 130, 246, 0.8)",
      "rgba(167, 139, 250, 0.85)",
    ];
    const borders = [
      "rgba(103, 232, 249, 1)",
      "rgba(59, 130, 246, 1)",
      "rgba(167, 139, 250, 1)",
    ];

    if (window.__spendingChart) {
      window.__spendingChart.destroy();
    }

    window.__spendingChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: SEGMENTS.labels,
        datasets: [
          {
            data: SEGMENTS.values,
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
        cutout: "58%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "rgba(255,255,255,.72)",
              padding: 14,
              font: { size: 12 },
            },
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const v = ctx.raw;
                const total = ctx.dataset.data.reduce(function (a, b) {
                  return a + b;
                }, 0);
                const pct = ((v / total) * 100).toFixed(1);
                return (
                  " US$ " +
                  v.toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  }) +
                  " bi (" +
                  pct +
                  "%)"
                );
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
