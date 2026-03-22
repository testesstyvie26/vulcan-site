/**
 * Gráfico com dados públicos Ransomware.live (organizações/vítimas divulgadas).
 * CORS: a API costuma não liberar origem no navegador — tentamos vários proxies públicos
 * e, se tudo falhar, usamos o último resultado salvo em localStorage (cache).
 */
(function () {
  const API = "https://api.ransomware.live/v2";
  const BR = "BR";
  const CACHE_KEY = "vulcan_rl_incident_v1";
  const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  /** Fallback sem CORS: JSON no mesmo domínio (assets/ransomware-snapshot.json). */
  const SNAPSHOT_URL = "assets/ransomware-snapshot.json?v=1";

  /** Sem fetch direto à API: ela não expõe CORS no navegador (sempre falharia com ruído no console). */
  function buildProxyChain(url) {
    return [
      {
        name: "allorigins-raw",
        u: "https://api.allorigins.win/raw?url=" + encodeURIComponent(url),
      },
      {
        name: "allorigins-get",
        u: "https://api.allorigins.win/get?url=" + encodeURIComponent(url),
        parseGet: true,
      },
      {
        name: "corsproxy",
        u: "https://corsproxy.io/?" + encodeURIComponent(url),
      },
      {
        name: "codetabs",
        u: "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(url),
      },
      {
        name: "cors-eu",
        u: "https://cors.eu.org/?" + encodeURIComponent(url),
      },
    ];
  }

  function withTimeout(ms) {
    const c = new AbortController();
    const id = setTimeout(function () {
      c.abort();
    }, ms);
    return { signal: c.signal, done: function () { clearTimeout(id); } };
  }

  async function fetchJsonUrl(url, timeoutMs) {
    const chain = buildProxyChain(url);
    let lastErr;
    for (var i = 0; i < chain.length; i++) {
      var item = chain[i];
      var t = withTimeout(timeoutMs);
      try {
        var r = await fetch(item.u, {
          cache: "no-store",
          signal: t.signal,
        });
        t.done();
        if (!r.ok) throw new Error(item.name + " http " + r.status);
        var text;
        if (item.parseGet) {
          var wrap = await r.json();
          text = typeof wrap.contents === "string" ? wrap.contents : "";
        } else {
          text = await r.text();
        }
        return JSON.parse(text);
      } catch (e) {
        try {
          t.done();
        } catch (_) {}
        lastErr = e;
      }
    }
    throw lastErr || new Error("fetch");
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o.total !== "number" || typeof o.brCount !== "number")
        return null;
      return o;
    } catch {
      return null;
    }
  }

  async function fetchEmbeddedSnapshot() {
    try {
      var r = await fetch(SNAPSHOT_URL, { cache: "no-store" });
      if (!r.ok) return null;
      var snap = await r.json();
      if (
        !snap ||
        typeof snap.victimsTotal !== "number" ||
        typeof snap.brCount !== "number"
      )
        return null;
      if (snap.victimsTotal < snap.brCount) return null;
      return snap;
    } catch {
      return null;
    }
  }

  function writeCache(total, brCount, updatedIso) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          total: total,
          brCount: brCount,
          updatedIso: updatedIso,
          savedAt: Date.now(),
        })
      );
    } catch (_) {}
  }

  function fmtDate(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
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

  function renderChart(canvas, statusEl, footEl, total, brCount, updatedIso, cacheNote) {
    var rest = Math.max(0, total - brCount);
    if (footEl) {
      var base = "Base atualizada em " + fmtDate(updatedIso) + " (fonte: Ransomware.live).";
      if (cacheNote) base += " " + cacheNote;
      footEl.textContent = base;
    }
    setStatus(statusEl, "", false);

    var ctx = canvas.getContext("2d");
    var cyan = "rgba(103, 232, 249, 0.85)";
    var blue = "rgba(59, 130, 246, 0.75)";

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
                var n = ctx.raw;
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
  }

  async function load() {
    var statusEl = document.getElementById("incident-chart-status");
    var footEl = document.getElementById("incident-chart-foot");
    var canvas = document.getElementById("incident-chart-canvas");
    if (!canvas || !window.Chart) {
      setStatus(statusEl, "Gráfico indisponível neste navegador.", true);
      return;
    }

    setStatus(statusEl, "Carregando dados públicos…", false);

    try {
      var infoUrl = API + "/info";
      var brUrl = API + "/countryvictims/" + BR;

      var info = await fetchJsonUrl(infoUrl, 35000);
      var brList = await fetchJsonUrl(brUrl, 120000);

      var total =
        info &&
        info.Victims &&
        typeof info.Victims.Numbers === "number"
          ? info.Victims.Numbers
          : null;
      var brCount = Array.isArray(brList) ? brList.length : 0;

      if (total === null || total < brCount) {
        throw new Error("dados inválidos");
      }

      var updated =
        (info.Victims && info.Victims["Last Update json"]) || "";

      writeCache(total, brCount, updated);

      renderChart(canvas, statusEl, footEl, total, brCount, updated, "");
    } catch (e) {
      if (typeof console !== "undefined" && console.debug) {
        console.debug("[incident-chart] API indisponível", e);
      }
      var cached = readCache();
      if (
        cached &&
        Date.now() - (cached.savedAt || 0) < CACHE_MAX_AGE_MS &&
        cached.total >= cached.brCount
      ) {
        var iso = cached.updatedIso || new Date(cached.savedAt).toISOString();
        renderChart(
          canvas,
          statusEl,
          footEl,
          cached.total,
          cached.brCount,
          iso,
          "Exibindo último dado salvo no navegador (API momentaneamente inacessível)."
        );
        setStatus(
          statusEl,
          "Modo cache: dados de uma visita anterior — atualize a página depois ou abra ransomware.live.",
          false
        );
        return;
      }

      var snap = await fetchEmbeddedSnapshot();
      if (snap) {
        var snapIso = snap.victimsLastUpdateIso || "";
        renderChart(
          canvas,
          statusEl,
          footEl,
          snap.victimsTotal,
          snap.brCount,
          snapIso,
          "Referência embarcada no site (proxies à API indisponíveis neste ambiente)."
        );
        setStatus(
          statusEl,
          "Exibindo dados de referência do próprio site. Totais ao vivo: ransomware.live.",
          false
        );
        if (footEl && snap.note) {
          footEl.textContent =
            footEl.textContent + " " + snap.note;
        }
        return;
      }

      setStatus(
        statusEl,
        "Não foi possível carregar os dados agora. Consulte a fonte em ransomware.live.",
        true
      );
      if (footEl) {
        footEl.textContent =
          "Sem snapshot local e sem cache do navegador. Verifique se assets/ransomware-snapshot.json existe no deploy.";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
