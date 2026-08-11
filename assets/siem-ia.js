(function () {
  "use strict";

  var form = document.querySelector("[data-ai-form]");
  var input = document.querySelector("[data-ai-input]");
  var messages = document.querySelector("[data-ai-messages]");
  var clear = document.querySelector("[data-ai-clear]");
  var fileInput = document.querySelector("[data-ai-file]");
  var attachment = document.querySelector("[data-ai-attachment]");
  var removeFileButton = document.querySelector("[data-ai-remove-file]");
  var endpoint = window.VULCAN_AI_ENDPOINT || "";
  var selectedFile = null;
  var maxFileSize = 10 * 1024 * 1024;

  if (!form || !input || !messages) return;

  var knowledge = [
    { terms: ["login", "impossível", "impossivel", "identidade", "acesso"], answer: "Para priorizar um alerta de login impossível, valide a confiabilidade das localizações e o intervalo entre acessos. Correlacione MFA, dispositivo, reputação do IP, mudanças de privilégio e atividade posterior. Eleve a prioridade quando houver sessão sem MFA, dispositivo desconhecido, privilégio alto ou ações sensíveis.", sources: ["Eventos de identidade", "Playbook de conta comprometida", "MITRE T1078"] },
    { terms: ["t1078", "mitre", "conta válida", "contas válidas"], answer: "T1078 — Valid Accounts representa o uso de credenciais legítimas por um adversário. No SIEM, procure autenticações fora do padrão, novos dispositivos, localizações incomuns, bypass de MFA, uso de contas inativas e elevação de privilégio.", sources: ["MITRE ATT&CK T1078", "Telemetria de identidade", "Baseline comportamental"] },
    { terms: ["métrica", "metrica", "métricas", "metricas", "soc", "kpi"], answer: "Acompanhe tempo para reconhecer e conter, falsos positivos, alertas reabertos, cobertura de casos de uso, fontes sem telemetria, idade do backlog e ações concluídas no SLA. Separe indicadores operacionais dos indicadores de redução de risco.", sources: ["Painel operacional", "Casos de uso SIEM", "Gestão de incidentes"] },
    { terms: ["priorizar", "prioridade", "criticidade", "risco"], answer: "Combine severidade técnica com criticidade do ativo, privilégio da identidade, exposição, evidência de exploração, alcance e controles compensatórios. Registre os fatores usados para que a decisão seja auditável.", sources: ["Inventário de ativos", "Matriz de risco", "Eventos correlacionados"] }
  ];

  function addMessage(role, text, sources) {
    var row = document.createElement("div");
    row.className = "ai-message " + role;
    var avatar = document.createElement("span");
    avatar.textContent = role === "user" ? "EU" : "AI";
    var body = document.createElement("div");
    var paragraph = document.createElement("p");
    paragraph.textContent = text;
    body.appendChild(paragraph);
    if (sources && sources.length) {
      var meta = document.createElement("div");
      meta.className = "ai-answer-meta";
      sources.forEach(function (source) {
        var chip = document.createElement("i");
        chip.textContent = source;
        meta.appendChild(chip);
      });
      body.appendChild(meta);
    }
    row.appendChild(avatar);
    row.appendChild(body);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  function clearAttachment() {
    selectedFile = null;
    fileInput.value = "";
    attachment.hidden = true;
  }

  function setAttachment(file) {
    var extension = file.name.split(".").pop().toLowerCase();
    var valid = extension === "pdf" || extension === "html" || extension === "htm";
    if (!valid) {
      addMessage("assistant", "Formato não suportado. Anexe um relatório .html, .htm ou .pdf.", ["Validação de arquivo"]);
      clearAttachment();
      return;
    }
    if (file.size > maxFileSize) {
      addMessage("assistant", "O arquivo excede o limite de 10 MB. Reduza o relatório antes de anexar.", ["Limite de upload"]);
      clearAttachment();
      return;
    }
    selectedFile = file;
    attachment.querySelector("[data-ai-file-icon]").textContent = extension === "pdf" ? "PDF" : "HTML";
    attachment.querySelector("[data-ai-file-name]").textContent = file.name;
    attachment.querySelector("[data-ai-file-meta]").textContent = extension.toUpperCase() + " · " + formatBytes(file.size) + " · pronto para análise";
    attachment.hidden = false;
    input.focus();
  }

  function localAnswer(question) {
    var normalized = question.toLocaleLowerCase("pt-BR");
    var best = null;
    var score = 0;
    knowledge.forEach(function (item) {
      var current = item.terms.reduce(function (total, term) { return total + (normalized.indexOf(term) >= 0 ? 1 : 0); }, 0);
      if (current > score) { score = current; best = item; }
    });
    return best || { answer: "Informe o tipo de alerta, a fonte de telemetria, o ativo afetado e o comportamento observado — sem incluir credenciais, tokens ou dados pessoais. Posso organizar hipóteses e próximos passos para validação do analista.", sources: ["Base operacional", "Boas práticas de investigação"] };
  }

  async function analyzeHtml(file) {
    var raw = await file.text();
    var documentCopy = new DOMParser().parseFromString(raw, "text/html");
    documentCopy.querySelectorAll("script,style,noscript,iframe,object").forEach(function (node) { node.remove(); });
    var text = (documentCopy.body ? documentCopy.body.textContent : "").replace(/\s+/g, " ").trim().slice(0, 120000);
    var normalized = text.toLocaleLowerCase("pt-BR");
    var counts = {
      critical: (normalized.match(/crítico|critico|critical/g) || []).length,
      high: (normalized.match(/\balto\b|\bhigh\b/g) || []).length,
      medium: (normalized.match(/médio|medio|medium/g) || []).length,
      low: (normalized.match(/\bbaixo\b|\blow\b/g) || []).length
    };
    var headings = Array.from(documentCopy.querySelectorAll("h1,h2,h3")).map(function (node) { return node.textContent.trim(); }).filter(Boolean).slice(0, 5);
    var summary = "Analisei localmente o conteúdo textual de “" + file.name + "”. O relatório contém aproximadamente " + text.split(/\s+/).filter(Boolean).length + " palavras";
    if (counts.critical + counts.high + counts.medium + counts.low) summary += " e referências de severidade: " + counts.critical + " críticas, " + counts.high + " altas, " + counts.medium + " médias e " + counts.low + " baixas";
    summary += ".";
    if (headings.length) summary += " Seções identificadas: " + headings.join("; ") + ".";
    summary += " Recomendo validar os achados críticos e altos, confirmar evidências, responsáveis, SLAs e critérios de reteste.";
    return { answer: summary, sources: ["Relatório HTML anexado", "Análise local demonstrativa", "Validação humana necessária"] };
  }

  async function localFileAnswer(file, question) {
    if (/\.html?$/i.test(file.name)) return analyzeHtml(file, question);
    return {
      answer: "O PDF “" + file.name + "” foi anexado e validado. A leitura completa de PDFs será realizada quando o endpoint seguro de IA estiver conectado. A chave da API e o processamento do documento permanecem no servidor.",
      sources: ["PDF anexado", "Endpoint seguro necessário", "Nenhum dado foi enviado"]
    };
  }

  async function ask(question, file) {
    addMessage("user", question + (file ? "\n📎 " + file.name + " · " + formatBytes(file.size) : ""));
    input.value = "";
    input.style.height = "auto";
    var loading = addMessage("assistant", file ? "Lendo e analisando o relatório" : "Analisando contexto");
    loading.classList.add("loading");
    try {
      var result;
      if (endpoint) {
        var options = { method: "POST" };
        if (file) {
          var payload = new FormData();
          payload.append("question", question);
          payload.append("report", file, file.name);
          options.body = payload;
        } else {
          options.headers = { "Content-Type": "application/json" };
          options.body = JSON.stringify({ question: question });
        }
        var response = await fetch(endpoint, options);
        if (!response.ok) throw new Error("endpoint unavailable");
        var data = await response.json();
        result = { answer: data.answer || data.output || "Resposta indisponível.", sources: Array.isArray(data.sources) ? data.sources : ["Assistente conectado"] };
      } else if (file) {
        await new Promise(function (resolve) { setTimeout(resolve, 500); });
        result = await localFileAnswer(file, question);
      } else {
        await new Promise(function (resolve) { setTimeout(resolve, 500); });
        result = localAnswer(question);
      }
      loading.remove();
      addMessage("assistant", result.answer, result.sources);
    } catch (error) {
      loading.remove();
      var fallback = file ? await localFileAnswer(file, question) : localAnswer(question);
      addMessage("assistant", fallback.answer, fallback.sources);
    }
    clearAttachment();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var question = input.value.trim();
    if (!question && selectedFile) question = "Analise este relatório e destaque os principais riscos, prioridades e recomendações.";
    if (question) ask(question, selectedFile);
  });
  input.addEventListener("keydown", function (event) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
  input.addEventListener("input", function () { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 220) + "px"; });
  fileInput.addEventListener("change", function () { if (fileInput.files && fileInput.files[0]) setAttachment(fileInput.files[0]); });
  removeFileButton.addEventListener("click", clearAttachment);
  document.querySelectorAll("[data-ai-prompt]").forEach(function (button) { button.addEventListener("click", function () { input.value = button.dataset.aiPrompt; form.requestSubmit(); }); });
  clear.addEventListener("click", function () { messages.innerHTML = ""; clearAttachment(); addMessage("assistant", "Conversa limpa. Faça uma pergunta ou anexe um relatório HTML ou PDF para análise.", ["Demonstração local"]); input.focus(); });
})();
