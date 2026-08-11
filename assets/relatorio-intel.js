(function () {
  "use strict";

  var filters = document.querySelectorAll("[data-intel-filter]");
  var techniques = document.querySelectorAll("[data-intel-category]");
  filters.forEach(function (button) {
    button.addEventListener("click", function () {
      var filter = button.getAttribute("data-intel-filter");
      filters.forEach(function (item) {
        var active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      techniques.forEach(function (item) {
        var categories = item.getAttribute("data-intel-category").split(" ");
        item.hidden = filter !== "all" && categories.indexOf(filter) === -1;
      });
    });
  });

  var stages = {
    collect: { number: "01", label: "Entrada controlada", title: "Coletar sinais de fontes confiáveis", text: "Feeds, comunidades, relatórios, casos internos e APIs entram com origem, data, distribuição e classificação TLP definidas.", items: ["Indicadores com validade e contexto", "Eventos internos e inteligência externa", "Controle de distribuição desde a entrada"], output: "Evento MISP estruturado" },
    enrich: { number: "02", label: "Contexto e qualidade", title: "Enriquecer antes de distribuir", text: "Taxonomias, Galaxies, reputação, sighting e análise humana transformam observáveis isolados em inteligência útil.", items: ["Mapeamento para MITRE ATT&CK", "Confiança, origem e falso positivo", "Relacionamento com atores e campanhas"], output: "Inteligência qualificada" },
    correlate: { number: "03", label: "Relações relevantes", title: "Correlacionar eventos e observáveis", text: "O motor de correlação revela coincidências e relações entre indicadores, campanhas, malware e ocorrências internas.", items: ["Matches exatos e correlações avançadas", "Histórico de observação e sighting", "Priorização pelo contexto do negócio"], output: "Hipótese de detecção" },
    operate: { number: "04", label: "Ação mensurável", title: "Operacionalizar no ecossistema SOC", text: "Indicadores aprovados seguem por API e formatos interoperáveis para SIEM, EDR, IDS, SOAR e fluxo de resposta.", items: ["Regras e listas com expiração", "Tickets com contexto e responsável", "Medição de uso, cobertura e resultado"], output: "Detecção e resposta" }
  };
  var stageButtons = document.querySelectorAll("[data-misp-step]");
  var stage = document.getElementById("misp-stage");
  stageButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var item = stages[button.getAttribute("data-misp-step")];
      stageButtons.forEach(function (candidate) {
        var active = candidate === button;
        candidate.classList.toggle("is-active", active);
        candidate.setAttribute("aria-selected", String(active));
      });
      if (!stage || !item) return;
      stage.innerHTML = '<div class="intel-stage-icon" aria-hidden="true">' + item.number + '</div><span class="intel-stage-label">' + item.label + '</span><h3>' + item.title + '</h3><p>' + item.text + '</p><ul>' + item.items.map(function (value) { return "<li>" + value + "</li>"; }).join("") + '</ul><div class="intel-stage-output"><span>Saída</span><strong>' + item.output + '</strong></div>';
    });
  });
})();
