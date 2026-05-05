let chartInstances = {};

async function initDashboard() {
  showSkeleton(true);
  try {
    const raw = await fetchStats();
    renderKPICards(raw);
    renderWarehouseChart(raw);
    renderShipmentChart(raw);
    renderOnTimeChart(raw);
    renderRatingChart(raw);
    renderGenderChart(raw);
  } catch (err) {
    showToast("Gagal memuat data: " + err.message, "error");
    console.error(err);
  } finally {
    showSkeleton(false);
  }
}

function renderKPICards(data) {
  const total = data.length;
  const onTime = data.filter(d => d["Reached.on.Time_Y.N"] === 1).length;
  const onTimePct = total > 0 ? ((onTime / total) * 100).toFixed(1) : 0;
  const avgRating = (data.reduce((s, d) => s + (d.Customer_rating || 0), 0) / total).toFixed(2);
  const avgCost = (data.reduce((s, d) => s + (d.Cost_of_the_Product || 0), 0) / total).toFixed(0);
  const avgDiscount = (data.reduce((s, d) => s + (d.Discount_offered || 0), 0) / total).toFixed(1);

  document.getElementById("kpi-total").textContent = total.toLocaleString();
  document.getElementById("kpi-ontime").textContent = onTimePct + "%";
  document.getElementById("kpi-rating").textContent = avgRating;
  document.getElementById("kpi-cost").textContent = "$" + parseInt(avgCost).toLocaleString();
  document.getElementById("kpi-discount").textContent = avgDiscount + "%";
  document.getElementById("kpi-nottime").textContent = (total - onTime).toLocaleString();
}

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

const PALETTE = {
  orange: "#f97316",
  amber:  "#f59e0b",
  yellow: "#eab308",
  emerald:"#10b981",
  sky:    "#0ea5e9",
  rose:   "#f43f5e",
  violet: "#8b5cf6",
  slate:  "#64748b",
  dim:    "rgba(255,255,255,0.08)",
  text:   "rgba(255,255,255,0.65)",
};

function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: PALETTE.text, font: { family: "'Space Mono', monospace", size: 11 } } },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f97316",
        bodyColor: "#cbd5e1",
        borderColor: "#334155",
        borderWidth: 1,
      },
    },
    scales: {
      x: { ticks: { color: PALETTE.text }, grid: { color: PALETTE.dim } },
      y: { ticks: { color: PALETTE.text }, grid: { color: PALETTE.dim } },
    },
  };
}

function renderWarehouseChart(data) {
  const blocks = ["A","B","C","D","F"];
  const counts = blocks.map(b => data.filter(d => d.Warehouse_block === b).length);
  destroyChart("warehouseChart");
  const ctx = document.getElementById("warehouseChart").getContext("2d");
  chartInstances["warehouseChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: blocks.map(b => "Blok " + b),
      datasets: [{
        label: "Jumlah Paket",
        data: counts,
        backgroundColor: [PALETTE.orange, PALETTE.amber, PALETTE.yellow, PALETTE.emerald, PALETTE.sky],
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: { ...chartDefaults(), plugins: { ...chartDefaults().plugins, legend: { display: false } } }
  });
}

function renderShipmentChart(data) {
  const modes = ["Ship","Flight","Road"];
  const counts = modes.map(m => data.filter(d => d.Mode_of_Shipment === m).length);
  destroyChart("shipmentChart");
  const ctx = document.getElementById("shipmentChart").getContext("2d");
  chartInstances["shipmentChart"] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: modes,
      datasets: [{
        data: counts,
        backgroundColor: [PALETTE.sky, PALETTE.orange, PALETTE.emerald],
        borderColor: "#0f172a",
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { position: "bottom", labels: { color: PALETTE.text, padding: 16, font: { family: "'Space Mono', monospace", size: 11 } } },
        tooltip: chartDefaults().plugins.tooltip,
      }
    }
  });
}

