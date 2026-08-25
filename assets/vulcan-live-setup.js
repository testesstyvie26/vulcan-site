(function () {
  "use strict";

  var CONFIG_PATH = "assets/live-config.json";
  var CACHE_KEY = "vulcan_live_config_v1";
  var AUTH_KEY = "vulcan_live_admin_v1";
  var ADMIN_PIN = "vulcan2026";

  function $(id) { return document.getElementById(id); }

  function defaultConfig() {
    return {
      enabled: false,
      provider: "youtube",
      streamUrl: "",
      title: "Vulcan Live — Workshop",
      subtitle: "Transmissão ao vivo · Vulcan Defense",
      description: "",
      agenda: ["Contexto e objetivos", "Demonstração prática", "Perguntas"],
      scheduleText: "",
      chatUrl: "",
      updatedAt: null,
      configApiUrl: ""
    };
  }

  function readForm() {
    var agendaRaw = ($("vl-agenda-input") && $("vl-agenda-input").value) || "";
    return {
      enabled: $("vl-enabled") && $("vl-enabled").checked,
      provider: ($("vl-provider-select") && $("vl-provider-select").value) || "youtube",
      streamUrl: ($("vl-stream-url") && $("vl-stream-url").value.trim()) || "",
      title: ($("vl-title-input") && $("vl-title-input").value.trim()) || "Vulcan Live",
      subtitle: ($("vl-subtitle-input") && $("vl-subtitle-input").value.trim()) || "",
      description: ($("vl-description-input") && $("vl-description-input").value.trim()) || "",
      agenda: agendaRaw.split("\n").map(function (s) { return s.trim(); }).filter(Boolean),
      scheduleText: ($("vl-schedule-input") && $("vl-schedule-input").value.trim()) || "",
      chatUrl: ($("vl-chat-input") && $("vl-chat-input").value.trim()) || "",
      configApiUrl: ($("vl-api-input") && $("vl-api-input").value.trim()) || "",
      updatedAt: new Date().toISOString()
    };
  }

  function fillForm(config) {
    config = config || defaultConfig();
    if ($("vl-enabled")) $("vl-enabled").checked = !!config.enabled;
    if ($("vl-provider-select")) $("vl-provider-select").value = config.provider || "youtube";
    if ($("vl-stream-url")) $("vl-stream-url").value = config.streamUrl || "";
    if ($("vl-title-input")) $("vl-title-input").value = config.title || "";
    if ($("vl-subtitle-input")) $("vl-subtitle-input").value = config.subtitle || "";
    if ($("vl-description-input")) $("vl-description-input").value = config.description || "";
    if ($("vl-agenda-input")) $("vl-agenda-input").value = (config.agenda || []).join("\n");
    if ($("vl-schedule-input")) $("vl-schedule-input").value = config.scheduleText || "";
    if ($("vl-chat-input")) $("vl-chat-input").value = config.chatUrl || "";
    if ($("vl-api-input")) $("vl-api-input").value = config.configApiUrl || "";
  }

  function showMsg(text, ok) {
    var el = $("vl-setup-msg");
    if (!el) return;
    el.textContent = text;
    el.className = "vl-msg " + (ok ? "ok" : "err");
    el.hidden = false;
  }

  function loadConfig() {
    return fetch(CONFIG_PATH + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : defaultConfig(); })
      .catch(function () {
        try {
          var raw = localStorage.getItem(CACHE_KEY);
          return raw ? JSON.parse(raw) : defaultConfig();
        } catch (e) {
          return defaultConfig();
        }
      });
  }

  function saveLocal(config) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(config));
  }

  function downloadJson(config) {
    var blob = new Blob([JSON.stringify(config, null, 2) + "\n"], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "live-config.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function setAuthed(ok) {
    sessionStorage.setItem(AUTH_KEY, ok ? "1" : "0");
    if ($("vl-auth-gate")) $("vl-auth-gate").hidden = ok;
    if ($("vl-setup-panel")) $("vl-setup-panel").hidden = !ok;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var authed = sessionStorage.getItem(AUTH_KEY) === "1";
    setAuthed(authed);

    var loginBtn = $("vl-login-btn");
    if (loginBtn) {
      loginBtn.addEventListener("click", function () {
        var pin = ($("vl-pin") && $("vl-pin").value) || "";
        if (pin === ADMIN_PIN) {
          setAuthed(true);
          loadConfig().then(fillForm);
        } else {
          showMsg("PIN incorreto.", false);
        }
      });
    }

    if (authed) loadConfig().then(fillForm);

    var previewBtn = $("vl-preview-btn");
    if (previewBtn) {
      previewBtn.addEventListener("click", function () {
        var cfg = readForm();
        saveLocal(cfg);
        window.open("vulcan-live.html?preview=1", "_blank", "noopener,noreferrer");
      });
    }

    var publishBtn = $("vl-publish-btn");
    if (publishBtn) {
      publishBtn.addEventListener("click", function () {
        var cfg = readForm();
        if (cfg.enabled && !cfg.streamUrl) {
          showMsg("Informe a URL da live antes de publicar.", false);
          return;
        }
        saveLocal(cfg);
        downloadJson(cfg);
        showMsg(
          "Configuração salva localmente e arquivo live-config.json baixado. "
          + "Substitua assets/live-config.json no repositório e faça deploy para publicar no site.",
          true
        );
      });
    }

    var disableBtn = $("vl-disable-btn");
    if (disableBtn) {
      disableBtn.addEventListener("click", function () {
        loadConfig().then(function (cfg) {
          cfg.enabled = false;
          cfg.updatedAt = new Date().toISOString();
          fillForm(cfg);
          saveLocal(cfg);
          downloadJson(cfg);
          showMsg("Live desativada. Publique o JSON no site para refletir em produção.", true);
        });
      });
    }
  });
})();
