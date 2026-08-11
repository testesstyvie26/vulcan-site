(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function revealElements() {
    var elements = document.querySelectorAll(".vp-reveal");
    if (reducedMotion || !("IntersectionObserver" in window)) {
      elements.forEach(function (element) { element.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14 });
    elements.forEach(function (element) { observer.observe(element); });
  }

  function animateCounters() {
    var counters = document.querySelectorAll("[data-counter]");
    counters.forEach(function (counter) {
      var target = Number(counter.dataset.counter);
      var decimals = Number(counter.dataset.decimals || 0);
      var prefix = counter.dataset.prefix || "";
      var suffix = counter.dataset.suffix || "";
      var duration = reducedMotion ? 0 : 1100;
      var started = false;
      function start() {
        if (started) return;
        started = true;
        var began = performance.now();
        function frame(now) {
          var progress = duration ? Math.min((now - began) / duration, 1) : 1;
          var eased = 1 - Math.pow(1 - progress, 3);
          counter.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
          if (progress < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }
      if (!("IntersectionObserver" in window)) start();
      else {
        var observer = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) { start(); observer.disconnect(); }
        });
        observer.observe(counter);
      }
    });
  }

  var series = {
    telemetry: {
      label: "Telemetria processada",
      unit: "M eventos",
      color: "#f6c85f",
      ranges: {
        "24h": [12.4,13.1,12.8,14.7,15.2,14.9,16.5,17.8,18.1,19.7,18.9,20.8,21.4,20.9,22.8,22.2,23.6,24.1,23.4,25.2,24.8,26.1,25.6,27.2],
        "7d": [20.1,21.8,22.4,21.9,24.6,25.1,27.2],
        "30d": [18.2,19.5,20.1,21.8,21.2,22.9,23.5,24.1,23.8,25.4,26.1,27.2]
      }
    },
    detections: {
      label: "Detecções correlacionadas",
      unit: "mil alertas",
      color: "#5edce7",
      ranges: {
        "24h": [4.1,4.3,4.0,4.8,5.2,5.0,5.6,6.2,5.9,6.4,6.1,7.0,6.8,7.3,7.1,7.8,7.4,8.0,7.7,8.4,8.1,8.8,8.5,9.1],
        "7d": [6.4,6.9,7.3,7.1,8.2,8.6,9.1],
        "30d": [5.8,6.1,6.5,6.9,7.2,7.0,7.6,7.9,8.1,8.5,8.8,9.1]
      }
    },
    response: {
      label: "Respostas automatizadas",
      unit: "% resolvido",
      color: "#7ee2a8",
      ranges: {
        "24h": [54,56,55,58,59,61,60,63,65,64,67,68,66,70,71,70,73,74,72,75,77,76,78,81],
        "7d": [66,69,71,70,75,78,81],
        "30d": [58,60,63,65,67,69,68,71,73,75,77,81]
      }
    }
  };

  function setupSparkChart() {
    var canvas = document.querySelector("[data-spark-chart]");
    if (!canvas) return;
    var values = [11,14,13,18,16,21,19,24,22,27,25,31,28,34,32,38,35,41,39,46,43,49,47,53];
    function draw() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      var ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      var min = Math.min.apply(null, values), max = Math.max.apply(null, values), pad = 6;
      var points = values.map(function (value, index) {
        return { x: pad + index * ((rect.width - pad * 2) / (values.length - 1)), y: pad + (1 - (value - min) / (max - min)) * (rect.height - pad * 2) };
      });
      var gradient = ctx.createLinearGradient(0,0,0,rect.height);
      gradient.addColorStop(0,"rgba(94,220,231,.3)"); gradient.addColorStop(1,"rgba(94,220,231,0)");
      ctx.beginPath(); ctx.moveTo(points[0].x,rect.height); points.forEach(function (point) { ctx.lineTo(point.x,point.y); }); ctx.lineTo(points[points.length-1].x,rect.height); ctx.closePath(); ctx.fillStyle=gradient; ctx.fill();
      ctx.beginPath(); points.forEach(function (point,index) { if (!index) ctx.moveTo(point.x,point.y); else ctx.lineTo(point.x,point.y); }); ctx.strokeStyle="#5edce7"; ctx.lineWidth=2; ctx.lineJoin="round"; ctx.stroke();
      var last=points[points.length-1]; ctx.beginPath(); ctx.arc(last.x,last.y,3.5,0,Math.PI*2); ctx.fillStyle="#f6c85f"; ctx.fill();
    }
    if ("ResizeObserver" in window) new ResizeObserver(draw).observe(canvas);
    draw();
  }

  function setupLineChart() {
    var canvas = document.querySelector("[data-line-chart]");
    if (!canvas) return;
    var shell = canvas.parentElement;
    var tooltip = shell.querySelector(".vp-tooltip");
    var metric = "telemetry";
    var range = "24h";
    var points = [];

    function draw(progress) {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      var ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      var width = rect.width;
      var height = rect.height;
      var pad = { top: 18, right: 12, bottom: 30, left: 42 };
      var data = series[metric].ranges[range];
      var min = Math.min.apply(null, data) * .88;
      var max = Math.max.apply(null, data) * 1.08;
      var plotWidth = width - pad.left - pad.right;
      var plotHeight = height - pad.top - pad.bottom;
      points = data.map(function (value, index) {
        return {
          x: pad.left + index * (plotWidth / (data.length - 1)),
          y: pad.top + (1 - (value - min) / (max - min)) * plotHeight,
          value: value,
          index: index
        };
      });

      ctx.clearRect(0, 0, width, height);
      ctx.font = "10px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#657680";
      ctx.strokeStyle = "rgba(255,255,255,.065)";
      ctx.lineWidth = 1;
      for (var i = 0; i < 4; i += 1) {
        var y = pad.top + (plotHeight / 3) * i;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
        var label = max - ((max - min) / 3) * i;
        ctx.fillText(label.toFixed(metric === "response" ? 0 : 1), 4, y + 3);
      }
      ctx.fillText(range === "24h" ? "00h" : range === "7d" ? "Seg" : "Início", pad.left, height - 8);
      var endLabel = range === "24h" ? "Agora" : range === "7d" ? "Dom" : "Hoje";
      ctx.fillText(endLabel, width - pad.right - ctx.measureText(endLabel).width, height - 8);

      var visibleCount = Math.max(2, Math.ceil(points.length * progress));
      var visible = points.slice(0, visibleCount);
      var gradient = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
      gradient.addColorStop(0, series[metric].color + "38");
      gradient.addColorStop(1, series[metric].color + "00");
      ctx.beginPath(); ctx.moveTo(visible[0].x, height - pad.bottom);
      visible.forEach(function (point) { ctx.lineTo(point.x, point.y); });
      ctx.lineTo(visible[visible.length - 1].x, height - pad.bottom); ctx.closePath();
      ctx.fillStyle = gradient; ctx.fill();
      ctx.beginPath();
      visible.forEach(function (point, index) { if (!index) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y); });
      ctx.strokeStyle = series[metric].color; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
      var last = visible[visible.length - 1];
      ctx.beginPath(); ctx.arc(last.x, last.y, 4, 0, Math.PI * 2); ctx.fillStyle = series[metric].color; ctx.fill();
      canvas.setAttribute("aria-label", series[metric].label + ": último valor " + data[data.length - 1] + " " + series[metric].unit + " no período de " + range + ".");
    }

    function animate() {
      if (reducedMotion) { draw(1); return; }
      var start = performance.now();
      function frame(now) {
        var progress = Math.min((now - start) / 700, 1);
        draw(1 - Math.pow(1 - progress, 3));
        if (progress < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    function showPoint(event) {
      if (!points.length) return;
      var rect = canvas.getBoundingClientRect();
      var clientX = event.touches ? event.touches[0].clientX : event.clientX;
      var x = clientX - rect.left;
      var nearest = points.reduce(function (best, point) { return Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best; });
      tooltip.innerHTML = "<strong>" + nearest.value + "</strong><span>" + series[metric].unit + " · ponto " + (nearest.index + 1) + "</span>";
      tooltip.style.left = nearest.x + "px";
      tooltip.style.top = nearest.y + "px";
      tooltip.classList.add("is-visible");
    }
    canvas.addEventListener("pointermove", showPoint);
    canvas.addEventListener("pointerleave", function () { tooltip.classList.remove("is-visible"); });
    canvas.addEventListener("touchstart", showPoint, { passive: true });
    document.querySelectorAll("[data-metric]").forEach(function (button) {
      button.addEventListener("click", function () {
        metric = button.dataset.metric;
        document.querySelectorAll("[data-metric]").forEach(function (item) { item.classList.toggle("is-active", item === button); });
        animate();
      });
    });
    document.querySelectorAll("[data-range]").forEach(function (button) {
      button.addEventListener("click", function () {
        range = button.dataset.range;
        document.querySelectorAll("[data-range]").forEach(function (item) { item.classList.toggle("is-active", item === button); });
        animate();
      });
    });
    new ResizeObserver(function () { draw(1); }).observe(canvas);
    animate();
  }

  function setupBarChart() {
    var canvas = document.querySelector("[data-bar-chart]");
    if (!canvas) return;
    var shell = canvas.parentElement;
    var tooltip = shell.querySelector(".vp-tooltip");
    var items = [
      { label: "Endpoints", value: 94 }, { label: "Identidade", value: 88 },
      { label: "Cloud", value: 83 }, { label: "Rede", value: 79 }, { label: "Containers", value: 72 }
    ];
    var bars = [];
    function draw() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
      var ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr); ctx.clearRect(0,0,rect.width,rect.height);
      var left = 82, right = 38, top = 22, gap = 52, maxWidth = rect.width - left - right;
      ctx.font = "11px Inter, system-ui, sans-serif"; bars = [];
      items.forEach(function (item, index) {
        var y = top + index * gap;
        ctx.fillStyle = "#9aa9b2"; ctx.fillText(item.label, 0, y + 13);
        ctx.fillStyle = "rgba(255,255,255,.055)"; ctx.beginPath(); ctx.roundRect(left,y,maxWidth,14,7); ctx.fill();
        var gradient = ctx.createLinearGradient(left,0,left+maxWidth,0); gradient.addColorStop(0,"#f6c85f"); gradient.addColorStop(1,"#5edce7");
        var barWidth = maxWidth * item.value / 100;
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.roundRect(left,y,barWidth,14,7); ctx.fill();
        ctx.fillStyle = "#dce5e9"; ctx.fillText(item.value + "%", rect.width - 30, y + 12);
        bars.push({ x:left, y:y, width:barWidth, height:14, item:item });
      });
      canvas.setAttribute("aria-label", "Cobertura ilustrativa: endpoints 94%, identidade 88%, cloud 83%, rede 79% e containers 72%.");
    }
    canvas.addEventListener("pointermove", function (event) {
      var rect = canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
      var hit = bars.find(function (bar) { return x >= bar.x && x <= bar.x + bar.width && y >= bar.y - 8 && y <= bar.y + bar.height + 8; });
      if (!hit) { tooltip.classList.remove("is-visible"); return; }
      tooltip.innerHTML = "<strong>" + hit.item.value + "%</strong><span>" + hit.item.label + " monitorados</span>";
      tooltip.style.left = Math.min(hit.x + hit.width, rect.width - 60) + "px"; tooltip.style.top = hit.y + "px"; tooltip.classList.add("is-visible");
    });
    canvas.addEventListener("pointerleave", function () { tooltip.classList.remove("is-visible"); });
    new ResizeObserver(draw).observe(canvas); draw();
  }

  function setupFilters() {
    var buttons = document.querySelectorAll("[data-cap-filter]");
    var cards = document.querySelectorAll("[data-category]");
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var filter = button.dataset.capFilter;
        buttons.forEach(function (item) { item.classList.toggle("is-active", item === button); item.setAttribute("aria-pressed", String(item === button)); });
        cards.forEach(function (card) {
          var show = filter === "all" || card.dataset.category.indexOf(filter) !== -1;
          card.hidden = !show;
        });
      });
    });
  }

  revealElements();
  animateCounters();
  setupSparkChart();
  setupLineChart();
  setupBarChart();
  setupFilters();
})();
