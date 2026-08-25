(function () {
  "use strict";

  var CONFIG_PATH = "assets/live-config.json";
  var CACHE_KEY = "vulcan_live_config_v1";

  function parseYouTube(url) {
    if (!url) return null;
    try {
      var u = new URL(url.trim());
      var host = u.hostname.replace(/^www\./, "");
      var id = "";
      if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
      else if (host.indexOf("youtube.com") !== -1) {
        id = u.searchParams.get("v") || "";
        if (!id && u.pathname.indexOf("/embed/") === 0) id = u.pathname.split("/")[2] || "";
        if (!id && u.pathname.indexOf("/live/") === 0) id = u.pathname.split("/")[2] || "";
      }
      if (!id || id.length < 6) return null;
      return "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=0&rel=0&modestbranding=1";
    } catch (e) {
      return null;
    }
  }

  function parseTwitch(url) {
    if (!url) return null;
    try {
      var u = new URL(url.trim());
      var host = u.hostname.replace(/^www\./, "");
      var channel = "";
      if (host === "player.twitch.tv") channel = u.searchParams.get("channel") || "";
      else if (host.indexOf("twitch.tv") !== -1) {
        var parts = u.pathname.split("/").filter(Boolean);
        if (parts[0] && parts[0] !== "videos") channel = parts[0];
      }
      if (!channel) return null;
      var parent = window.location.hostname || "localhost";
      return "https://player.twitch.tv/?channel=" + encodeURIComponent(channel) + "&parent=" + encodeURIComponent(parent) + "&muted=false";
    } catch (e) {
      return null;
    }
  }

  function buildEmbed(config) {
    var url = (config.streamUrl || "").trim();
    if (!url) return null;
    if (config.provider === "twitch") return parseTwitch(url);
    if (config.provider === "youtube") return parseYouTube(url);
    if (config.provider === "custom") {
      if (/^https?:\/\//i.test(url)) return url;
      return null;
    }
    return parseYouTube(url) || parseTwitch(url);
  }

  function providerLabel(provider) {
    if (provider === "twitch") return "Twitch";
    if (provider === "youtube") return "YouTube Live";
    if (provider === "custom") return "Embed customizado";
    return "Stream";
  }

  function loadConfig() {
    var cached = null;
    var preview = /[?&]preview=1/.test(window.location.search);
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch (e) { /* ignore */ }

    if (preview && cached) return Promise.resolve(cached);

    return fetch(CONFIG_PATH + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (fileCfg) {
        if (fileCfg && fileCfg.configApiUrl) {
          return fetch(fileCfg.configApiUrl, { cache: "no-store" })
            .then(function (r) { return r.ok ? r.json() : fileCfg; })
            .catch(function () { return fileCfg; });
        }
        if (fileCfg && cached && cached.updatedAt && fileCfg.updatedAt) {
          return new Date(cached.updatedAt) > new Date(fileCfg.updatedAt) ? cached : fileCfg;
        }
        return fileCfg || cached;
      })
      .catch(function () { return cached; });
  }

  function render(config) {
    if (!config) config = {};
    var enabled = !!config.enabled;
    var embed = enabled ? buildEmbed(config) : null;

    var badge = document.getElementById("vl-live-badge");
    if (badge) {
      badge.classList.toggle("is-off", !enabled || !embed);
      badge.innerHTML = enabled && embed
        ? '<i aria-hidden="true"></i> Ao vivo'
        : '<i aria-hidden="true"></i> Offline';
    }

    var title = document.getElementById("vl-title");
    if (title) title.textContent = config.title || "Vulcan Live";

    var stageTitle = document.getElementById("vl-stage-title");
    if (stageTitle) stageTitle.textContent = config.title || "Vulcan Live";

    var subtitle = document.getElementById("vl-subtitle");
    if (subtitle) subtitle.textContent = config.subtitle || "Workshop · Vulcan Defense";

    var desc = document.getElementById("vl-description");
    if (desc) desc.textContent = config.description || "";

    var schedule = document.getElementById("vl-schedule");
    if (schedule) {
      schedule.textContent = config.scheduleText || "";
      schedule.hidden = !config.scheduleText;
    }

    var provider = document.getElementById("vl-provider");
    if (provider) provider.textContent = providerLabel(config.provider);

    var agenda = document.getElementById("vl-agenda");
    if (agenda) {
      agenda.innerHTML = "";
      (config.agenda || []).forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        agenda.appendChild(li);
      });
      agenda.closest(".vl-panel").hidden = !(config.agenda && config.agenda.length);
    }

    var player = document.getElementById("vl-player");
    var offline = document.getElementById("vl-offline");
    if (!player || !offline) return;

    player.innerHTML = "";
    if (enabled && embed) {
      offline.hidden = true;
      var iframe = document.createElement("iframe");
      iframe.src = embed;
      iframe.title = (config.title || "Vulcan Live") + " — transmissão";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
      iframe.loading = "lazy";
      player.appendChild(iframe);
    } else {
      offline.hidden = false;
      var offTitle = offline.querySelector("h3");
      var offText = offline.querySelector("p");
      if (offTitle) offTitle.textContent = enabled ? "URL de transmissão inválida" : "Nenhuma transmissão ativa";
      if (offText) {
        offText.textContent = enabled
          ? "Revise a URL no painel de setup (YouTube Live ou Twitch)."
          : (config.scheduleText || "Quando o administrador publicar uma live, ela aparecerá aqui automaticamente.");
      }
    }

    var chat = document.getElementById("vl-chat-link");
    if (chat) {
      if (config.chatUrl) {
        chat.href = config.chatUrl;
        chat.hidden = false;
      } else {
        chat.hidden = true;
      }
    }

    var updated = document.getElementById("vl-updated");
    if (updated) {
      updated.textContent = config.updatedAt
        ? "Atualizado em " + new Date(config.updatedAt).toLocaleString("pt-BR")
        : "";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadConfig().then(render);
    window.setInterval(function () { loadConfig().then(render); }, 120000);
  });
})();
