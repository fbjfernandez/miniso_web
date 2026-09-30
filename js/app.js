// =============================================
// MINISO SYSTEM — Main JavaScript
// =============================================

// ── Estado global ──
const APP = {
  currentUser: null,
  currentPage: 'login',
};

// ── DB: caché local (se rellena desde el backend, NO son datos fijos) ──
const DB = {
  users:      [],
  clientes:   [],
  productos:  [],
  proveedores:[],
  ventas:     [],
  ordenes:    [],
  entradas:   [],
};

// ── Carga de datos desde Supabase vía backend ──
// forzar=true recarga siempre; forzar=false solo carga si DB está vacío
async function cargarDatosIniciales(forzar = false) {
  if (!forzar && DB.clientes.length > 0) return; // ya cargado, no repetir
  try {
    const [clientes, productos, proveedores, ventas, ordenes] = await Promise.all([
      API.getClientes(),
      API.getProductos(),
      API.getProveedores(),
      API.getVentas(),
      API.getOrdenes(),
    ]);
    DB.clientes    = clientes    || [];
    DB.productos   = productos   || [];
    DB.proveedores = proveedores || [];
    DB.ventas      = ventas      || [];
    DB.ordenes     = ordenes     || [];
  } catch (e) {
    console.error('Error cargando datos iniciales:', e.message);
  }
}

// ── Iconos SVG ──
const ICONS = {
  home:      `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg>`,
  users:     `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/></svg>`,
  cart:      `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
  undo:      `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>`,
  box:       `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`,
  truck:     `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  chart:     `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
  clipboard: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>`,
  settings:  `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path stroke-linecap="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  logout:    `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>`,
  search:    `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  plus:      `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  edit:      `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>`,
  trash:     `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path stroke-linecap="round" d="M10 11v6m4-6v6M9 6V4h6v2"/></svg>`,
  eye:       `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  warehouse: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`,
  alert:     `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
  check:     `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 16 4 11"/></svg>`,
  download:  `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>`,
  filter:    `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  x:         `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  star:      `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
};

// ── NAVEGACIÓN ──
function navigateTo(page) {
  APP.currentPage = page;
  renderApp();
}

function logout() {
  APP.currentUser = null;
  APP.currentPage = 'login';
  renderApp();
}

// ── LAYOUT COMPARTIDO ──
function renderLayout(title, pageContent, activeNav) {
  const u = APP.currentUser;
  const initials = u.nombre.split(' ').map(n => n[0]).join('').slice(0, 2);

  const navByRole = {
    Cajero: [
      { icon: 'home',  label: 'Dashboard',         page: 'dashboard' },
      { section: 'Ventas' },
      { icon: 'cart',  label: 'Registrar Venta',   page: 'registrar-venta' },
      { icon: 'users', label: 'Clientes',           page: 'clientes' },
      { icon: 'undo',  label: 'Devoluciones',       page: 'devoluciones' },
    ],
    Administrador: [
      { icon: 'home',      label: 'Dashboard',           page: 'dashboard' },
      { section: 'Inventario' },
      { icon: 'box',       label: 'Productos',           page: 'productos' },
      { icon: 'truck',     label: 'Proveedores',         page: 'proveedores' },
      { icon: 'clipboard', label: 'Órdenes de Compra',   page: 'ordenes-compra' },
      { section: 'Reportes' },
      { icon: 'chart',     label: 'Reporte de Ventas',   page: 'reporte-ventas' },
      { section: 'Sistema' },
      { icon: 'settings',  label: 'Usuarios',            page: 'usuarios' },
    ],
    Almacenero: [
      { icon: 'home',      label: 'Dashboard',              page: 'dashboard' },
      { section: 'Inventario' },
      { icon: 'warehouse', label: 'Registrar Entrada',      page: 'registrar-entrada' },
      { icon: 'alert',     label: 'Productos Agotados',     page: 'productos-agotados' },
      { icon: 'chart',     label: 'Reporte de Inventario',  page: 'reporte-inventario' },
    ],
  };

  const navItems = navByRole[u.rol] || [];
  const navHTML = navItems.map(item => {
    if (item.section) return `<div class="nav-section-label">${item.section}</div>`;
    return `
      <a class="nav-item ${activeNav === item.page ? 'active' : ''}"
         onclick="navigateTo('${item.page}')">
        ${ICONS[item.icon] || ''} ${item.label}
      </a>`;
  }).join('');

  document.getElementById('app').innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="logo">MINISO</div>
          <div class="tagline">Sistema de Gestión</div>
        </div>
        <div class="sidebar-role-badge">${u.rol}</div>
        <nav class="sidebar-nav">${navHTML}</nav>
        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-avatar">${initials}</div>
            <div>
              <div class="user-name">${u.nombre}</div>
              <div class="user-role">${u.rol}</div>
            </div>
            <button class="btn-logout" onclick="logout()" title="Cerrar sesión">
              ${ICONS.logout}
            </button>
          </div>
        </div>
      </aside>
      <div class="main-content">
        <div class="topbar">
          <div class="topbar-title">${title}</div>
          <div class="topbar-actions">
            <span style="font-size:12px;color:var(--gray-400);">
              ${new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div class="page">${pageContent}</div>
      </div>
    </div>`;
}

// ── TOAST ──
function showToast(msg, type = 'success') {
  const colors = { success: '#16A34A', error: '#DC2626', warning: '#CA8A04', info: '#2563EB' };
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:${colors[type]}; color:white;
    padding:12px 20px; border-radius:8px;
    font-size:13px; font-weight:500;
    box-shadow:0 4px 12px rgba(0,0,0,0.2);
    display:flex; align-items:center; gap:8px;
    animation: slideIn 0.2s ease;
  `;
  const styleTag = document.createElement('style');
  styleTag.textContent = '@keyframes slideIn { from { transform: translateX(40px); opacity:0; } to { transform: translateX(0); opacity:1; } }';
  document.head.appendChild(styleTag);
  toast.innerHTML = `${type === 'success' ? ICONS.check : ICONS.alert} ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── RENDERIZADO PRINCIPAL ──
async function renderApp() {
  if (!APP.currentUser) {
    renderLogin();
    return;
  }

  // Solo carga datos si aún no han sido cargados
  await cargarDatosIniciales(false);

  switch (APP.currentPage) {
    case 'dashboard':          renderDashboard();        break;
    case 'clientes':           renderClientes();         break;
    case 'registrar-venta':    renderRegistrarVenta();   break;
    case 'devoluciones':       renderDevoluciones();     break;
    case 'productos':          renderProductos();        break;
    case 'proveedores':        renderProveedores();      break;
    case 'ordenes-compra':     renderOrdenesCompra();    break;
    case 'reporte-ventas':     renderReporteVentas();    break;
    case 'usuarios':           renderUsuarios();         break;
    case 'registrar-entrada':  renderRegistrarEntrada(); break;
    case 'productos-agotados': renderProductosAgotados();break;
    case 'reporte-inventario': renderReporteInventario();break;
    default:                   renderDashboard();
  }
}

// ── INICIO ──
document.addEventListener('DOMContentLoaded', () => {
  renderApp();
});