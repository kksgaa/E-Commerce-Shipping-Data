let currentPage = 1;
const PAGE_SIZE = 15;
let totalRows = 0;
let activeFilters = {};
let editingId = null;

document.addEventListener("DOMContentLoaded", () => {
  loadTable();
  bindFilterEvents();
  bindModalEvents();
  bindFormEvents();
});

async function loadTable() {
  setTableLoading(true);
  try {
    const { data, count } = await fetchAllData(activeFilters, currentPage, PAGE_SIZE);
    totalRows = count || 0;
    renderTable(data);
    renderPagination();
    document.getElementById("row-count").textContent = `${totalRows.toLocaleString()} baris`;
  } catch (err) {
    showToastCrud("Gagal memuat data: " + err.message, "error");
  } finally {
    setTableLoading(false);
  }
}

function renderTable(data) {
  const tbody = document.getElementById("data-tbody");
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" class="empty-row">Tidak ada data ditemukan</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(d => `
    <tr data-id="${d.ID}">
      <td><span class="id-badge">#${d.ID}</span></td>
      <td><span class="badge badge-block">${d.Warehouse_block}</span></td>
      <td><span class="badge badge-ship ship-${d.Mode_of_Shipment?.toLowerCase()}">${d.Mode_of_Shipment}</span></td>
      <td class="num">${d.Customer_care_calls}</td>
      <td class="num">${"★".repeat(d.Customer_rating || 0)}<span class="num-sub">(${d.Customer_rating})</span></td>
      <td class="num">$${(d.Cost_of_the_Product || 0).toLocaleString()}</td>
      <td class="num">${d.Prior_purchases}</td>
      <td><span class="badge badge-imp imp-${d.Product_importance}">${d.Product_importance}</span></td>
      <td>${d.Gender === "M" ? "♂ Pria" : "♀ Wanita"}</td>
      <td class="num">${d.Discount_offered}%</td>
      <td class="num">${(d.Weight_in_gms || 0).toLocaleString()} g</td>
      <td>
        <span class="status-badge ${d["Reached.on.Time_Y.N"] === 1 ? 'status-on' : 'status-late'}">
          ${d["Reached.on.Time_Y.N"] === 1 ? "✓ Tepat" : "✗ Telat"}
        </span>
      </td>
      <td class="action-col">
        <button class="btn-icon btn-edit" onclick="openEditModal(${d.ID})" title="Edit">✏️</button>
        <button class="btn-icon btn-delete" onclick="confirmDelete(${d.ID})" title="Hapus">🗑️</button>
      </td>
    </tr>
  `).join("");
}

function renderPagination() {
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);
  const pag = document.getElementById("pagination");
  if (totalPages <= 1) { pag.innerHTML = ""; return; }

  let html = `<button onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>‹</button>`;
  const range = pageRange(currentPage, totalPages);
  range.forEach(p => {
    if (p === "...") {
      html += `<span class="pag-dots">…</span>`;
    } else {
      html += `<button class="${p === currentPage ? 'pag-active' : ''}" onclick="goPage(${p})">${p}</button>`;
    }
  });
  html += `<button onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}>›</button>`;
  pag.innerHTML = html;
}

function pageRange(cur, total) {
  if (total <= 7) return Array.from({length: total}, (_, i) => i + 1);
  if (cur <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (cur >= total - 3) return [1, "...", total-4, total-3, total-2, total-1, total];
  return [1, "...", cur-1, cur, cur+1, "...", total];
}

function goPage(p) {
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  loadTable();
}

function bindFilterEvents() {
  document.getElementById("filter-warehouse")?.addEventListener("change", applyFilters);
  document.getElementById("filter-shipment")?.addEventListener("change", applyFilters);
  document.getElementById("filter-importance")?.addEventListener("change", applyFilters);
  document.getElementById("filter-reached")?.addEventListener("change", applyFilters);
  let searchTimer;
  document.getElementById("search-input")?.addEventListener("input", e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 400);
  });
  document.getElementById("btn-reset-filter")?.addEventListener("click", resetFilters);
}

function applyFilters() {
  activeFilters = {
    warehouse_block: document.getElementById("filter-warehouse")?.value || "",
    mode_of_shipment: document.getElementById("filter-shipment")?.value || "",
    product_importance: document.getElementById("filter-importance")?.value || "",
    reached: document.getElementById("filter-reached")?.value,
    search: document.getElementById("search-input")?.value || "",
  };
  Object.keys(activeFilters).forEach(k => {
    if (activeFilters[k] === "" || activeFilters[k] === undefined) delete activeFilters[k];
  });
  currentPage = 1;
  loadTable();
}

function resetFilters() {
  document.getElementById("filter-warehouse").value = "";
  document.getElementById("filter-shipment").value = "";
  document.getElementById("filter-importance").value = "";
  document.getElementById("filter-reached").value = "";
  document.getElementById("search-input").value = "";
  activeFilters = {};
  currentPage = 1;
  loadTable();
}

function bindModalEvents() {
  document.getElementById("btn-add")?.addEventListener("click", openAddModal);
  document.getElementById("modal-close")?.addEventListener("click", closeModal);
  document.getElementById("modal-overlay")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById("confirm-cancel")?.addEventListener("click", closeConfirm);
}

function openAddModal() {
  editingId = null;
  document.getElementById("modal-title").textContent = "Tambah Data";
  document.getElementById("entry-form").reset();
  document.getElementById("field-id").value = "";
  document.getElementById("modal-overlay").classList.add("active");
}

async function openEditModal(id) {
  try {
    const row = await fetchRowById(id);
    editingId = id;
    document.getElementById("modal-title").textContent = "Edit Data #" + id;
    document.getElementById("field-id").value = row.ID;
    document.getElementById("field-warehouse").value = row.Warehouse_block;
    document.getElementById("field-shipment").value = row.Mode_of_Shipment;
    document.getElementById("field-care-calls").value = row.Customer_care_calls;
    document.getElementById("field-rating").value = row.Customer_rating;
    document.getElementById("field-cost").value = row.Cost_of_the_Product;
    document.getElementById("field-prior").value = row.Prior_purchases;
    document.getElementById("field-importance").value = row.Product_importance;
    document.getElementById("field-gender").value = row.Gender;
    document.getElementById("field-discount").value = row.Discount_offered;
    document.getElementById("field-weight").value = row.Weight_in_gms;
    document.getElementById("field-reached").value = row["Reached.on.Time_Y.N"];
    document.getElementById("modal-overlay").classList.add("active");
  } catch (err) {
    showToastCrud("Gagal memuat data: " + err.message, "error");
  }
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("active");
  editingId = null;
}

function bindFormEvents() {
  document.getElementById("entry-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = document.getElementById("btn-save");
    btn.disabled = true;
    btn.textContent = "Menyimpan…";

    const row = {
      Warehouse_block: document.getElementById("field-warehouse").value,
      Mode_of_Shipment: document.getElementById("field-shipment").value,
      Customer_care_calls: parseInt(document.getElementById("field-care-calls").value),
      Customer_rating: parseInt(document.getElementById("field-rating").value),
      Cost_of_the_Product: parseInt(document.getElementById("field-cost").value),
      Prior_purchases: parseInt(document.getElementById("field-prior").value),
      Product_importance: document.getElementById("field-importance").value,
      Gender: document.getElementById("field-gender").value,
      Discount_offered: parseInt(document.getElementById("field-discount").value),
      Weight_in_gms: parseInt(document.getElementById("field-weight").value),
      "Reached.on.Time_Y.N": parseInt(document.getElementById("field-reached").value),
    };

    try {
      if (editingId) {
        await updateRow(editingId, row);
        showToastCrud("Data berhasil diperbarui ✓", "success");
      } else {
        await insertRow(row);
        showToastCrud("Data berhasil ditambahkan ✓", "success");
      }
      closeModal();
      loadTable();
    } catch (err) {
      showToastCrud("Gagal menyimpan: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Simpan";
    }
  });
}

let pendingDeleteId = null;

function confirmDelete(id) {
  pendingDeleteId = id;
  document.getElementById("confirm-overlay").classList.add("active");
}

function closeConfirm() {
  pendingDeleteId = null;
  document.getElementById("confirm-overlay").classList.remove("active");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("confirm-ok")?.addEventListener("click", async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteRow(pendingDeleteId);
      showToastCrud("Data #" + pendingDeleteId + " dihapus ✓", "success");
      closeConfirm();
      loadTable();
    } catch (err) {
      showToastCrud("Gagal menghapus: " + err.message, "error");
      closeConfirm();
    }
  });
});

function setTableLoading(loading) {
  document.getElementById("table-loading").style.display = loading ? "flex" : "none";
  document.getElementById("data-table-wrap").style.opacity = loading ? "0.4" : "1";
}

function showToastCrud(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("toast-show"), 10);
  setTimeout(() => { t.classList.remove("toast-show"); setTimeout(() => t.remove(), 300); }, 3500);
}