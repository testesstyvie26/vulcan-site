(function () {
  "use strict";

  var scenarios = {
    plc: {
      severity: "Crítico",
      id: "OT-7712",
      title: "Escrita não autorizada em registrador PLC",
      description: "Comando Modbus fora de janela de manutenção no controlador da linha 3.",
      tags: ["Modbus", "PLC", "ICS"],
      steps: [
        ["Baseline desviado", "00:00"],
        ["Correlacionado com sessão remota", "00:22"],
        ["Zona OT isolada", "00:48"]
      ]
    },
    scada: {
      severity: "Alto",
      id: "OT-7704",
      title: "Acesso remoto anômalo ao servidor SCADA",
      description: "Login de fornecedor fora do horário acordado e de IP não catalogado.",
      tags: ["SCADA", "Identidade", "VPN"],
      steps: [
        ["Sessão detectada", "00:00"],
        ["Política de acesso violada", "00:11"],
        ["Conta bloqueada + ticket SOC", "00:35"]
      ]
    },
    protocol: {
      severity: "Médio",
      id: "OT-7698",
      title: "Tráfego industrial fora do perfil",
      description: "Volume atípico de pacotes DNP3 entre RTU e gateway de campo.",
      tags: ["DNP3", "RTU", "Perfil"],
      steps: [
        ["Perfil de tráfego atualizado", "00:00"],
        ["Anomalia classificada", "00:19"],
        ["Engenharia OT notificada", "00:52"]
      ]
    }
  };

  function scenarioTabs() {
    var buttons = document.querySelectorAll("[data-ot-scenario]");
    if (!buttons.length) return;

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var data = scenarios[button.dataset.otScenario];
        if (!data) return;

        buttons.forEach(function (b) {
          b.classList.toggle("is-active", b === button);
          b.setAttribute("aria-pressed", String(b === button));
        });

        var severity = document.querySelector("[data-ot-severity]");
        var id = document.querySelector("[data-ot-id]");
        var title = document.querySelector("[data-ot-title]");
        var description = document.querySelector("[data-ot-description]");
        var tags = document.querySelector("[data-ot-tags]");

        if (severity) severity.textContent = data.severity;
        if (id) id.textContent = data.id;
        if (title) title.textContent = data.title;
        if (description) description.textContent = data.description;

        if (tags) {
          tags.innerHTML = data.tags.map(function (tag) {
            return '<span class="ot-tag">' + tag + "</span>";
          }).join("");
        }

        document.querySelectorAll("[data-ot-step]").forEach(function (row, index) {
          var step = data.steps[index];
          if (!step) return;
          row.querySelector("strong").textContent = step[0];
          row.querySelector("time").textContent = step[1];
        });
      });
    });
  }

  scenarioTabs();
})();
