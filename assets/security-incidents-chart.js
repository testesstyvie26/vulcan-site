/**
 * Gráfico com dados públicos Ransomware.live (organizações/vítimas divulgadas).
 * Exibe os últimos 6 meses, mês a mês, para o Brasil. Data agrupada por "discovered".
 * CORS: a API costuma não liberar origem no navegador — tentamos vários proxies públicos
 * e, se tudo falhar, usamos o último resultado salvo em localStorage (cache).
 */
(function () {
  const API = "https://api.ransomware.live/v2";
  const BR = "BR";
  const CACHE_KEY = "vulcan_rl_incident_v2";
  const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const SNAPSHOT_URL = "assets/ransomware-snapshot.json?v=2";

  const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  function last6MonthKeys() {
    var keys = [];
    var d = new Date();
    for (var i = 5; i >= 0; i--) {
      var m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      var y = m.getFullYear();
      var mo = m.getMonth();
      keys.push(y + "-" + String(mo + 1).padStart(2, "0"));
    }
    return keys;
  }

  function monthKeyToLabel(key) {
    var parts = key.split("-");
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    return MONTH_NAMES[m] + "/" + String(y).slice(-2);
  }

  function groupBrListByMonth(brList) {
    var keys = last6MonthKeys();
    var byMonth = {};
    for (var k = 0; k < keys.length; k++) byMonth[keys[k]] = 0;

    if (!Array.isArray(brList)) return { labels: keys.map(monthKeyToLabel), data: keys.map(function (k) { return byMonth[k]; }) };

    for (var i = 0; i < brList.length; i++) {
      var v = brList[i];
      var raw = (v && (v.discovered || v.published || v.post_date)) || "";
      if (!raw) continue;
      var parsed = new Date(raw.replace(" ", "T"));
      if (isNaN(parsed.getTime())) continue;
      var y = parsed.getFullYear();
      var mo = parsed.getMonth() + 1;
      var key = y + "-" + String(mo).padStart(2, "0");
      if (byMonth.hasOwnProperty(key)) byMonth[key]++;
    }

    return {
      labels: keys.map(monthKeyToLabel),
      data: keys.map(function (k) { return byMonth[k]; }),
    };
  }

  function buildMonthlyFromSnapshot(snap) {
    var keys = last6MonthKeys();
    var labels = keys.map(monthKeyToLabel);
    var data = keys.map(function (k) {
      return (snap.brMonthly && typeof snap.brMonthly[k] === "number") ? snap.brMonthly[k] : 0;
    });
    return { labels: labels, data: data };
  }

  /** Sem fetch direto à API: ela não expõe CORS no navegador. */
  function buildProxyChain(url) {
    return [
      { name: "allorigins-raw", u: "https://api.allorigins.win/raw?url=" + encodeURIComponent(url) },
      { name: "allorigins-get", u: "https://api.allorigins.win/get?url=" + encodeURIComponent(url), parseGet: true },
      { name: "corsproxy", u: "https://corsproxy.io/?" + encodeURIComponent(url) },
      { name: "codetabs", u: "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(url) },
      { name: "cors-eu", u: "https://cors.eu.org/?" + encodeURIComponent(url) },
    ];
  }

  function withTimeout(ms) {
    var c = new AbortController();
    var id = setTimeout(function () { c.abort(); }, ms);
    return { signal: c.signal, done: function () { clearTimeout(id); } };
  }

  async function fetchJsonUrl(url, timeoutMs) {
    var chain = buildProxyChain(url);
    var lastErr;
    for (var i = 0; i < chain.length; i++) {
      var item = chain[i];
      var t = withTimeout(timeoutMs);
      try {
        var r = await fetch(item.u, { cache: "no-store", signal: t.signal });
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
        try { t.done(); } catch (_) {}
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
      if (!o || !Array.isArray(o.labels) || !Array.isArray(o.data)) return null;
      return o;
    } catch { return null; }
  }

  async function fetchEmbeddedSnapshot() {
    try {
      var r = await fetch(SNAPSHOT_URL, { cache: "no-store" });
      if (!r.ok) return null;
      var snap = await r.json();
      if (!snap || !snap.brMonthly) return null;
      return buildMonthlyFromSnapshot(snap);
    } catch { return null; }
  }

  function writeCache(monthly, updatedIso) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        labels: monthly.labels,
        data: monthly.data,
        updatedIso: updatedIso,
        savedAt: Date.now(),
      }));
    } catch (_) {}
  }

  function fmtDate(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } catch { return iso; }
  }

  function setStatus(el, text, isError) {
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("incident-chart-status--error", !!isError);
  }

  function renderChart(canvas, statusEl, footEl, monthly, updatedIso, cacheNote) {
    if (footEl) {
      var base = "Base atualizada em " + fmtDate(updatedIso) + " (fonte: Ransomware.live).";
      if (cacheNote) base += " " + cacheNote;
      footEl.textContent = base;
    }
    setStatus(statusEl, "", false);

    var ctx = canvas.getContext("2d");
    var redA = "rgba(248, 113, 113, 0.92)";
    var redB = "rgba(185, 28, 28, 0.88)";

    if (window.__incidentChart) window.__incidentChart.destroy();

    var colors = monthly.labels.map(function (_, i) { return i % 2 === 0 ? redA : redB; });
    var borders = monthly.labels.map(function (_, i) {
      return i % 2 === 0 ? "rgba(254, 202, 202, 0.95)" : "rgba(252, 165, 165, 0.9)";
    });

    window.__incidentChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: monthly.labels,
        datasets: [{
          label: "Organizações (Brasil)",
          data: monthly.data,
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 1,
          borderRadius: 8,
          maxBarThickness: 72,
        }],
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
                return n.toLocaleString("pt-BR") + " organizações (vítimas divulgadas no mês)";
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(248, 113, 113, 0.12)" },
            ticks: { color: "rgba(254, 202, 202, 0.78)", maxRotation: 45, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(248, 113, 113, 0.1)" },
            ticks: { color: "rgba(254, 215, 215, 0.55)", font: { size: 11 } },
          },
        },
      },
    });
  }

  function signalIncidentChartReady() {
    try {
      window.__vulcanIncidentChartReady = true;
      document.dispatchEvent(new CustomEvent("vulcan:incident-chart-ready", { bubbles: true }));
    } catch (_) {}
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

      var total = info && info.Victims && typeof info.Victims.Numbers === "number" ? info.Victims.Numbers : null;
      var monthly = groupBrListByMonth(brList);
      var sum = monthly.data.reduce(function (a, b) { return a + b; }, 0);

      if (total !== null && total < sum) throw new Error("dados inválidos");

      var updated = (info.Victims && info.Victims["Last Update json"]) || "";
      writeCache(monthly, updated);
      renderChart(canvas, statusEl, footEl, monthly, updated, "");
    } catch (e) {
      if (typeof console !== "undefined" && console.debug) console.debug("[incident-chart] API indisponível", e);

      var cached = readCache();
      if (cached && Date.now() - (cached.savedAt || 0) < CACHE_MAX_AGE_MS) {
        var iso = cached.updatedIso || new Date(cached.savedAt).toISOString();
        renderChart(canvas, statusEl, footEl, { labels: cached.labels, data: cached.data }, iso,
          "Exibindo último dado salvo no navegador (API momentaneamente inacessível).");
        setStatus(statusEl, "Modo cache: dados de uma visita anterior — atualize a página depois ou abra ransomware.live.", false);
        return;
      }

      var snapMonthly = await fetchEmbeddedSnapshot();
      if (snapMonthly && snapMonthly.labels && snapMonthly.data) {
        var snapIso = "";
        try {
          var snapRaw = await fetch(SNAPSHOT_URL, { cache: "no-store" });
          if (snapRaw.ok) {
            var snap = await snapRaw.json();
            snapIso = snap.victimsLastUpdateIso || "";
          }
        } catch (_) {}
        renderChart(canvas, statusEl, footEl, snapMonthly, snapIso,
          "Referência embarcada no site (proxies à API indisponíveis neste ambiente).");
        setStatus(statusEl, "Exibindo dados de referência do próprio site. Totais ao vivo: ransomware.live.", false);
        return;
      }

      setStatus(statusEl, "Não foi possível carregar os dados agora. Consulte a fonte em ransomware.live.", true);
      if (footEl) footEl.textContent = "Sem snapshot local e sem cache do navegador. Verifique se assets/ransomware-snapshot.json existe no deploy.";
    } finally {
      signalIncidentChartReady();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