function renderOnTimeChart(data) {
  const onTime = data.filter(d => d["Reached.on.Time_Y.N"] === 1).length;
  const late = data.length - onTime;
  destroyChart("ontimeChart");
  const ctx = document.getElementById("ontimeChart").getContext("2d");
  chartInstances["ontimeChart"] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Tepat Waktu", "Terlambat"],
      datasets: [{
        data: [onTime, late],
        backgroundColor: [PALETTE.emerald, PALETTE.rose],
        borderColor: "#0f172a",
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { position: "bottom", labels: { color: PALETTE.text, padding: 16, font: { family: "'Space Mono', monospace", size: 11 } } },
        tooltip: chartDefaults().plugins.tooltip,
      }
    }
  });
}

function renderImportanceChart(data) {
  const levels = ["low","medium","high"];
  const labels = ["Rendah","Sedang","Tinggi"];
  const counts = levels.map(l => data.filter(d => d.Product_importance === l).length);
  destroyChart("importanceChart");
  const ctx = document.getElementById("importanceChart").getContext("2d");
  chartInstances["importanceChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Jumlah",
        data: counts,
        backgroundColor: [PALETTE.emerald, PALETTE.amber, PALETTE.rose],
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      ...chartDefaults(),
      indexAxis: "y",
      plugins: { ...chartDefaults().plugins, legend: { display: false } }
    }
  });
}

function renderRatingChart(data) {
  const ratings = [1,2,3,4,5];
  const counts = ratings.map(r => data.filter(d => d.Customer_rating === r).length);
  destroyChart("ratingChart");
  const ctx = document.getElementById("ratingChart").getContext("2d");
  chartInstances["ratingChart"] = new Chart(ctx, {
    type: "line",
    data: {
      labels: ratings.map(r => "★".repeat(r)),
      datasets: [{
        label: "Pelanggan",
        data: counts,
        borderColor: PALETTE.amber,
        backgroundColor: "rgba(245,158,11,0.12)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: PALETTE.amber,
        pointRadius: 5,
        pointHoverRadius: 8,
      }]
    },
    options: chartDefaults()
  });
}

function renderGenderChart(data) {
  const m = data.filter(d => d.Gender === "M").length;
  const f = data.filter(d => d.Gender === "F").length;
  destroyChart("genderChart");
  const ctx = document.getElementById("genderChart").getContext("2d");
  chartInstances["genderChart"] = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Pria","Wanita"],
      datasets: [{
        data: [m, f],
        backgroundColor: [PALETTE.sky, PALETTE.violet],
        borderColor: "#0f172a",
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { color: PALETTE.text, padding: 16, font: { family: "'Space Mono', monospace", size: 11 } } },
        tooltip: chartDefaults().plugins.tooltip,
      }
    }
  });
}

function renderRecentActivity(data) {
  const tbody = document.getElementById("recent-tbody");
  if (!tbody) return;
  const recent = data.slice(0, 8);
  tbody.innerHTML = recent.map(d => `
    <tr>
      <td>#${d.ID}</td>
      <td><span class="badge badge-block">${d.Warehouse_block}</span></td>
      <td><span class="badge badge-ship">${d.Mode_of_Shipment}</span></td>
      <td>${d.Customer_rating} ★</td>
      <td>$${d.Cost_of_the_Product}</td>
      <td>
        <span class="status-badge ${d["Reached.on.Time_Y.N"] === 1 ? 'status-on' : 'status-late'}">
          ${d["Reached.on.Time_Y.N"] === 1 ? "✓ Tepat" : "✗ Terlambat"}
        </span>
      </td>
    </tr>
  `).join("");
}

function showSkeleton(show) {
  document.querySelectorAll(".chart-skeleton").forEach(el => {
    el.style.display = show ? "block" : "none";
  });
  document.querySelectorAll(".chart-canvas-wrap").forEach(el => {
    el.style.opacity = show ? "0" : "1";
  });
}

function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("toast-show"), 10);
  setTimeout(() => { t.classList.remove("toast-show"); setTimeout(() => t.remove(), 300); }, 3500);
}

document.addEventListener("DOMContentLoaded", initDashboard);