/**
 * Gráfico com dados públicos Ransomware.live (organizações/vítimas divulgadas).
 * Atualiza a cada carregamento da página a partir da API oficial.
 */
(function () {
  const API = "https://api.ransomware.live/v2";
  const BR = "BR";

  /**
   * A API oficial costuma não expor CORS para origens arbitrárias; o navegador
   * bloqueia fetch direto. Tentamos direto e, se falhar, usamos AllOrigins (JSON bruto).
   */
  async function fetchJson(url) {
    const tryDirect = async () => {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    };
    const tryAllOrigins = async () => {
      const proxy =
        "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
      const r = await fetch(proxy, { cache: "no-store" });
      if (!r.ok) throw new Error("allorigins " + r.status);
      const text = await r.text();
      return JSON.parse(text);
    };
    const tryCorsProxy = async () => {
      const proxy = "https://corsproxy.io/?" + encodeURIComponent(url);
      const r = await fetch(proxy, { cache: "no-store" });
      if (!r.ok) throw new Error("corsproxy " + r.status);
      return r.json();
    };
    try {
      return await tryDirect();
    } catch (first) {
      console.warn("[incident-chart] fetch direto falhou (CORS/rede)", first);
      try {
        return await tryAllOrigins();
      } catch (second) {
        console.warn("[incident-chart] AllOrigins falhou, tentando corsproxy.io", second);
        return tryCorsProxy();
      }
    }
  }

  function fmtDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  }

  function setStatus(el, text, isError) {
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("incident-chart-status--error", !!isError);
  }

  async function load() {
    const statusEl = document.getElementById("incident-chart-status");
    const footEl = document.getElementById("incident-chart-foot");
    const canvas = document.getElementById("incident-chart-canvas");
    if (!canvas || !window.Chart) {
      setStatus(statusEl, "Gráfico indisponível neste navegador.", true);
      return;
    }

    setStatus(statusEl, "Carregando dados públicos…", false);

    try {
      const [info, brList] = await Promise.all([
        fetchJson(`${API}/info`),
        fetchJson(`${API}/countryvictims/${BR}`),
      ]);

      const total =
        info &&
        info.Victims &&
        typeof info.Victims.Numbers === "number"
          ? info.Victims.Numbers
          : null;
      const brCount = Array.isArray(brList) ? brList.length : 0;

      if (total === null || total < brCount) {
        throw new Error("dados inválidos");
      }

      const rest = Math.max(0, total - brCount);
      const updated =
        (info.Victims && info.Victims["Last Update json"]) || "";

      if (footEl) {
        footEl.textContent =
          "Base atualizada em " +
          fmtDate(updated) +
          " (fonte: Ransomware.live).";
      }

      setStatus(statusEl, "", false);

      const ctx = canvas.getContext("2d");
      const cyan = "rgba(103, 232, 249, 0.85)";
      const blue = "rgba(59, 130, 246, 0.75)";

      if (window.__incidentChart) {
        window.__incidentChart.destroy();
      }

      window.__incidentChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: [
            "Brasil (organizações na base)",
            "Demais países (mesma base global)",
          ],
          datasets: [
            {
              label: "Organizações listadas",
              data: [brCount, rest],
              backgroundColor: [cyan, blue],
              borderColor: ["rgba(103, 232, 249, 1)", "rgba(59, 130, 246, 1)"],
              borderWidth: 1,
              borderRadius: 8,
              maxBarThickness: 72,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const n = ctx.raw;
                  return (
                    n.toLocaleString("pt-BR") +
                    " organizações (vítimas de ransomware divulgadas)"
                  );
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: "rgba(255,255,255,.06)" },
              ticks: {
                color: "rgba(255,255,255,.65)",
                maxRotation: 0,
                font: { size: 12 },
              },
            },
            y: {
              beginAtZero: true,
              grid: { color: "rgba(255,255,255,.08)" },
              ticks: {
                color: "rgba(255,255,255,.5)",
                font: { size: 11 },
              },
            },
          },
        },
      });
    } catch (e) {
      console.warn("[incident-chart]", e);
      setStatus(
        statusEl,
        "Não foi possível carregar os dados agora. Verifique a conexão ou tente mais tarde.",
        true
      );
      if (footEl) footEl.textContent = "";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
