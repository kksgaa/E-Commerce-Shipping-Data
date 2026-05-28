// ==========================================
// INISIALISASI
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  if (typeof supabaseClient === 'undefined') {
    alert("🛑 ERROR: config.js belum dimuat atau Supabase Client gagal!");
    return;
  }

  // Clock
  setInterval(() => {
    const el = document.getElementById('sb-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('id-ID');
  }, 1000);

  // Event listeners
  document.getElementById('btn-add').addEventListener('click', () => openModal());
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  document.getElementById('btn-save').addEventListener('click', saveData);
  document.getElementById('btn-reset-filter').addEventListener('click', resetFilter);
  document.getElementById('filter-reached').addEventListener('change', applyFilter);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  fetchDataManagement();
});

// ==========================================
// STATE
// ==========================================
let allCrudData = [];
let filteredData = [];
let currentPage = 1;
const ROWS_PER_PAGE = 50;
let editingId = null;

// ==========================================
// 1. READ: Memuat Data
// ==========================================
async function fetchDataManagement() {
  const tableBody = document.getElementById('crud-table-body');
  if (tableBody) tableBody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:24px;color:var(--text-muted);">⏳ Memuat data warehouse dari Supabase...</td></tr>';

  try {
    const BATCH = 1000;
    let loadedData = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabaseClient
        .from('Fact_Pengiriman')
        .select('*')
        .range(from, from + BATCH - 1)
        .order('ID', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) break;

      loadedData = loadedData.concat(data);
      if (data.length < BATCH) break;
      from += BATCH;
    }

    allCrudData = loadedData;
    filteredData = [...allCrudData];
    updateBadgeAndCount();
    currentPage = 1;
    renderCrudTable();
    renderPagination();
  } catch (error) {
    console.error("Gagal memuat manajemen data:", error);
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:24px;color:#ef4444;">🛑 Error: ${error.message}</td></tr>`;
    showToast('❌ Gagal memuat data: ' + error.message, 'error');
  }
}

