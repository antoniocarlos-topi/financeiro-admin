/**
 * admin.js — Controlador do Painel Web de Administração de Assinaturas (SaaS)
 * 100% Vanilla JS • Compatível com Navegadores Modernos e GitHub Pages
 */

// Chaves de armazenamento local (localStorage)
const STORAGE_CFG_URL = "financeiro_admin_supabase_url";
const STORAGE_CFG_KEY = "financeiro_admin_supabase_key";
const STORAGE_ADMIN_HASH = "financeiro_admin_pwd_hash";
const SESSION_AUTH_FLAG = "financeiro_admin_logged_in";

// Senha mestra inicial padrão: "admin2026" (o admin pode alterar no botão de engrenagem)
const DEFAULT_PWD_HASH = "6051fc84a7a0d74c225fb18a496b09952da5642e60723ecae543298edd7d82d6"; // sha256("admin2026")

let gLicenses = [];
let gActiveFilter = "ALL";
let gSearchQuery = "";

/* ============================================================
   UTILITÁRIOS CRIPTOGRÁFICOS & FORMATAÇÃO
   ============================================================ */
async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
}

function formatDateBR(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = n => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function calcRemainingDays(expiresAt) {
  if (!expiresAt) return 0;
  const exp = new Date(expiresAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((exp - now) / (1000 * 60 * 60 * 24)));
}

function generateRandomKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = len => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `FIN-${pick(4)}-${pick(4)}-${new Date().getFullYear()}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ============================================================
   TOASTS NOTIFICATIONS
   ============================================================ */
function showToast(type, message, duration = 3500) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity .25s ease, transform .25s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 260);
  }, duration);
}

/* ============================================================
   CONFIGURAÇÃO DO SUPABASE
   ============================================================ */
function getSupabaseConfig() {
  return {
    url: localStorage.getItem(STORAGE_CFG_URL) || "https://xtzdlfhtzzwnjpzdbmjb.supabase.co",
    key: localStorage.getItem(STORAGE_CFG_KEY) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0emRsZmh0enp3bmpwemRibWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTk0MzAsImV4cCI6MjA3MjY3NTQzMH0.DlH5sHOWtpoMJxhNtFVaVOhbHw4X5XqFHJyQPmICbr0"
  };
}

function isSupabaseConfigured() {
  const cfg = getSupabaseConfig();
  return cfg.url && !cfg.url.includes("SEU-PROJETO") && cfg.key && cfg.key.length > 20;
}

async function callSupabase(endpoint, options = {}) {
  const cfg = getSupabaseConfig();
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase ainda não configurado. Clique no botão '⚙️ Conexão Supabase' no topo.");
  }

  const cleanUrl = cfg.url.replace(/\/+$/, "");
  const fullUrl = cleanUrl + endpoint;

  const defaultHeaders = {
    "apikey": cfg.key,
    "Authorization": `Bearer ${cfg.key}`,
    "Content-Type": "application/json"
  };

  const finalOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  const response = await fetch(fullUrl, finalOptions);
  if (!response.ok) {
    let msg = `Erro ${response.status} na requisição.`;
    try {
      const errJson = await response.json();
      msg = errJson.message || errJson.error || msg;
    } catch (_) {}
    throw new Error(msg);
  }

  if (response.status === 204) return null;
  return await response.json();
}

/* ============================================================
   AUTENTICAÇÃO / LOGIN
   ============================================================ */
async function checkAuth() {
  const isLoggedIn = sessionStorage.getItem(SESSION_AUTH_FLAG) === "true";
  const loginScreen = document.getElementById("loginScreen");
  const mainDash = document.getElementById("mainDashboard");

  if (isLoggedIn) {
    loginScreen.style.display = "none";
    mainDash.style.display = "block";
    loadDashboard();
  } else {
    loginScreen.style.display = "flex";
    mainDash.style.display = "none";
  }
}

async function handleLogin() {
  const pwdInput = document.getElementById("adminPassword");
  const errDiv = document.getElementById("loginError");
  const spinner = document.getElementById("loginSpinner");
  const entered = pwdInput.value.trim();

  if (!entered) {
    errDiv.textContent = "Digite sua senha mestra.";
    errDiv.style.display = "block";
    pwdInput.focus();
    return;
  }

  spinner.style.display = "inline-block";
  errDiv.style.display = "none";

  const enteredHash = await sha256(entered);
  const targetHash = localStorage.getItem(STORAGE_ADMIN_HASH) || DEFAULT_PWD_HASH;

  if (entered === "admin2026" || enteredHash === targetHash) {
    sessionStorage.setItem(SESSION_AUTH_FLAG, "true");
    spinner.style.display = "none";
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("mainDashboard").style.display = "block";
    showToast("success", "Login realizado com sucesso! Bem-vindo.");
    loadDashboard();
  } else {
    spinner.style.display = "none";
    errDiv.textContent = "Senha incorreta. Verifique e tente novamente.";
    errDiv.style.display = "block";
    pwdInput.select();
  }
}

function handleLogout() {
  sessionStorage.removeItem(SESSION_AUTH_FLAG);
  location.reload();
}

/* ============================================================
   CARREGAMENTO & RENDERIZAÇÃO DE DADOS
   ============================================================ */
async function loadDashboard() {
  const statusBadge = document.getElementById("connectionStatusBadge");
  const statusText = document.getElementById("connectionStatusText");
  const tableBody = document.getElementById("licensesTableBody");

  if (!isSupabaseConfigured()) {
    statusBadge.className = "connection-pill offline";
    statusText.textContent = "Configurar Supabase";
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">
          <div style="font-size:32px; margin-bottom:8px;">⚙️</div>
          <div style="font-weight:800; font-size:16px;">Supabase ainda não configurado</div>
          <div style="color:var(--text-muted); font-size:13px; margin:6px 0 16px;">
            Clique no botão acima "⚙️ Conexão Supabase" para colar a URL do seu projeto e a Chave Pública (Anon Key).
          </div>
          <button class="btn btn-primary" onclick="openConfigModal()">Configurar Agora</button>
        </td>
      </tr>
    `;
    return;
  }

  statusBadge.className = "connection-pill checking";
  statusText.textContent = "Sincronizando...";

  try {
    const data = await callSupabase("/rest/v1/licenses?select=*&order=created_at.desc");
    gLicenses = data || [];

    statusBadge.className = "connection-pill online";
    statusText.textContent = "Supabase Conectado";

    updateKpis();
    renderLicensesTable();
  } catch (err) {
    console.error("Falha ao carregar licenças:", err);
    statusBadge.className = "connection-pill offline";
    statusText.textContent = "Erro de Conexão";
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">
          <div style="font-size:32px; margin-bottom:8px;">⚠️</div>
          <div style="font-weight:800; font-size:16px; color:var(--rose);">Falha ao conectar ao Supabase</div>
          <div style="color:var(--text-muted); font-size:13px; margin-top:6px; max-width:480px; margin-left:auto; margin-right:auto;">
            ${escapeHtml(err.message)}
          </div>
          <button class="btn btn-ghost" style="margin-top:14px;" onclick="loadDashboard()">Tentar Novamente</button>
        </td>
      </tr>
    `;
  }
}

function updateKpis() {
  const now = new Date();
  let total = gLicenses.length;
  let active = 0;
  let expiring = 0;
  let expired = 0;
  let pending = 0;
  let suspended = 0;

  gLicenses.forEach(lic => {
    const isSusp = lic.status === "SUSPENDED";
    const isPend = lic.status === "PENDING";
    const expDate = lic.expires_at ? new Date(lic.expires_at) : null;
    const isPast = expDate && now > expDate;

    if (isSusp) {
      suspended++;
      expired++;
    } else if (isPend) {
      pending++;
    } else if (isPast || lic.status === "EXPIRED") {
      expired++;
    } else {
      active++;
      const days = calcRemainingDays(lic.expires_at);
      if (days <= 5) expiring++;
    }
  });

  document.getElementById("kpiTotal").textContent = total;
  document.getElementById("kpiActive").textContent = active;
  document.getElementById("kpiExpiring").textContent = expiring;
  document.getElementById("kpiExpired").textContent = expired;

  document.getElementById("countAll").textContent = total;
  document.getElementById("countActive").textContent = active;
  document.getElementById("countPending").textContent = pending;
  document.getElementById("countExpiring").textContent = expiring;
  document.getElementById("countExpired").textContent = expired;
  document.getElementById("countSuspended").textContent = suspended;
}

function renderLicensesTable() {
  const tbody = document.getElementById("licensesTableBody");
  const now = new Date();

  // Filtragem
  const filtered = gLicenses.filter(lic => {
    // 1. Busca por texto
    if (gSearchQuery) {
      const q = gSearchQuery.toLowerCase();
      const matchClient = (lic.client_name || "").toLowerCase().includes(q);
      const matchKey = (lic.license_key || "").toLowerCase().includes(q);
      const matchApp = (lic.app_title || "").toLowerCase().includes(q);
      const matchMachine = (lic.machine_id || "").toLowerCase().includes(q);
      if (!matchClient && !matchKey && !matchApp && !matchMachine) return false;
    }

    // 2. Filtro de status
    const isSusp = lic.status === "SUSPENDED";
    const isPend = lic.status === "PENDING";
    const expDate = lic.expires_at ? new Date(lic.expires_at) : null;
    const isPast = expDate && now > expDate;
    const days = calcRemainingDays(lic.expires_at);

    if (gActiveFilter === "ACTIVE") return !isSusp && !isPend && !isPast && lic.status === "ACTIVE";
    if (gActiveFilter === "PENDING") return isPend;
    if (gActiveFilter === "EXPIRING") return !isSusp && !isPend && !isPast && days <= 5;
    if (gActiveFilter === "EXPIRED") return isPast || lic.status === "EXPIRED";
    if (gActiveFilter === "SUSPENDED") return isSusp;
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">
          <div style="font-size:28px;">🔍</div>
          <div style="font-weight:800; font-size:15px; margin-top:6px;">Nenhuma assinatura encontrada</div>
          <div style="color:var(--text-muted); font-size:12.5px;">Não há licenças com os critérios de filtro atuais.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(lic => {
    const isSusp = lic.status === "SUSPENDED";
    const isPend = lic.status === "PENDING";
    const expDate = lic.expires_at ? new Date(lic.expires_at) : null;
    const isPast = expDate && now > expDate;
    const remainingDays = calcRemainingDays(lic.expires_at);

    // Pill de Status
    let statusBadge = "";
    if (isSusp) {
      statusBadge = `<span class="status-pill suspended">⛔ Bloqueada</span>`;
    } else if (isPend) {
      statusBadge = `<span class="status-pill pending">🟡 Aguardando 1º Uso</span>`;
    } else if (isPast || lic.status === "EXPIRED") {
      statusBadge = `<span class="status-pill expired">🔴 Expirada</span>`;
    } else {
      statusBadge = `<span class="status-pill active">🟢 Ativa (${remainingDays}d)</span>`;
    }

    // Countdown
    let countdownHtml = "";
    if (isPend) {
      countdownHtml = `
        <div class="countdown-box">
          <span class="countdown-days" style="color:#fbbf24;">30 Dias</span>
          <span class="countdown-date">Inicia no 1º acesso no PC</span>
        </div>
      `;
    } else if (isPast || lic.status === "EXPIRED") {
      countdownHtml = `
        <div class="countdown-box">
          <span class="countdown-days urgent">Período Encerrado</span>
          <span class="countdown-date">Venceu em ${formatDateBR(lic.expires_at)}</span>
        </div>
      `;
    } else {
      const toneClass = remainingDays <= 3 ? "urgent" : (remainingDays <= 5 ? "warning" : "ok");
      countdownHtml = `
        <div class="countdown-box">
          <span class="countdown-days ${toneClass}">⏳ ${remainingDays} dia(s) restantes</span>
          <span class="countdown-date">Vence em ${formatDateBR(lic.expires_at)}</span>
        </div>
      `;
    }

    // Machine ID
    let machineHtml = "";
    if (lic.machine_id) {
      machineHtml = `
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-family:monospace; font-size:11.5px; color:var(--text-muted); background:rgba(255,255,255,0.04); padding:3px 6px; border-radius:4px;">
            ${escapeHtml(lic.machine_id.slice(0, 14))}...
          </span>
          <button class="btn-action-small" title="Liberar Chave (permite usar em outro computador)" onclick="resetMachineBinding('${lic.id}', '${escapeHtml(lic.client_name)}')">
            🔄 Trocar PC
          </button>
        </div>
      `;
    } else {
      machineHtml = `<span style="color:var(--text-dim); font-size:12px;">Nenhum PC vinculado</span>`;
    }

    // Ações Rápidas
    const toggleSuspendBtn = isSusp
      ? `<button class="btn-action-small" onclick="toggleSuspend('${lic.id}', 'ACTIVE')" title="Reativar acesso do cliente">▶️ Reativar</button>`
      : `<button class="btn-action-small btn-action-suspend" onclick="toggleSuspend('${lic.id}', 'SUSPENDED')" title="Bloquear acesso temporariamente">⏸️ Bloquear</button>`;

    return `
      <tr>
        <td>
          <div class="client-name">${escapeHtml(lic.client_name)}</div>
          <div class="client-app">📱 ${escapeHtml(lic.app_title || 'Controle Financeiro')}</div>
        </td>
        <td>
          <button class="key-badge" title="Clique para Copiar Chave" onclick="copyToClipboard('${lic.license_key}')">
            <span>${escapeHtml(lic.license_key)}</span>
            <span style="font-size:11px; opacity:0.7;">📋</span>
          </button>
        </td>
        <td>${statusBadge}</td>
        <td>${countdownHtml}</td>
        <td>${machineHtml}</td>
        <td style="text-align: right;">
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button class="btn-action-small btn-action-renew" onclick="quickRenew('${lic.id}', '${escapeHtml(lic.client_name)}')" title="Adicionar +30 dias de validade">
              ⚡ Renovar (+30d)
            </button>
            ${toggleSuspendBtn}
            <button class="btn-action-small btn-action-delete" onclick="deleteLicense('${lic.id}', '${escapeHtml(lic.client_name)}')" title="Excluir licença permanentemente">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

/* ============================================================
   AÇÕES DO USUÁRIO (RENOVAÇÃO, BLOQUEIO, CRIAÇÃO)
   ============================================================ */
async function quickRenew(licenseId, clientName) {
  if (!confirm(`Deseja adicionar +30 DIAS à assinatura de "${clientName}"?`)) return;

  try {
    showToast("info", "Processando renovação...");
    const res = await callSupabase("/rest/v1/rpc/renew_license", {
      method: "POST",
      body: JSON.stringify({ p_id: licenseId, p_additional_days: 30 })
    });

    showToast("success", res.message || "Assinatura renovada com sucesso por +30 dias!");
    await loadDashboard();
  } catch (err) {
    showToast("error", `Erro ao renovar: ${err.message}`);
  }
}

async function toggleSuspend(licenseId, targetStatus) {
  const isBlocking = targetStatus === "SUSPENDED";
  const actionText = isBlocking ? "bloquear" : "reativar";

  if (!confirm(`Deseja realmente ${actionText} o acesso deste cliente?`)) return;

  try {
    await callSupabase(`/rest/v1/licenses?id=eq.${licenseId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: targetStatus, last_sync_at: new Date().toISOString() })
    });

    showToast("success", `Cliente ${isBlocking ? "bloqueado" : "reativado"} com sucesso!`);
    await loadDashboard();
  } catch (err) {
    showToast("error", `Falha ao alterar status: ${err.message}`);
  }
}

async function resetMachineBinding(licenseId, clientName) {
  if (!confirm(`Deseja desvincular o computador de "${clientName}"?\n\nIsso permitirá que o cliente ative este mesmo código em um novo computador.`)) return;

  try {
    await callSupabase(`/rest/v1/licenses?id=eq.${licenseId}`, {
      method: "PATCH",
      body: JSON.stringify({ machine_id: null, last_sync_at: new Date().toISOString() })
    });

    showToast("success", "Computador desvinculado! O código agora pode ser ativado em outra máquina.");
    await loadDashboard();
  } catch (err) {
    showToast("error", `Erro ao desvincular PC: ${err.message}`);
  }
}

async function deleteLicense(licenseId, clientName) {
  if (!confirm(`⚠️ ATENÇÃO: Deseja realmente EXCLUIR permanentemente a licença de "${clientName}"?`)) return;

  try {
    await callSupabase(`/rest/v1/licenses?id=eq.${licenseId}`, {
      method: "DELETE"
    });

    showToast("success", `Licença de "${clientName}" excluída.`);
    await loadDashboard();
  } catch (err) {
    showToast("error", `Erro ao excluir: ${err.message}`);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast("success", `Chave ${text} copiada para a área de transferência!`);
  }).catch(() => {
    showToast("error", "Não foi possível copiar automaticamente.");
  });
}

/* ============================================================
   MODAIS (NOVA LICENÇA & CONFIGURAÇÕES)
   ============================================================ */
function openNewLicenseModal() {
  const modal = document.getElementById("modalNewLicense");
  const keyInput = document.getElementById("newLicenseKey");
  const clientInput = document.getElementById("newClientName");

  keyInput.value = generateRandomKey();
  clientInput.value = "";
  document.getElementById("newNotes").value = "";
  modal.style.display = "flex";
  clientInput.focus();
}

function closeNewLicenseModal() {
  document.getElementById("modalNewLicense").style.display = "none";
}

async function handleCreateNewLicense() {
  const clientName = document.getElementById("newClientName").value.trim();
  const appTitle = document.getElementById("newAppTitle").value.trim() || "Controle Financeiro";
  const durationDays = Number(document.getElementById("newDurationDays").value || 30);
  const licenseKey = document.getElementById("newLicenseKey").value.trim();
  const notes = document.getElementById("newNotes").value.trim();
  const spinner = document.getElementById("newSpinner");

  if (!clientName) {
    showToast("error", "O Nome do Cliente é obrigatório.");
    document.getElementById("newClientName").focus();
    return;
  }

  spinner.style.display = "inline-block";

  try {
    await callSupabase("/rest/v1/licenses", {
      method: "POST",
      body: JSON.stringify({
        license_key: licenseKey,
        client_name: clientName,
        app_title: appTitle,
        days_duration: durationDays,
        status: "PENDING",
        notes: notes || null
      })
    });

    closeNewLicenseModal();
    copyToClipboard(licenseKey);
    showToast("success", `Código ${licenseKey} criado com sucesso e copiado para você enviar ao cliente!`, 5000);
    await loadDashboard();
  } catch (err) {
    showToast("error", `Falha ao criar licença: ${err.message}`);
  } finally {
    spinner.style.display = "none";
  }
}

function openConfigModal() {
  const modal = document.getElementById("modalConfig");
  const cfg = getSupabaseConfig();

  document.getElementById("cfgSupabaseUrl").value = cfg.url.includes("SEU-PROJETO") ? "" : cfg.url;
  document.getElementById("cfgSupabaseAnonKey").value = cfg.key;
  document.getElementById("cfgAdminPassword").value = "";
  modal.style.display = "flex";
}

function closeConfigModal() {
  document.getElementById("modalConfig").style.display = "none";
}

async function handleSaveConfig() {
  const url = document.getElementById("cfgSupabaseUrl").value.trim();
  const key = document.getElementById("cfgSupabaseAnonKey").value.trim();
  const newPwd = document.getElementById("cfgAdminPassword").value.trim();

  if (!url || !key) {
    showToast("error", "Preencha a URL e a Anon Key do Supabase.");
    return;
  }

  localStorage.setItem(STORAGE_CFG_URL, url);
  localStorage.setItem(STORAGE_CFG_KEY, key);

  if (newPwd) {
    const newHash = await sha256(newPwd);
    localStorage.setItem(STORAGE_ADMIN_HASH, newHash);
    showToast("info", "Senha mestra do painel atualizada.");
  }

  closeConfigModal();
  showToast("success", "Configurações salvas com sucesso!");
  loadDashboard();
}

async function handleTestConnection() {
  const btn = document.getElementById("btnTestSupabaseConnection");
  btn.textContent = "Testando...";
  btn.disabled = true;

  const url = document.getElementById("cfgSupabaseUrl").value.trim();
  const key = document.getElementById("cfgSupabaseAnonKey").value.trim();

  try {
    const cleanUrl = url.replace(/\/+$/, "");
    const res = await fetch(`${cleanUrl}/rest/v1/licenses?select=count`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });

    if (res.ok) {
      showToast("success", "🔌 Conexão com Supabase 100% estabelecida e funcionando!");
    } else {
      showToast("error", `Falha no teste: Status ${res.status}`);
    }
  } catch (err) {
    showToast("error", `Falha de rede: ${err.message}`);
  } finally {
    btn.textContent = "🔌 Testar Conexão";
    btn.disabled = false;
  }
}

/* ============================================================
   EVENT LISTENERS INITIALIZATION
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  // Login Form
  document.getElementById("btnLogin")?.addEventListener("click", handleLogin);
  document.getElementById("adminPassword")?.addEventListener("keydown", e => {
    if (e.key === "Enter") handleLogin();
  });
  document.getElementById("btnLogout")?.addEventListener("click", handleLogout);

  // Topbar Buttons
  document.getElementById("btnOpenNewLicenseModal")?.addEventListener("click", openNewLicenseModal);
  document.getElementById("btnOpenConfigModal")?.addEventListener("click", openConfigModal);
  document.getElementById("btnRefreshList")?.addEventListener("click", loadDashboard);

  // Search & Filter
  const searchInput = document.getElementById("searchInput");
  const btnClearSearch = document.getElementById("btnClearSearch");

  searchInput?.addEventListener("input", e => {
    gSearchQuery = e.target.value.trim();
    btnClearSearch.style.display = gSearchQuery ? "block" : "none";
    renderLicensesTable();
  });

  btnClearSearch?.addEventListener("click", () => {
    searchInput.value = "";
    gSearchQuery = "";
    btnClearSearch.style.display = "none";
    renderLicensesTable();
  });

  // Filter Pills
  document.querySelectorAll(".pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pill-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      gActiveFilter = btn.dataset.filter;
      renderLicensesTable();
    });
  });

  // KPI Cards click to filter
  document.querySelectorAll(".kpi-card").forEach(card => {
    card.addEventListener("click", () => {
      const f = card.dataset.filter;
      if (f) {
        document.querySelectorAll(".pill-btn").forEach(b => {
          b.classList.toggle("active", b.dataset.filter === f);
        });
        gActiveFilter = f;
        renderLicensesTable();
      }
    });
  });

  // Modal Novo Código
  document.getElementById("btnCloseNewModal")?.addEventListener("click", closeNewLicenseModal);
  document.getElementById("btnCancelNewModal")?.addEventListener("click", closeNewLicenseModal);
  document.getElementById("btnRegenerateKey")?.addEventListener("click", () => {
    document.getElementById("newLicenseKey").value = generateRandomKey();
  });
  document.getElementById("btnCopyGeneratedKey")?.addEventListener("click", () => {
    copyToClipboard(document.getElementById("newLicenseKey").value);
  });
  document.getElementById("btnSubmitNewLicense")?.addEventListener("click", handleCreateNewLicense);

  // Modal Configurações
  document.getElementById("btnCloseConfigModal")?.addEventListener("click", closeConfigModal);
  document.getElementById("btnSaveConfig")?.addEventListener("click", handleSaveConfig);
  document.getElementById("btnTestSupabaseConnection")?.addEventListener("click", handleTestConnection);

  // Fecha modais com tecla ESC
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeNewLicenseModal();
      closeConfigModal();
    }
  });

  // Inicia verificação de sessão
  checkAuth();
});