// ==========================================
// 2. RENDER: Menampilkan Data ke Tabel
// ==========================================
function renderCrudTable() {
  const tableBody = document.getElementById('crud-table-body');
  if (!tableBody) return;

  if (filteredData.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:24px;color:var(--text-muted);">Tidak ada data ditemukan.</td></tr>';
    updatePageInfo();
    return;
  }

  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const end = start + ROWS_PER_PAGE;
  const pageData = filteredData.slice(start, end);

  let html = '';
  pageData.forEach(row => {
    // FIX: 0 = Tepat Waktu, 1 = Terlambat
    const reached = Number(row["Reached.on.Time_Y.N"]);
    const statusBadge = reached === 0
      ? '<span class="badge status-on">Tepat Waktu</span>'
      : '<span class="badge status-late">Terlambat</span>';

    html += `
      <tr>
        <td style="font-family:monospace; font-weight:bold; color:var(--accent);">#${row.ID}</td>
        <td>Gudang ${row.ID_Gudang}</td>
        <td>Metode ${row.ID_Metode_Kirim}</td>
        <td class="num">$${Number(row.Cost_of_the_Product).toLocaleString()}</td>
        <td class="num">${Number(row.Weight_in_gms).toLocaleString()}g</td>
        <td>${row.Kategori_Berat || '-'}</td>
        <td class="num">${row.Discount_offered}%</td>
        <td class="num">${row.Customer_care_calls}</td>
        <td class="num">${row.Prior_purchases}x</td>
        <td>${statusBadge}</td>
        <td class="action-col">
          <button class="btn-icon" title="Edit" onclick="openModal(${row.ID})">✏️</button>
          <button class="btn-icon" title="Hapus" onclick="deleteRowData(${row.ID})" style="color:#ef4444;">🗑️</button>
        </td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;
  updatePageInfo();
}

// ==========================================
// PAGINATION
// ==========================================
function renderPagination() {
  const container = document.getElementById('pagination');
  if (!container) return;

  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '';
  html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">‹</button>`;

  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, currentPage + 2);
  if (start > 1) html += `<button onclick="goToPage(1)">1</button>${start > 2 ? '<button disabled>…</button>' : ''}`;
  for (let i = start; i <= end; i++) {
    html += `<button class="${i === currentPage ? 'pag-active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  if (end < totalPages) html += `${end < totalPages - 1 ? '<button disabled>…</button>' : ''}<button onclick="goToPage(${totalPages})">${totalPages}</button>`;
  html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">›</button>`;

  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  renderCrudTable();
  renderPagination();
  document.querySelector('.table-container').scrollTop = 0;
}

function updatePageInfo() {
  const el = document.getElementById('page-info');
  if (!el) return;
  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
  const start = Math.min((currentPage - 1) * ROWS_PER_PAGE + 1, filteredData.length);
  const end = Math.min(currentPage * ROWS_PER_PAGE, filteredData.length);
  el.textContent = filteredData.length > 0
    ? `Menampilkan ${start}–${end} dari ${filteredData.length.toLocaleString()} baris`
    : 'Tidak ada data';
}

function updateBadgeAndCount() {
  const badge = document.getElementById('nav-badge-total');
  if (badge) badge.textContent = allCrudData.length.toLocaleString();
  const rowCount = document.getElementById('row-count');
  if (rowCount) rowCount.textContent = `${allCrudData.length.toLocaleString()} total baris`;
}

// ==========================================
// 3. DELETE
// ==========================================
async function deleteRowData(id) {
  if (!confirm(`Hapus data #${id}?`)) return;
  try {
    const { error } = await supabaseClient.from('Fact_Pengiriman').delete().eq('ID', id);
    if (error) throw error;
    showToast(`✅ Data #${id} berhasil dihapus!`, 'success');
    fetchDataManagement();
  } catch (error) {
    showToast("❌ Gagal hapus: " + error.message, 'error');
  }
}

// ==========================================
// 4. SEARCH
// ==========================================
function searchCrudData() {
  const keyword = document.getElementById('search-input').value.toLowerCase().trim();
  const filterVal = document.getElementById('filter-reached').value;

  filteredData = allCrudData.filter(d => {
    const matchSearch = keyword === '' ||
      String(d.ID).includes(keyword) ||
      String(d.Status_Pengiriman || '').toLowerCase().includes(keyword) ||
      String(d.ID_Gudang).includes(keyword) ||
      String(d.ID_Metode_Kirim).includes(keyword);

    const matchFilter = filterVal === '' || String(d["Reached.on.Time_Y.N"]) === filterVal;

    return matchSearch && matchFilter;
  });

  currentPage = 1;
  renderCrudTable();
  renderPagination();
}

// ==========================================
// 5. FILTER
// ==========================================
function applyFilter() {
  searchCrudData();
}

function resetFilter() {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-reached').value = '';
  filteredData = [...allCrudData];
  currentPage = 1;
  renderCrudTable();
  renderPagination();
}

// ==========================================
// 6. MODAL: Tambah / Edit
// ==========================================
function openModal(id = null) {
  editingId = id;
  const modal = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');

  // Reset form
  document.getElementById('field-gudang').value = '';
  document.getElementById('field-metode').value = '1';
  document.getElementById('field-cost').value = '';
  document.getElementById('field-weight').value = '';
  document.getElementById('field-discount').value = '';
  document.getElementById('field-calls').value = '';
  document.getElementById('field-prior').value = '';
  document.getElementById('field-reached').value = '0';

  if (id !== null) {
    title.textContent = `Edit Data #${id}`;
    const row = allCrudData.find(r => r.ID === id);
    if (row) {
      document.getElementById('field-gudang').value = row.ID_Gudang;
      document.getElementById('field-metode').value = row.ID_Metode_Kirim;
      document.getElementById('field-cost').value = row.Cost_of_the_Product;
      document.getElementById('field-weight').value = row.Weight_in_gms;
      document.getElementById('field-discount').value = row.Discount_offered;
      document.getElementById('field-calls').value = row.Customer_care_calls;
      document.getElementById('field-prior').value = row.Prior_purchases;
      document.getElementById('field-reached').value = row["Reached.on.Time_Y.N"];
    }
  } else {
    title.textContent = 'Tambah Data Fakta';
  }

  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  editingId = null;
}

// ==========================================
// 7. SAVE (INSERT / UPDATE)
// ==========================================
async function saveData() {
  const gudang = parseInt(document.getElementById('field-gudang').value);
  const metode = parseInt(document.getElementById('field-metode').value);
  const cost = parseFloat(document.getElementById('field-cost').value);
  const weight = parseFloat(document.getElementById('field-weight').value);
  const discount = parseFloat(document.getElementById('field-discount').value);
  const calls = parseInt(document.getElementById('field-calls').value);
  const prior = parseInt(document.getElementById('field-prior').value);
  const reached = parseInt(document.getElementById('field-reached').value);

  if (!gudang || !metode || isNaN(cost) || isNaN(weight) || isNaN(discount) || isNaN(calls) || isNaN(prior)) {
    showToast('⚠️ Lengkapi semua field!', 'error');
    return;
  }

  // Hitung Kategori_Berat otomatis
  let kategori_berat = 'Berat';
  if (weight < 2000) kategori_berat = 'Ringan';
  else if (weight < 4000) kategori_berat = 'Sedang';

  // Hitung Status_Pengiriman otomatis
  const status_pengiriman = reached === 1 ? 'Terlambat' : 'Tepat Waktu';

  // Hitung Kategori_Diskon otomatis
  let kategori_diskon = 'Tinggi';
  if (discount < 10) kategori_diskon = 'Rendah';
  else if (discount < 30) kategori_diskon = 'Sedang';

  const payload = {
    ID_Gudang: gudang,
    ID_Metode_Kirim: metode,
    Cost_of_the_Product: cost,
    Weight_in_gms: weight,
    Kategori_Berat: kategori_berat,
    Discount_offered: discount,
    Kategori_Diskon: kategori_diskon,
    Customer_care_calls: calls,
    Prior_purchases: prior,
    "Reached.on.Time_Y.N": reached,
    Status_Pengiriman: status_pengiriman,
  };

  try {
    if (editingId !== null) {
      // UPDATE
      const { error } = await supabaseClient
        .from('Fact_Pengiriman')
        .update(payload)
        .eq('ID', editingId);
      if (error) throw error;
      showToast(`✅ Data #${editingId} berhasil diupdate!`, 'success');
    } else {
      // INSERT
      const { error } = await supabaseClient
        .from('Fact_Pengiriman')
        .insert([payload]);
      if (error) throw error;
      showToast('✅ Data baru berhasil ditambahkan!', 'success');
    }

    closeModal();
    fetchDataManagement();
  } catch (error) {
    showToast('❌ Gagal simpan: ' + error.message, 'error');
  }
}

// ==========================================
// TOAST NOTIFICATION
// ==========================================
function showToast(message, type = 'success') {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  setTimeout(() => toast.classList.add('toast-show'), 10);
  setTimeout(() => toast.classList.remove('toast-show'), 3500);
}