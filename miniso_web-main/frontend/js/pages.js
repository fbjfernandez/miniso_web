// =============================================
// MINISO SYSTEM — Page Renderers
// =============================================

function formatearFecha(fechaISO) {
  if (!fechaISO) return '—';
  const soloFecha = fechaISO.split('T')[0];
  const [year, month, day] = soloFecha.split('-');
  return `${day}/${month}/${year}`; 
}
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-page">
      <div class="login-bg-accent"></div>
      <div class="login-card">
        <div class="login-logo">MINISO</div>
        <div class="login-subtitle">Sistema de Gestión de Ventas e Inventario</div>
        <form class="login-form" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label>Usuario</label>
            <input type="text" id="login-user" placeholder="ej. cajero01" autocomplete="username" required>
          </div>
          <div class="form-group">
            <label>Contraseña</label>
            <input type="password" id="login-pass" placeholder="••••••••" autocomplete="current-password" required>
          </div>
          <div id="login-error"></div>
          <button type="submit" class="btn btn-primary btn-login">Ingresar</button>
        </form>
        <div class="divider"></div>
        <div style="font-size:12px; color:var(--gray-400); text-align:center; line-height:1.6;">
          <strong style="color:var(--gray-600);">Cuentas de prueba</strong><br>
          cajero01 · admin01 · almacen01 &nbsp;(clave: 1234)
        </div>
      </div>
    </div>`;
}

async function handleLogin(e) {
  e.preventDefault();
  const username  = document.getElementById('login-user').value.trim();
  const password  = document.getElementById('login-pass').value;
  const errorBox  = document.getElementById('login-error');
  const submitBtn = e.target.querySelector('button[type=submit]');

  submitBtn.disabled    = true;
  submitBtn.textContent = 'Ingresando...';

  try {
    const user = await API.login(username, password);
    APP.currentUser = user;
    APP.currentPage = 'dashboard';
    APP.datosCargados = false;
    guardarSesion();
    renderApp();
    showToast(`Bienvenido, ${user.nombre}`, 'success');
  } catch (err) {
    errorBox.innerHTML    = `<div class="alert alert-error">${ICONS.alert}${esc(err.message)}</div>`;
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Ingresar';
  }
}

// ── DASHBOARD ──
function renderDashboard() {
  const u = APP.currentUser;
  let content = '';

  if (u.rol === 'Cajero') {
    const misVentas = DB.ventas.filter(v => v.cajero === u.username);
    const totalHoy = misVentas.reduce((s, v) => s + (v.estado === 'Completada' ? v.total - v.monto_devuelto : 0), 0);
    content = `
      <div class="page-header">
        <div class="page-title">Hola, ${esc(u.nombre.split(' ')[0])}</div>
        <div class="page-subtitle">Resumen de tu actividad como Cajero</div>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon red">${ICONS.cart}</div>
          <div class="stat-value">${misVentas.length}</div>
          <div class="stat-label">Ventas registradas</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">${ICONS.chart}</div>
          <div class="stat-value">S/ ${totalHoy.toFixed(2)}</div>
          <div class="stat-label">Total vendido</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">${ICONS.users}</div>
          <div class="stat-value">${DB.clientes.length}</div>
          <div class="stat-label">Clientes registrados</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow">${ICONS.undo}</div>
          <div class="stat-value">${misVentas.filter(v => v.estado === 'Devuelta').length}</div>
          <div class="stat-label">Devoluciones</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Accesos rápidos</div></div>
        <div class="card-body" style="display:flex; gap:12px; flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="navigateTo('registrar-venta')">${ICONS.cart} Registrar Venta</button>
          <button class="btn btn-outline" onclick="navigateTo('clientes')">${ICONS.users} Ver Clientes</button>
          <button class="btn btn-outline" onclick="navigateTo('devoluciones')">${ICONS.undo} Devoluciones</button>
        </div>
      </div>`;
  }

  else if (u.rol === 'Administrador') {
    const stockBajo = DB.productos.filter(p => p.stock <= p.stockMin);
    const totalVentas = DB.ventas.reduce((s, v) => s + (v.estado === 'Completada' ? v.total - v.monto_devuelto : 0), 0);
    const ordenesPendientes = DB.ordenes.filter(o => o.estado === 'Pendiente').length;
    content = `
      <div class="page-header">
        <div class="page-title">Panel de Administración</div>
        <div class="page-subtitle">Vista general del negocio</div>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon green">${ICONS.chart}</div>
          <div class="stat-value">S/ ${totalVentas.toFixed(2)}</div>
          <div class="stat-label">Ventas totales</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">${ICONS.box}</div>
          <div class="stat-value">${DB.productos.length}</div>
          <div class="stat-label">Productos activos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow">${ICONS.alert}</div>
          <div class="stat-value">${stockBajo.length}</div>
          <div class="stat-label">Productos con stock bajo</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">${ICONS.clipboard}</div>
          <div class="stat-value">${ordenesPendientes}</div>
          <div class="stat-label">Órdenes pendientes</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Productos con stock bajo</div>
          <button class="btn btn-sm btn-outline" onclick="navigateTo('productos')">Ver todos</button>
        </div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Producto</th><th>Categoría</th><th>Stock</th><th>Stock mínimo</th><th>Estado</th></tr></thead>
            <tbody>
              ${stockBajo.length ? stockBajo.map(p => `
                <tr>
                  <td>${esc(p.nombre)}</td><td>${esc(p.categoria)}</td><td>${p.stock}</td><td>${p.stockMin}</td>
                  <td><span class="badge badge-error">Crítico</span></td>
                </tr>`).join('') : `<tr><td colspan="5" style="text-align:center;color:var(--gray-400);">Sin alertas de stock</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  else if (u.rol === 'Almacenero') {
    const stockBajo = DB.productos.filter(p => p.stock <= p.stockMin);
    content = `
      <div class="page-header">
        <div class="page-title">Hola, ${esc(u.nombre.split(' ')[0])}</div>
        <div class="page-subtitle">Resumen de almacén e inventario</div>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">${ICONS.box}</div>
          <div class="stat-value">${DB.productos.length}</div>
          <div class="stat-label">Productos en catálogo</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow">${ICONS.alert}</div>
          <div class="stat-value">${stockBajo.length}</div>
          <div class="stat-label">Productos agotados / bajos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">${ICONS.warehouse}</div>
          <div class="stat-value">${DB.entradas.length}</div>
          <div class="stat-label">Entradas registradas</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">${ICONS.clipboard}</div>
          <div class="stat-value">${DB.ordenes.filter(o => o.estado === 'Pendiente').length}</div>
          <div class="stat-label">Órdenes por recibir</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Accesos rápidos</div></div>
        <div class="card-body" style="display:flex; gap:12px; flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="navigateTo('registrar-entrada')">${ICONS.warehouse} Registrar Entrada</button>
          <button class="btn btn-outline" onclick="navigateTo('productos-agotados')">${ICONS.alert} Productos Agotados</button>
          <button class="btn btn-outline" onclick="navigateTo('reporte-inventario')">${ICONS.chart} Reporte de Inventario</button>
        </div>
      </div>`;
  }

  renderLayout('Dashboard', content, 'dashboard');
}

// =============================================
// CAJERO — CLIENTES (Registrar Cliente flow)
// =============================================
async function renderClientes() {
  // Forzar recarga desde Supabase
  try {
    DB.clientes = await API.getClientes();
  } catch(e) {
    showToast('Error al cargar clientes: ' + e.message, 'error');
  }
  const rows = DB.clientes.map(c => `
    <tr>
      <td><strong>${esc(c.id)}</strong></td>
      <td>${esc(c.nombre)}</td>
      <td>${esc(c.dni)}</td>
      <td>${esc(c.email)}</td>
      <td>${esc(c.telefono)}</td>
      <td><span class="badge badge-info">${c.puntos} pts</span></td>
      <td>
        <button class="btn btn-sm btn-ghost" onclick="openClienteModal('${c.id}')" title="Editar">${ICONS.edit}</button>
      </td>
    </tr>`).join('');

  const content = `
    <div class="page-header">
      <div class="page-title">Clientes</div>
      <div class="page-subtitle">Gestiona los clientes registrados en el programa de fidelización</div>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Listado de clientes</div>
        <button class="btn btn-primary btn-sm" onclick="openClienteModal()">${ICONS.plus} Registrar Cliente</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Código</th><th>Nombre</th><th>DNI</th><th>Email</th><th>Teléfono</th><th>Puntos</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="7" style="text-align:center;color:var(--gray-400);">No hay clientes registrados</td></tr>`}</tbody>
        </table>
      </div>
    </div>
    <div id="cliente-modal-root"></div>`;

  renderLayout('Clientes', content, 'clientes');
}

function openClienteModal(clienteId) {
  const editing = clienteId ? DB.clientes.find(c => c.id === clienteId) : null;
  const root = document.getElementById('cliente-modal-root');
  root.innerHTML = `
    <div class="modal-overlay open" id="cliente-modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">${editing ? 'Editar Cliente' : 'Registrar Cliente'}</div>
          <button class="modal-close" onclick="closeClienteModal()">${ICONS.x}</button>
        </div>
        <form onsubmit="submitCliente(event, ${editing ? `'${editing.id}'` : 'null'})">
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group span-2">
                <label>Nombre completo</label>
                <input type="text" id="cl-nombre" value="${esc(editing ? editing.nombre : '')}" required>
              </div>
              <div class="form-group">
                <label>DNI</label>
                <input type="text" id="cl-dni" maxlength="8" value="${esc(editing ? editing.dni : '')}" required>
              </div>
              <div class="form-group">
                <label>Teléfono</label>
                <input type="text" id="cl-telefono" value="${esc(editing ? editing.telefono : '')}" required>
              </div>
              <div class="form-group span-2">
                <label>Email</label>
                <input type="email" id="cl-email" value="${esc(editing ? editing.email : '')}" required>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeClienteModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${ICONS.check} ${editing ? 'Guardar cambios' : 'Registrar Cliente'}</button>
          </div>
        </form>
      </div>
    </div>`;
}

function closeClienteModal() {
  document.getElementById('cliente-modal-root').innerHTML = '';
}

async function submitCliente(e, clienteId) {
  e.preventDefault();
  const data = {
    nombre:   document.getElementById('cl-nombre').value.trim(),
    dni:      document.getElementById('cl-dni').value.trim(),
    telefono: document.getElementById('cl-telefono').value.trim(),
    email:    document.getElementById('cl-email').value.trim(),
  };
  try {
    let nuevo = null;
    if (clienteId) {
      await API.updateCliente(clienteId, data);
      showToast('Cliente actualizado correctamente', 'success');
    } else {
      nuevo = await API.createCliente(data);
      showToast('Cliente registrado correctamente', 'success');
    }
    closeClienteModal();
    // Si se registró desde la pantalla de venta: quedarse ahí (sin perder el carrito) y seleccionarlo
    if (nuevo && APP.currentPage === 'registrar-venta') {
      DB.clientes = await API.getClientes();
      ventaClienteSeleccionado = DB.clientes.find(c => c.id === nuevo.id) || nuevo;
      document.getElementById('venta-cliente-box').innerHTML = clienteBoxHTML();
      return;
    }
    await renderClientes(); // recarga desde la BD
  } catch(err) {
    showToast(err.message, 'error');
  }
}

// =============================================
// CAJERO — REGISTRAR VENTA
// =============================================
let ventaCart = [];
let ventaClienteSeleccionado = null;

function renderRegistrarVenta() {
  ventaCart = [];
  ventaClienteSeleccionado = null;

  const content = `
    <div class="page-header">
      <div class="page-title">Registrar Venta</div>
      <div class="page-subtitle">Busca productos, asocia un cliente y completa la venta</div>
    </div>

    <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:18px; align-items:start;">
      <div class="card">
        <div class="card-header"><div class="card-title">Buscar producto</div></div>
        <div class="card-body">
          <div class="form-group" style="margin-bottom:14px;">
            <input type="text" id="venta-buscar-producto" placeholder="Buscar por nombre o código..." oninput="filtrarProductosVenta(this.value)">
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Código</th><th>Producto</th><th>Precio</th><th>Stock</th><th></th></tr></thead>
              <tbody id="venta-productos-tbody">${productoRowsVenta(DB.productos)}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Cliente</div></div>
        <div class="card-body">
          <div id="venta-cliente-box">${clienteBoxHTML()}</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:18px;">
      <div class="card-header"><div class="card-title">Detalle de venta</div></div>
      <div class="card-body">
        <div class="table-wrapper">
          <table class="order-items-table">
            <thead><tr><th>Producto</th><th>Precio Unit.</th><th>Cantidad</th><th>Subtotal</th><th></th></tr></thead>
            <tbody id="venta-cart-tbody">${cartRowsHTML()}</tbody>
          </table>
        </div>
        <div class="form-actions" style="justify-content:space-between; align-items:center; margin-top:18px;">
          <div style="font-size:18px; font-weight:700; color:var(--gray-800);">
            Total: <span style="color:var(--red);">S/ <span id="venta-total">${cartTotal().toFixed(2)}</span></span>
          </div>
          <button class="btn btn-primary btn-lg" onclick="confirmarVenta()">${ICONS.check} Confirmar Venta</button>
        </div>
      </div>
    </div>
    <div id="cliente-modal-root"></div>`;

  renderLayout('Registrar Venta', content, 'registrar-venta');
}

function productoRowsVenta(list) {
  if (!list.length) return `<tr><td colspan="5" style="text-align:center;color:var(--gray-400);">Sin resultados</td></tr>`;
  return list.map(p => `
    <tr>
      <td>${esc(p.id)}</td>
      <td>${esc(p.nombre)}</td>
      <td>S/ ${p.precio.toFixed(2)}</td>
      <td>${p.stock <= p.stockMin ? `<span class="badge badge-warning">${p.stock}</span>` : p.stock}</td>
      <td><button class="btn btn-sm btn-outline" ${p.stock === 0 ? 'disabled' : ''} onclick="addToCart('${p.id}')">${ICONS.plus}</button></td>
    </tr>`).join('');
}

function filtrarProductosVenta(query) {
  const q = query.toLowerCase().trim();
  const filtered = DB.productos.filter(p => p.nombre.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  document.getElementById('venta-productos-tbody').innerHTML = productoRowsVenta(filtered);
}

function clienteBoxHTML() {
  if (!ventaClienteSeleccionado) {
    return `
      <div class="busqueda-wrap" style="position:relative; margin-bottom:14px;">
        <input type="text" id="venta-buscar-cliente" placeholder="Buscar por nombre o DNI..." autocomplete="off" onfocus="mostrarLista('venta-clientes-resultados')" onclick="mostrarLista('venta-clientes-resultados')" oninput="filtrarClientesVenta(this.value)">
        <div id="venta-clientes-resultados" class="lista-busqueda" style="display:none;">${clientesListaHTML('')}</div>
      </div>
      <div class="divider"></div>
      <button class="btn btn-ghost btn-sm" style="width:100%; justify-content:center;" onclick="openClienteModalVenta()">
        ${ICONS.plus} Registrar nuevo cliente
      </button>`;
  }
  const c = ventaClienteSeleccionado;
  return `
    <div class="alert alert-info" style="align-items:flex-start;">
      ${ICONS.users}
      <div>
        <strong>${esc(c.nombre)}</strong><br>
        <span style="font-size:12px;">DNI: ${esc(c.dni)} · ${c.puntos} pts acumulados</span>
      </div>
    </div>
    <button class="btn btn-ghost btn-sm" style="width:100%; justify-content:center; margin-top:8px;" onclick="quitarClienteVenta()">
      ${ICONS.x} Quitar cliente
    </button>`;
}

// Sin texto muestra TODOS los clientes guardados; al escribir filtra por nombre o DNI
function clientesListaHTML(query) {
  const q = (query || '').toLowerCase().trim();
  if (!DB.clientes.length) return `<div class="item-busqueda-vacio">No hay clientes registrados</div>`;
  const matches = DB.clientes
    .filter(c => !q || c.nombre.toLowerCase().includes(q) || String(c.dni).includes(q))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  return matches.length ? matches.map(c => `
    <div class="item-busqueda" onclick="seleccionarClienteVenta('${c.id}')">
      <strong>${esc(c.nombre)}</strong>
      <span>DNI: ${esc(c.dni)}</span>
    </div>`).join('') : `<div class="item-busqueda-vacio">Sin coincidencias</div>`;
}

function filtrarClientesVenta(query) {
  const box = document.getElementById('venta-clientes-resultados');
  if (!box) return;
  box.innerHTML = clientesListaHTML(query);
  mostrarLista('venta-clientes-resultados');
}

function seleccionarClienteVenta(clienteId) {
  ventaClienteSeleccionado = DB.clientes.find(c => c.id === clienteId);
  document.getElementById('venta-cliente-box').innerHTML = clienteBoxHTML();
}

function quitarClienteVenta() {
  ventaClienteSeleccionado = null;
  document.getElementById('venta-cliente-box').innerHTML = clienteBoxHTML();
}

function openClienteModalVenta() {
  openClienteModal();
}

function addToCart(productId) {
  const producto = DB.productos.find(p => p.id === productId);
  if (!producto || producto.stock === 0) return;
  const existing = ventaCart.find(item => item.id === productId);
  if (existing) {
    if (existing.cantidad >= producto.stock) {
      showToast('No hay más stock disponible', 'warning');
      return;
    }
    existing.cantidad++;
  } else {
    ventaCart.push({ id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1, stockMax: producto.stock });
  }
  refreshCart();
}

function changeQty(productId, delta) {
  const item = ventaCart.find(i => i.id === productId);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) {
    ventaCart = ventaCart.filter(i => i.id !== productId);
  } else if (item.cantidad > item.stockMax) {
    item.cantidad = item.stockMax;
    showToast('No hay más stock disponible', 'warning');
  }
  refreshCart();
}

function removeFromCart(productId) {
  ventaCart = ventaCart.filter(i => i.id !== productId);
  refreshCart();
}

function refreshCart() {
  document.getElementById('venta-cart-tbody').innerHTML = cartRowsHTML();
  document.getElementById('venta-total').textContent = cartTotal().toFixed(2);
}

function cartRowsHTML() {
  if (!ventaCart.length) {
    return `<tr><td colspan="5" style="text-align:center;color:var(--gray-400); padding:24px;">Agrega productos a la venta</td></tr>`;
  }
  return ventaCart.map(item => `
    <tr>
      <td>${esc(item.nombre)}</td>
      <td>S/ ${item.precio.toFixed(2)}</td>
      <td>
        <div class="qty-control">
          <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
          <input class="qty-input" type="text" value="${item.cantidad}" readonly>
          <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
        </div>
      </td>
      <td>S/ ${(item.precio * item.cantidad).toFixed(2)}</td>
      <td><button class="btn btn-sm btn-ghost" onclick="removeFromCart('${item.id}')">${ICONS.trash}</button></td>
    </tr>`).join('');
}

function cartTotal() {
  return ventaCart.reduce((s, i) => s + i.precio * i.cantidad, 0);
}

async function confirmarVenta() {
  if (!ventaCart.length) {
    showToast('Agrega al menos un producto a la venta', 'error');
    return;
  }

  if (!ventaClienteSeleccionado) {
    showToast('Error: Debe seleccionar o registrar un cliente antes de procesar la venta', 'error');
    return;
  }

  for (const item of ventaCart) {
    const productoActual = DB.productos.find(p => p.id === item.id);
    if (!productoActual || productoActual.stock < item.cantidad) {
      showToast(`Stock insuficiente para "${item.nombre}". Disponible: ${productoActual ? productoActual.stock : 0}`, 'error');
      return;
    }
  }

  const btn = document.querySelector('button[onclick="confirmarVenta()"]');
  if (btn) btn.disabled = true; // evita doble clic = doble venta
  try {
    // El precio y el cajero los define el servidor
    const venta = await API.createVenta({
      id_cliente: ventaClienteSeleccionado.id,
      items: ventaCart.map(i => ({ id_producto: i.id, cantidad: i.cantidad })),
    });

    invalidarDatos(); // stock y puntos cambiaron: la siguiente pantalla recarga
    showToast(`Comprobante ${venta.comprobante} emitido correctamente. Nota de salida generada.`, 'success');
    navigateTo('dashboard');
  } catch (err) {
    if (btn) btn.disabled = false;
    invalidarDatos(); // por si el stock cambió (otro cajero vendió lo mismo)
    showToast(err.message, 'error');
  }
}

// =============================================
// CAJERO — DEVOLUCIONES
// =============================================
let devDetalle = [];

async function renderDevoluciones() {
  try {
    const [ventasData, clientesData] = await Promise.all([API.getVentas(), API.getClientes()]);
    DB.ventas = ventasData;
    DB.clientes = clientesData;
  } catch (e) {
    showToast('Error al sincronizar datos: ' + e.message, 'error');
  }

  const content = `
    <div class="page-header">
      <div class="page-title">Devoluciones</div>
      <div class="page-subtitle">Busca una venta y registra la devolución total o parcial</div>
    </div>
    <div class="card">
      <div class="card-body">
        <div class="form-group" style="max-width:400px;">
          <label>Buscar Venta</label>
          <input type="text" id="dev-buscar" placeholder="Código o boleta (ej. V001, B001-000001)" oninput="filtrarVentasDevolucion(this.value)">
        </div>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Código</th><th>Boleta</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Estado</th><th></th></tr></thead>
          <tbody id="dev-tbody">${devolucionRows(DB.ventas)}</tbody>
        </table>
      </div>
    </div>
    <div id="dev-modal-root"></div>`;
  renderLayout('Devoluciones', content, 'devoluciones');
}

function devolucionRows(list) {
  if (!list.length) return `<tr><td colspan="7" style="text-align:center;color:var(--gray-400);">Sin resultados</td></tr>`;
  return list.map(v => {
    const nombreCliente = v.nombre_cliente || 'Cliente General';
    const devuelto = v.monto_devuelto > 0
      ? `<div style="font-size:11px;color:var(--gray-400);">Devuelto: S/ ${v.monto_devuelto.toFixed(2)}</div>` : '';
    return `
      <tr>
        <td><strong>${esc(v.id)}</strong></td>
        <td>${esc(v.comprobante || '—')}</td>
        <td>${formatearFecha(v.fecha)}</td>
        <td>${esc(nombreCliente)}</td>
        <td>S/ ${Number(v.total || 0).toFixed(2)}${devuelto}</td>
        <td>${estadoVentaBadge(v.estado)}</td>
        <td>
          ${v.estado === 'Completada'
            ? `<button class="btn btn-sm btn-outline" onclick="abrirModalDevolucion('${v.id}')">${ICONS.undo} Devolver</button>`
            : `<span style="color:var(--gray-300); font-size:12px;">—</span>`}
        </td>
      </tr>`;
  }).join('');
}

function estadoVentaBadge(estado) {
  const map = { Completada: 'badge-success', Devuelta: 'badge-error', Pendiente: 'badge-warning' };
  return `<span class="badge ${map[estado] || 'badge-gray'}">${esc(estado)}</span>`;
}

function filtrarVentasDevolucion(query) {
  const q = query.toLowerCase().trim();
  const filtered = DB.ventas.filter(v =>
    v.id.toLowerCase().includes(q) || (v.comprobante || '').toLowerCase().includes(q));
  document.getElementById('dev-tbody').innerHTML = devolucionRows(filtered);
}

async function abrirModalDevolucion(ventaId) {
  const venta = DB.ventas.find(v => v.id === ventaId);
  if (!venta) return;

  document.getElementById('dev-modal-root').innerHTML = `
    <div class="modal-overlay open" id="dev-modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">Registrar Devolución — ${esc(ventaId)}</div>
          <button class="modal-close" onclick="cerrarModalDevolucion()">${ICONS.x}</button>
        </div>
        <div class="modal-body" id="dev-modal-body">
          <div style="text-align:center; padding:24px; color:var(--gray-400);">Cargando detalle...</div>
        </div>
      </div>
    </div>`;

  try {
    devDetalle = (await API.getDetalleVenta(ventaId)).map(d => ({
      ...d, pendiente: d.cantidad - d.cantidad_devuelta, devolver: d.cantidad - d.cantidad_devuelta,
    }));
  } catch (e) {
    cerrarModalDevolucion();
    showToast('No se pudo cargar el detalle: ' + e.message, 'error');
    return;
  }

  const filas = devDetalle.map(d => `
    <tr>
      <td>${esc(d.nombre)}<div style="font-size:11px;color:var(--gray-400);">Vendido: ${d.cantidad}${d.cantidad_devuelta ? ` · Ya devuelto: ${d.cantidad_devuelta}` : ''}</div></td>
      <td style="text-align:center;">
        ${d.pendiente > 0 ? `
        <div class="qty-control" style="justify-content:center;">
          <button class="qty-btn" onclick="cambiarCantidadDev('${d.id_producto}', -1)">−</button>
          <input class="qty-input" id="dev-qty-${d.id_producto}" type="text" value="${d.devolver}" readonly style="width:40px;">
          <button class="qty-btn" onclick="cambiarCantidadDev('${d.id_producto}', 1)">+</button>
        </div>` : `<span style="color:var(--gray-400);font-size:12px;">Devuelto</span>`}
      </td>
      <td>S/ ${d.precio_unit.toFixed(2)}</td>
    </tr>`).join('');

  document.getElementById('dev-modal-body').innerHTML = `
    <div class="alert alert-info" style="margin-bottom:16px;">
      ${ICONS.users}
      <div>
        <strong>Cliente:</strong> ${esc(venta.nombre_cliente || 'Venta sin cliente')}<br>
        <strong>Fecha de venta:</strong> ${formatearFecha(venta.fecha)} · <strong>Boleta:</strong> ${esc(venta.comprobante || '—')}
      </div>
    </div>
    <div class="table-wrapper" style="margin-bottom:16px;">
      <table>
        <thead><tr><th>Producto</th><th style="text-align:center;">Cant. a devolver</th><th>P. Unit.</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    <div style="background:#fafafa; border-radius:8px; padding:12px 16px; margin-bottom:16px;">
      <div style="font-size:13px; color:#888;">Monto a devolver</div>
      <div style="font-size:22px; font-weight:700; color:var(--red);">S/ <span id="dev-monto">${montoDevolucion().toFixed(2)}</span></div>
    </div>
    <div class="form-group">
      <label>Motivo de la devolución <span style="color:var(--red);">*</span></label>
      <select id="dev-motivo">
        <option value="">Selecciona un motivo...</option>
        <option>Producto defectuoso</option>
        <option>Producto incorrecto</option>
        <option>No cumple expectativas</option>
        <option>Duplicado / compra por error</option>
        <option>Otro</option>
      </select>
    </div>
    <div class="form-group" id="dev-otro-grupo" style="display:none;">
      <label>Especifica el motivo</label>
      <input type="text" id="dev-motivo-otro" placeholder="Describe el motivo...">
    </div>`;

  document.getElementById('dev-motivo').addEventListener('change', function () {
    document.getElementById('dev-otro-grupo').style.display = this.value === 'Otro' ? 'block' : 'none';
  });

  document.querySelector('#dev-modal-overlay .modal').insertAdjacentHTML('beforeend', `
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="cerrarModalDevolucion()">Cancelar</button>
      <button class="btn btn-primary" id="dev-confirmar" onclick="confirmarDevolucion('${ventaId}')">${ICONS.check} Confirmar Devolución</button>
    </div>`);
}

function montoDevolucion() {
  return devDetalle.reduce((s, d) => s + d.devolver * d.precio_unit, 0);
}

function cambiarCantidadDev(productoId, delta) {
  const d = devDetalle.find(x => x.id_producto === productoId);
  if (!d) return;
  d.devolver = Math.max(0, Math.min(d.pendiente, d.devolver + delta));
  document.getElementById('dev-qty-' + productoId).value = d.devolver;
  document.getElementById('dev-monto').textContent = montoDevolucion().toFixed(2);
}

function cerrarModalDevolucion() {
  document.getElementById('dev-modal-root').innerHTML = '';
}

async function confirmarDevolucion(ventaId) {
  const sel = document.getElementById('dev-motivo').value;
  const otro = (document.getElementById('dev-motivo-otro')?.value || '').trim();
  const motivo = sel === 'Otro' ? otro : sel;

  if (!motivo) { showToast('Selecciona un motivo para la devolución', 'error'); return; }
  const items = devDetalle.filter(d => d.devolver > 0).map(d => ({ id_producto: d.id_producto, cantidad: d.devolver }));
  if (!items.length) { showToast('Selecciona al menos una unidad para devolver', 'error'); return; }

  const btn = document.getElementById('dev-confirmar');
  btn.disabled = true;
  try {
    const r = await API.registrarDevolucion(ventaId, { motivo, items });
    cerrarModalDevolucion();
    invalidarDatos();
    showToast(`Devolución ${r.id} registrada. Monto: S/ ${Number(r.monto).toFixed(2)}. El stock fue repuesto.`, 'success');
    await renderDevoluciones();
  } catch (err) {
    btn.disabled = false;
    showToast(err.message, 'error');
  }
}

// =============================================
// ADMINISTRADOR / ALMACENERO — PRODUCTOS (Mantener producto)
// =============================================
async function renderProductos() {
  try {
    [DB.productos, DB.proveedores] = await Promise.all([API.getProductos(), API.getProveedores()]);
  } catch (e) {
    showToast('Error al cargar productos: ' + e.message, 'error');
  }
  const rows = DB.productos.map(p => `
      <tr>
        <td><strong>${esc(p.id)}</strong></td>
        <td>${esc(p.nombre)}</td>
        <td><span class="badge badge-gray">${esc(p.categoria)}</span></td>
        <td>S/ ${p.precio.toFixed(2)}</td>
        <td>${p.stock <= p.stockMin ? `<span class="badge badge-error">${p.stock}</span>` : p.stock}</td>
        <td>${esc(p.proveedorNombre || '—')}</td>
        <td>
          <button class="btn btn-sm btn-ghost" onclick="openProductoModal('${p.id}')" title="Editar">${ICONS.edit}</button>
        </td>
      </tr>`).join('');

  const content = `
    <div class="page-header">
      <div class="page-title">Productos</div>
      <div class="page-subtitle">Catálogo de productos e inventario disponible</div>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Catálogo de productos</div>
        <button class="btn btn-primary btn-sm" onclick="openProductoModal()">${ICONS.plus} Nuevo Producto</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Proveedor</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="7" style="text-align:center;color:var(--gray-400);">No hay productos registrados</td></tr>`}</tbody>
        </table>
      </div>
    </div>
    <div id="producto-modal-root"></div>`;
  renderLayout('Productos', content, 'productos');
}

function openProductoModal(productoId) {
  const editing = productoId ? DB.productos.find(p => p.id === productoId) : null;
  const proveedorOptions = `<option value="">Selecciona un proveedor...</option>` + DB.proveedores.map(p =>
    `<option value="${esc(p.id)}" ${editing && editing.proveedor === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('');

  document.getElementById('producto-modal-root').innerHTML = `
    <div class="modal-overlay open">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">${editing ? 'Editar Producto' : 'Nuevo Producto'}</div>
          <button class="modal-close" onclick="closeProductoModal()">${ICONS.x}</button>
        </div>
        <form onsubmit="submitProducto(event, ${editing ? `'${editing.id}'` : 'null'})">
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group span-2">
                <label>Nombre del producto</label>
                <input type="text" id="pr-nombre" value="${esc(editing ? editing.nombre : '')}" required>
              </div>
              <div class="form-group">
                <label>Categoría</label>
                <input type="text" id="pr-categoria" value="${esc(editing ? editing.categoria : '')}" required>
              </div>
              <div class="form-group">
                <label>Precio de venta (S/)</label>
                <input type="number" step="0.01" min="0" id="pr-precio" value="${editing ? editing.precio : ''}" required>
              </div>
              <div class="form-group">
                <label>Costo de compra (S/)</label>
                <input type="number" step="0.01" min="0" id="pr-costo" value="${editing && editing.costo != null ? editing.costo : ''}" placeholder="Opcional">
              </div>
              <div class="form-group">
                <label>Stock actual</label>
                <input type="number" min="0" step="1" id="pr-stock" value="${editing ? editing.stock : 0}" required>
              </div>
              <div class="form-group">
                <label>Stock mínimo</label>
                <input type="number" min="0" step="1" id="pr-stockmin" value="${editing ? editing.stockMin : 5}" required>
              </div>
              <div class="form-group">
                <label>Proveedor</label>
                <select id="pr-proveedor" required>${proveedorOptions}</select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeProductoModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${ICONS.check} ${editing ? 'Guardar cambios' : 'Crear Producto'}</button>
          </div>
        </form>
      </div>
    </div>`;
}

function closeProductoModal() {
  document.getElementById('producto-modal-root').innerHTML = '';
}

async function submitProducto(e, productoId) {
  e.preventDefault();
  const costo = document.getElementById('pr-costo').value;
  const data = {
    nombre: document.getElementById('pr-nombre').value.trim(),
    categoria: document.getElementById('pr-categoria').value.trim(),
    precio: parseFloat(document.getElementById('pr-precio').value),
    costo: costo === '' ? null : parseFloat(costo),
    stock: parseInt(document.getElementById('pr-stock').value, 10),
    stockMin: parseInt(document.getElementById('pr-stockmin').value, 10),
    proveedor: document.getElementById('pr-proveedor').value || null,
  };
  try {
    if (productoId) {
      await API.updateProducto(productoId, data);
      showToast('Producto actualizado correctamente', 'success');
    } else {
      await API.createProducto(data);
      showToast('Producto registrado correctamente', 'success');
    }
    closeProductoModal();
    invalidarDatos();
    await renderProductos();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =============================================
// ADMINISTRADOR — PROVEEDORES (Mantener proveedor)
// =============================================
async function renderProveedores() {
  try { DB.proveedores = await API.getProveedores(); }
  catch (e) { showToast('Error al cargar proveedores: ' + e.message, 'error'); }

  const esAdmin = APP.currentUser.rol === 'Administrador';
  const rows = DB.proveedores.map(p => `
    <tr>
      <td><strong>${esc(p.id)}</strong></td>
      <td>${esc(p.nombre)}</td>
      <td>${esc(p.ruc)}</td>
      <td>${esc(p.contacto)}</td>
      <td>${esc(p.telefono)}</td>
      <td>${esc(p.email)}</td>
      <td>${esAdmin ? `<button class="btn btn-sm btn-ghost" onclick="openProveedorModal('${p.id}')">${ICONS.edit}</button>` : ''}</td>
    </tr>`).join('');

  const content = `
    <div class="page-header">
      <div class="page-title">Proveedores</div>
      <div class="page-subtitle">Empresas que abastecen el inventario de la tienda</div>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Listado de proveedores</div>
        ${esAdmin ? `<button class="btn btn-primary btn-sm" onclick="openProveedorModal()">${ICONS.plus} Nuevo Proveedor</button>` : ''}
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Código</th><th>Razón Social</th><th>RUC</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="7" style="text-align:center;color:var(--gray-400);">No hay proveedores registrados</td></tr>`}</tbody>
        </table>
      </div>
    </div>
    <div id="proveedor-modal-root"></div>`;
  renderLayout('Proveedores', content, 'proveedores');
}

function openProveedorModal(proveedorId) {
  const editing = proveedorId ? DB.proveedores.find(p => p.id === proveedorId) : null;
  document.getElementById('proveedor-modal-root').innerHTML = `
    <div class="modal-overlay open">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">${editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</div>
          <button class="modal-close" onclick="closeProveedorModal()">${ICONS.x}</button>
        </div>
        <form onsubmit="submitProveedor(event, ${editing ? `'${editing.id}'` : 'null'})">
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group span-2">
                <label>Razón Social</label>
                <input type="text" id="pv-nombre" value="${esc(editing ? editing.nombre : '')}" required>
              </div>
              <div class="form-group">
                <label>RUC</label>
                <input type="text" id="pv-ruc" maxlength="11" pattern="\\d{11}" title="11 dígitos" value="${esc(editing ? editing.ruc : '')}" required>
              </div>
              <div class="form-group">
                <label>Persona de contacto</label>
                <input type="text" id="pv-contacto" value="${esc(editing ? editing.contacto : '')}" required>
              </div>
              <div class="form-group">
                <label>Teléfono</label>
                <input type="text" id="pv-telefono" value="${esc(editing ? editing.telefono : '')}" required>
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" id="pv-email" value="${esc(editing ? editing.email : '')}" required>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeProveedorModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${ICONS.check} ${editing ? 'Guardar cambios' : 'Crear Proveedor'}</button>
          </div>
        </form>
      </div>
    </div>`;
}

function closeProveedorModal() {
  document.getElementById('proveedor-modal-root').innerHTML = '';
}

async function submitProveedor(e, proveedorId) {
  e.preventDefault();
  const data = {
    nombre: document.getElementById('pv-nombre').value.trim(),
    ruc: document.getElementById('pv-ruc').value.trim(),
    contacto: document.getElementById('pv-contacto').value.trim(),
    telefono: document.getElementById('pv-telefono').value.trim(),
    email: document.getElementById('pv-email').value.trim(),
  };
  try {
    if (proveedorId) {
      await API.updateProveedor(proveedorId, data);
      showToast('Proveedor actualizado correctamente', 'success');
    } else {
      await API.createProveedor(data);
      showToast('Proveedor registrado correctamente', 'success');
    }
    closeProveedorModal();
    invalidarDatos();
    await renderProveedores();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =============================================
// ADMINISTRADOR — ÓRDENES DE COMPRA (Generar Orden de Compra)
// =============================================
let ocCart = [];
let ocProveedorSeleccionado = null;

async function renderOrdenesCompra() {
  try {
    [DB.ordenes, DB.proveedores, DB.productos] = await Promise.all([
      API.getOrdenes(), API.getProveedores(), API.getProductos(),
    ]);
  } catch (e) {
    showToast('Error al cargar órdenes: ' + e.message, 'error');
  }

  const rows = DB.ordenes.map(o => `
      <tr>
        <td><strong>${esc(o.id)}</strong></td>
        <td>${formatearFecha(o.fecha)}</td>
        <td>${esc(o.proveedorNombre || '—')}</td>
        <td>S/ ${o.total.toFixed(2)}</td>
        <td>${ordenEstadoBadge(o.estado)}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-sm btn-ghost" onclick="verOrdenCompra('${o.id}')" title="Ver detalle">${ICONS.eye}</button>
          ${o.estado === 'Pendiente' ? `<button class="btn btn-sm btn-ghost" onclick="cancelarOrdenCompra('${o.id}')" title="Cancelar orden">${ICONS.x}</button>` : ''}
        </td>
      </tr>`).join('');

  const content = `
    <div class="page-header">
      <div class="page-title">Órdenes de Compra</div>
      <div class="page-subtitle">Genera pedidos a proveedores y consulta el historial de órdenes</div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" onclick="switchOcTab('historial', this)">Historial</button>
      <button class="tab-btn" onclick="switchOcTab('nueva', this)">Generar Orden de Compra</button>
    </div>

    <div id="oc-tab-content">
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Código</th><th>Fecha</th><th>Proveedor</th><th>Total</th><th>Estado</th><th></th></tr></thead>
            <tbody>${rows || `<tr><td colspan="6" style="text-align:center;color:var(--gray-400);">Sin órdenes registradas</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div id="oc-modal-root"></div>`;
  renderLayout('Órdenes de Compra', content, 'ordenes-compra');
}

function ordenEstadoBadge(estado) {
  const map = { Pendiente: 'badge-warning', Recibida: 'badge-success', Cancelada: 'badge-error' };
  return `<span class="badge ${map[estado] || 'badge-gray'}">${esc(estado)}</span>`;
}

async function verOrdenCompra(id) {
  const orden = DB.ordenes.find(o => o.id === id);
  if (!orden) return;
  try {
    const det = await API.getDetalleOrden(id);
    document.getElementById('oc-modal-root').innerHTML = `
      <div class="modal-overlay open">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">Orden ${esc(id)} — ${esc(orden.proveedorNombre || '')}</div>
            <button class="modal-close" onclick="document.getElementById('oc-modal-root').innerHTML=''">${ICONS.x}</button>
          </div>
          <div class="modal-body">
            <div style="margin-bottom:12px;">${ordenEstadoBadge(orden.estado)} <span style="color:var(--gray-400);font-size:12px;">${formatearFecha(orden.fecha)} · por ${esc(orden.admin || '—')}</span></div>
            <div class="table-wrapper">
              <table>
                <thead><tr><th>Producto</th><th>Cantidad</th><th>Costo Unit.</th><th>Subtotal</th></tr></thead>
                <tbody>${det.map(d => `<tr><td>${esc(d.nombre)}</td><td>${d.cantidad}</td><td>S/ ${d.costo_unit.toFixed(2)}</td><td>S/ ${d.subtotal.toFixed(2)}</td></tr>`).join('')}</tbody>
              </table>
            </div>
            <div style="text-align:right;font-weight:700;margin-top:12px;">Total: S/ ${orden.total.toFixed(2)}</div>
          </div>
        </div>
      </div>`;
  } catch (e) {
    showToast('No se pudo cargar el detalle: ' + e.message, 'error');
  }
}

async function cancelarOrdenCompra(id) {
  if (!confirm(`¿Cancelar la orden ${id}? Esta acción no se puede deshacer.`)) return;
  try {
    await API.updateOrdenEstado(id, 'Cancelada');
    showToast(`Orden ${id} cancelada`, 'success');
    await renderOrdenesCompra();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function switchOcTab(tab, btn) {
  document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const container = document.getElementById('oc-tab-content');

  if (tab === 'historial') {
    renderOrdenesCompra();
    return;
  }

  ocCart = [];
  ocProveedorSeleccionado = null;

  container.innerHTML = `
              <div id="oc-proveedor-resultados" style="max-height:140px; overflow-y:auto;">${proveedoresListaHTML('')}</div>
      <div class="card">
        <div class="card-header"><div class="card-title">Buscar Proveedor</div></div>
        <div class="card-body">
          <div class="busqueda-wrap" style="position:relative; margin-bottom:14px;">
            <input type="text" id="oc-buscar-proveedor" placeholder="Buscar por nombre o RUC..." autocomplete="off" onfocus="mostrarLista('oc-proveedor-resultados')" onclick="mostrarLista('oc-proveedor-resultados')" oninput="filtrarProveedoresOC(this.value)">
            <div id="oc-proveedor-resultados" class="lista-busqueda" style="display:none;">${proveedoresListaHTML('')}</div>
          </div>
          <div id="oc-proveedor-seleccionado">${ocProveedorBoxHTML()}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Buscar Producto</div></div>
        <div class="card-body">
          <div class="form-group" style="margin-bottom:14px;">
            <input type="text" id="oc-buscar-producto" placeholder="Por defecto: productos con stock bajo. Busca por nombre o código..." oninput="filtrarProductosOC(this.value)">
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Producto</th><th>Stock</th><th></th></tr></thead>
              <tbody id="oc-productos-tbody">${productoRowsOC(productosOCOrdenados(''))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:18px;">
      <div class="card-header"><div class="card-title">Detalle de la orden</div></div>
      <div class="card-body">
        <div class="table-wrapper">
          <table class="order-items-table">
            <thead><tr><th>Producto</th><th>Costo Unit. (S/)</th><th>Cantidad</th><th>Subtotal</th><th></th></tr></thead>
            <tbody id="oc-cart-tbody">${ocCartRowsHTML()}</tbody>
          </table>
        </div>
        <div class="form-actions" style="justify-content:space-between; align-items:center; margin-top:18px;">
          <div style="font-size:18px; font-weight:700; color:var(--gray-800);">
            Total: <span style="color:var(--red);">S/ <span id="oc-total">${ocCartTotal().toFixed(2)}</span></span>
          </div>
          <button class="btn btn-primary btn-lg" id="oc-grabar" onclick="grabarOrdenCompra()">${ICONS.check} Grabar Orden de Compra</button>
        </div>
      </div>
    </div>`;
}

function ocProveedorBoxHTML() {
  if (!ocProveedorSeleccionado) return '';
  const p = ocProveedorSeleccionado;
  return `
    <div class="alert alert-info" style="align-items:flex-start; margin-top:10px;">
      ${ICONS.truck}
      <div>
        <strong>${esc(p.nombre)}</strong><br>
        <span style="font-size:12px;">RUC: ${esc(p.ruc)} · ${esc(p.contacto)}</span>
      </div>
    </div>`;
}

// Sin texto muestra TODOS los proveedores guardados; al escribir filtra por nombre o RUC
function proveedoresListaHTML(query) {
  const q = (query || '').toLowerCase().trim();
  if (!DB.proveedores.length) return `<div class="item-busqueda-vacio">No hay proveedores registrados</div>`;
  const matches = DB.proveedores
    .filter(p => !q || p.nombre.toLowerCase().includes(q) || String(p.ruc).includes(q))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  return matches.length ? matches.map(p => `
    <div class="item-busqueda" onclick="seleccionarProveedorOC('${p.id}')">
      <strong>${esc(p.nombre)}</strong>
      <span>RUC: ${esc(p.ruc)}</span>
    </div>`).join('') : `<div class="item-busqueda-vacio">Sin coincidencias</div>`;
}

function filtrarProveedoresOC(query) {
  const box = document.getElementById('oc-proveedor-resultados');
  if (!box) return;
  box.innerHTML = proveedoresListaHTML(query);
  mostrarLista('oc-proveedor-resultados');
}

function seleccionarProveedorOC(proveedorId) {
  ocProveedorSeleccionado = DB.proveedores.find(p => p.id === proveedorId);
  document.getElementById('oc-proveedor-seleccionado').innerHTML = ocProveedorBoxHTML();
  document.getElementById('oc-buscar-proveedor').value = '';
  const lista = document.getElementById('oc-proveedor-resultados');
  lista.innerHTML = proveedoresListaHTML('');
  lista.style.display = 'none';
}

function productoRowsOC(list) {
  if (!list.length) return `<tr><td colspan="3" style="text-align:center;color:var(--gray-400);">Sin resultados</td></tr>`;
  return list.map(p => `
    <tr>
      <td>${esc(p.nombre)} ${p.stock <= p.stockMin ? `<span class="badge badge-error" style="margin-left:6px;">Bajo</span>` : ''}</td>
      <td>${p.stock}</td>
      <td><button class="btn btn-sm btn-outline" onclick="addToOcCart('${p.id}')">${ICONS.plus}</button></td>
    </tr>`).join('');
}

// Sin texto muestra TODOS los productos (los de stock bajo primero); al escribir filtra
function productosOCOrdenados(query) {
  const q = (query || '').toLowerCase().trim();
  return DB.productos
    .filter(p => !q || p.nombre.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
    .sort((a, b) => (b.stock <= b.stockMin) - (a.stock <= a.stockMin) || a.nombre.localeCompare(b.nombre));
}

function filtrarProductosOC(query) {
  document.getElementById('oc-productos-tbody').innerHTML = productoRowsOC(productosOCOrdenados(query));
}

function addToOcCart(productId) {
  const producto = DB.productos.find(p => p.id === productId);
  if (!producto) return;
  const existing = ocCart.find(i => i.id === productId);
  if (existing) {
    existing.cantidad++;
  } else {
    // Costo sugerido: el costo registrado del producto; si no hay, el 50% del precio de venta (editable)
    const sugerido = producto.costo != null ? producto.costo : Math.round(producto.precio * 50) / 100;
    ocCart.push({ id: producto.id, nombre: producto.nombre, costo: sugerido, cantidad: 1 });
  }
  refreshOcCart();
}

function changeOcQty(productId, delta) {
  const item = ocCart.find(i => i.id === productId);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) ocCart = ocCart.filter(i => i.id !== productId);
  refreshOcCart();
}

function changeOcCosto(productId, valor) {
  const item = ocCart.find(i => i.id === productId);
  if (!item) return;
  const v = parseFloat(valor);
  item.costo = Number.isFinite(v) && v >= 0 ? v : 0;
  refreshOcCart(true);
}

function removeFromOcCart(productId) {
  ocCart = ocCart.filter(i => i.id !== productId);
  refreshOcCart();
}

// soloTotales=true evita re-dibujar la tabla mientras se escribe en el campo de costo
function refreshOcCart(soloTotales = false) {
  if (!soloTotales) document.getElementById('oc-cart-tbody').innerHTML = ocCartRowsHTML();
  else ocCart.forEach(i => {
    const c = document.getElementById('oc-sub-' + i.id);
    if (c) c.textContent = 'S/ ' + (i.costo * i.cantidad).toFixed(2);
  });
  document.getElementById('oc-total').textContent = ocCartTotal().toFixed(2);
}

function ocCartRowsHTML() {
  if (!ocCart.length) {
    return `<tr><td colspan="5" style="text-align:center;color:var(--gray-400); padding:24px;">Agrega productos a la orden</td></tr>`;
  }
  return ocCart.map(item => `
    <tr>
      <td>${esc(item.nombre)}</td>
      <td><input type="number" min="0" step="0.01" value="${item.costo}" style="width:90px;" oninput="changeOcCosto('${item.id}', this.value)"></td>
      <td>
        <div class="qty-control">
          <button class="qty-btn" onclick="changeOcQty('${item.id}', -1)">−</button>
          <input class="qty-input" type="text" value="${item.cantidad}" readonly>
          <button class="qty-btn" onclick="changeOcQty('${item.id}', 1)">+</button>
        </div>
      </td>
      <td id="oc-sub-${item.id}">S/ ${(item.costo * item.cantidad).toFixed(2)}</td>
      <td><button class="btn btn-sm btn-ghost" onclick="removeFromOcCart('${item.id}')">${ICONS.trash}</button></td>
    </tr>`).join('');
}

function ocCartTotal() {
  return ocCart.reduce((s, i) => s + i.costo * i.cantidad, 0);
}

async function grabarOrdenCompra() {
  if (!ocProveedorSeleccionado) { showToast('Selecciona un proveedor para la orden', 'error'); return; }
  if (!ocCart.length) { showToast('Agrega al menos un producto a la orden', 'error'); return; }

  const btn = document.getElementById('oc-grabar');
  btn.disabled = true;
  try {
    const orden = await API.createOrden({
      id_proveedor: ocProveedorSeleccionado.id,
      items: ocCart.map(i => ({ id_producto: i.id, cantidad: i.cantidad, costo_unit: i.costo })),
    });
    invalidarDatos();
    showToast(`Orden ${orden.id} registrada correctamente`, 'success');
    await renderOrdenesCompra();
  } catch (err) {
    btn.disabled = false;
    showToast(err.message, 'error');
  }
}

// =============================================
// ADMINISTRADOR — REPORTE DE VENTAS
// =============================================
async function renderReporteVentas() {
  renderLayout('Reporte de Ventas', `<div style="padding:48px;text-align:center;color:var(--gray-400);">Cargando...</div>`, 'reporte-ventas');

  try {
    DB.ventas = await API.getVentas();
  } catch (err) {
    showToast('Error al cargar ventas: ' + err.message, 'error');
    DB.ventas = [];
  }

  // Paso 4-5: Rango de fechas para filtrar (fechaInicio, fechaFin)
  const hoy = new Date().toISOString().slice(0, 10);
  const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const content = `
    <div class="page-header">
      <div class="page-title">Reporte de Ventas</div>
      <div class="page-subtitle">Consulta ventas por rango de fechas y visualiza el gráfico</div>
    </div>

    <div class="card" style="margin-bottom:18px;">
      <div class="card-body" style="display:flex; gap:16px; align-items:flex-end; flex-wrap:wrap;">
        <div class="form-group" style="margin:0; min-width:160px;">
          <label>Fecha inicio</label>
          <input type="date" id="rpt-fecha-ini" value="${hace30}">
        </div>
        <div class="form-group" style="margin:0; min-width:160px;">
          <label>Fecha fin</label>
          <input type="date" id="rpt-fecha-fin" value="${hoy}">
        </div>
        <button class="btn btn-primary" onclick="buscarReporteVentas()">${ICONS.search} Buscar</button>
      </div>
    </div>

    <div id="reporte-resultados">
      ${renderReporteResultados(DB.ventas, hace30, hoy)}
    </div>`;

  renderLayout('Reporte de Ventas', content, 'reporte-ventas');
}

function renderReporteResultados(ventas, fechaIni, fechaFin) {
  if (fechaIni > fechaFin) {
    return '<div class="alert alert-error">' + ICONS.alert + ' La fecha de inicio no puede ser mayor a la fecha fin.</div>';
  }

  // 1. Normalizar la fecha a YYYY-MM-DD para filtrado preciso
  const filtradas = ventas.filter(v => {
    if (!v.fecha) return false;
    const fechaSoloDia = v.fecha.split('T')[0];
    return fechaSoloDia >= fechaIni && fechaSoloDia <= fechaFin;
  });

  const completadas = filtradas.filter(v => v.estado === 'Completada');
  const totalVentas = completadas.reduce((s, v) => s + parseFloat(v.total || 0) - (v.monto_devuelto || 0), 0);
  const totalDevueltas = filtradas.filter(v => v.estado === 'Devuelta').length;

  // Agrupar ventas por fecha (YYYY-MM-DD) para el gráfico
  const ventasPorFecha = {};
  completadas.forEach(v => {
    const fechaDia = v.fecha.split('T')[0];
    ventasPorFecha[fechaDia] = (ventasPorFecha[fechaDia] || 0) + parseFloat(v.total || 0) - (v.monto_devuelto || 0);
  });
  const fechas  = Object.keys(ventasPorFecha).sort();
  const totales = fechas.map(f => ventasPorFecha[f]);
  const maxVal  = Math.max(...totales, 1);
  const barW    = fechas.length === 1 ? 80 : Math.max(20, Math.min(60, Math.floor(600 / fechas.length)));

  // 2. Mapeo de filas con formato limpio (CAMBIO PRINCIPAL)
  const rows = filtradas.map(v => {
    // A) Obtención y formateo de la fecha (DD/MM/YYYY)
    const fechaSoloDia = v.fecha ? v.fecha.split('T')[0] : '';
    const [year, month, day] = fechaSoloDia ? fechaSoloDia.split('-') : ['--', '--', '----'];
    const fechaFormateada = fechaSoloDia ? `${day}/${month}/${year}` : '—';

    // B) Obtención robusta del nombre del cliente
    const nombreCliente = v.nombre_cliente || 'Cliente General';

    return '<tr>'
      + '<td><strong>' + esc(v.id) + '</strong></td>'
      + '<td>' + fechaFormateada + '</td>'
      + '<td>' + esc(nombreCliente) + '</td>'
      + '<td>' + esc(v.cajero || '—') + '</td>'
      + '<td>S/ ' + parseFloat(v.total || 0).toFixed(2) + '</td>'
      + '<td>' + estadoVentaBadge(v.estado) + '</td>'
      + '</tr>';
  }).join('');

  // Barras del gráfico
  const barras = fechas.map(function(f, i) {
    const altura = Math.max(4, Math.round((totales[i] / maxVal) * 140));
    const [y, m, d] = f.split('-');
    const fechaBarra = `${d}/${m}`;
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:' + barW + 'px;flex-shrink:0;">'
      + '<div style="font-size:10px;color:var(--gray-500);font-weight:500;">S/' + totales[i].toFixed(0) + '</div>'
      + '<div style="width:100%;background:var(--red);border-radius:4px 4px 0 0;height:' + altura + 'px;" title="S/ ' + totales[i].toFixed(2) + '"></div>'
      + '<div style="font-size:9px;color:var(--gray-400);transform:rotate(-35deg);white-space:nowrap;">' + fechaBarra + '</div>'
      + '</div>';
  }).join('');

  const grafico = fechas.length > 0
    ? '<div class="card" style="margin-bottom:18px;">'
      + '<div class="card-header"><div class="card-title">' + ICONS.chart + ' Gráfico de ventas por día</div></div>'
      + '<div class="card-body" style="overflow-x:auto;">'
      + '<div style="display:flex;align-items:flex-end;gap:6px;height:100px;padding:0 8px;min-width:max-content;">'
      + barras
      + '</div></div></div>'
    : '';

  return '<div class="stats-grid" style="margin-bottom:18px;">'
    + '<div class="stat-card"><div class="stat-icon green">' + ICONS.chart + '</div>'
    + '<div class="stat-value">S/ ' + totalVentas.toFixed(2) + '</div>'
    + '<div class="stat-label">Total vendido en el período</div></div>'
    + '<div class="stat-card"><div class="stat-icon blue">' + ICONS.cart + '</div>'
    + '<div class="stat-value">' + completadas.length + '</div>'
    + '<div class="stat-label">Ventas completadas</div></div>'
    + '<div class="stat-card"><div class="stat-icon yellow">' + ICONS.undo + '</div>'
    + '<div class="stat-value">' + totalDevueltas + '</div>'
    + '<div class="stat-label">Devoluciones</div></div>'
    + '</div>'
    + grafico
    + '<div class="card">'
    + '<div class="card-header">'
    + '<div class="card-title">Detalle de ventas (' + filtradas.length + ' registros)</div>'
    + '<button class="btn btn-sm btn-outline" onclick="exportarReporteCSV()">' + ICONS.download + ' Exportar CSV</button>'
    + '</div>'
    + '<div class="table-wrapper"><table>'
    + '<thead><tr><th>Código</th><th>Fecha</th><th>Cliente</th><th>Cajero</th><th>Total</th><th>Estado</th></tr></thead>'
    + '<tbody>' + (rows || '<tr><td colspan="6" style="text-align:center;color:var(--gray-400);">Sin ventas en este período</td></tr>') + '</tbody>'
    + '</table></div></div>';
}

// Escapa una celda CSV (comillas, ; y saltos) y neutraliza fórmulas de Excel (=, +, -, @)
function csvCelda(v) {
  let t = String(v ?? '');
  if (/^[=+\-@]/.test(t)) t = "'" + t;
  return /[";\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}

function descargarCSV(nombre, filas) {
  const csv = '\uFEFF' + filas.map(f => f.map(csvCelda).join(';')).join('\n'); // ; y BOM para Excel en español
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}

function exportarReporteCSV() {
  const fechaIni = document.getElementById('rpt-fecha-ini')?.value || '';
  const fechaFin = document.getElementById('rpt-fecha-fin')?.value || '';
  const filtradas = DB.ventas.filter(v => v.fecha && (!fechaIni || v.fecha >= fechaIni) && (!fechaFin || v.fecha <= fechaFin));

  if (!filtradas.length) {
    showToast('No hay ventas para exportar en este período', 'error');
    return;
  }
  descargarCSV(`reporte_ventas_${fechaIni || 'todos'}_${fechaFin}.csv`, [
    ['Codigo', 'Boleta', 'Fecha', 'Cliente', 'Cajero', 'Total', 'Devuelto', 'Estado'],
    ...filtradas.map(v => [
      v.id, v.comprobante || '', v.fecha, v.nombre_cliente || 'Sin cliente', v.cajero || 'N/A',
      parseFloat(v.total || 0).toFixed(2), (v.monto_devuelto || 0).toFixed(2), v.estado,
    ]),
  ]);
  showToast('Reporte exportado como CSV', 'success');
}

async function buscarReporteVentas() {
  const fechaIni = document.getElementById('rpt-fecha-ini').value;
  const fechaFin = document.getElementById('rpt-fecha-fin').value;
  document.getElementById('reporte-resultados').innerHTML = renderReporteResultados(DB.ventas, fechaIni, fechaFin);
}

// =============================================
// ADMINISTRADOR — USUARIOS (Mantener usuario)
// =============================================
async function renderUsuarios() {
  renderLayout('Usuarios', `<div style="padding:48px;text-align:center;color:var(--gray-400);">Cargando usuarios...</div>`, 'usuarios');

  try {
    DB.users = await API.getUsuarios();
  } catch (err) {
    showToast('Error al cargar usuarios: ' + err.message, 'error');
    DB.users = [];
  }

  const rows = DB.users.map(u => `
    <tr>
      <td><strong>${esc(u.username)}</strong></td>
      <td>${esc(u.nombre)} ${esc(u.apellido_paterno || '')} ${esc(u.apellido_materno || '')}</td>
      <td><span class="badge badge-info">${esc(u.rol)}</span></td>
      <td>${!u.activo ? '<span class="badge badge-gray">Inactivo</span>'
          : u.bloqueado ? '<span class="badge badge-error">Bloqueado</span>'
          : '<span class="badge badge-success">Activo</span>'}</td>
      <td><button class="btn btn-sm btn-ghost" onclick="openUsuarioModal(${u.id})">${ICONS.edit}</button></td>
    </tr>`).join('');

  const content = `
    <div class="page-header">
      <div class="page-title">Usuarios</div>
      <div class="page-subtitle">Administra las cuentas de acceso al sistema</div>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Cuentas registradas</div>
        <button class="btn btn-primary btn-sm" onclick="openUsuarioModal()">${ICONS.plus} Nuevo Usuario</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Usuario</th><th>Nombre Completo</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:var(--gray-400);">No hay usuarios registrados</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    <div id="usuario-modal-root"></div>`;

  renderLayout('Usuarios', content, 'usuarios');
}

function openUsuarioModal(userId) {
  const editing = userId ? DB.users.find(u => u.id === userId) : null;
  const esYo = editing && String(editing.id) === String(APP.currentUser.id);
  document.getElementById('usuario-modal-root').innerHTML = `
    <div class="modal-overlay open">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">${editing ? 'Editar Usuario' : 'Nuevo Usuario'}</div>
          <button class="modal-close" onclick="closeUsuarioModal()">${ICONS.x}</button>
        </div>
        <form onsubmit="submitUsuario(event, ${editing ? editing.id : 'null'})">
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group span-2">
                <label>Nombre</label>
                <input type="text" id="us-nombre" value="${esc(editing ? editing.nombre : '')}" required>
              </div>
              <div class="form-group">
                <label>Apellido Paterno</label>
                <input type="text" id="us-apellido-paterno" value="${esc(editing ? (editing.apellido_paterno || '') : '')}" required>
              </div>
              <div class="form-group">
                <label>Apellido Materno</label>
                <input type="text" id="us-apellido-materno" value="${esc(editing ? (editing.apellido_materno || '') : '')}">
              </div>
              <div class="form-group">
                <label>Usuario</label>
                <input type="text" id="us-username" value="${esc(editing ? editing.username : '')}" required>
              </div>
              <div class="form-group">
                <label>Contraseña ${editing ? '(dejar vacía para mantener)' : ''}</label>
                <input type="password" id="us-password" ${editing ? '' : 'required'}>
              </div>
              <div class="form-group span-2">
                <label>Rol</label>
                <select id="us-rol" required>
                  ${['Cajero', 'Administrador', 'Almacenero'].map(r => `<option value="${r}" ${editing && editing.rol === r ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
              </div>
              ${editing ? `
              <div class="form-group">
                <label><input type="checkbox" id="us-activo" ${editing.activo ? 'checked' : ''} ${esYo ? 'disabled' : ''}> Cuenta activa</label>
              </div>
              <div class="form-group">
                <label><input type="checkbox" id="us-bloqueado" ${editing.bloqueado ? 'checked' : ''} ${esYo ? 'disabled' : ''}> Cuenta bloqueada (desmarcar = desbloquear)</label>
              </div>` : ''}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeUsuarioModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${ICONS.check} ${editing ? 'Guardar cambios' : 'Crear Usuario'}</button>
          </div>
        </form>
      </div>
    </div>`;
}

function closeUsuarioModal() {
  document.getElementById('usuario-modal-root').innerHTML = '';
}

async function submitUsuario(e, userId) {
  e.preventDefault();
  const username = document.getElementById('us-username').value.trim();
  const password = document.getElementById('us-password').value;

  const data = {
    nombre: document.getElementById('us-nombre').value.trim(),
    apellido_paterno: document.getElementById('us-apellido-paterno').value.trim(),
    apellido_materno: document.getElementById('us-apellido-materno').value.trim(),
    username,
    rol: document.getElementById('us-rol').value
  };

  if (password) {
    data.password = password;
  }
  if (userId) {
    const act = document.getElementById('us-activo');
    const blq = document.getElementById('us-bloqueado');
    if (act && !act.disabled) data.activo = act.checked;
    if (blq && !blq.disabled) data.bloqueado = blq.checked;
  }

  try {
    if (userId) {
      await API.updateUsuario(userId, data);
      showToast('Usuario actualizado correctamente', 'success');
    } else {
      await API.createUsuario(data);
      showToast('Usuario creado correctamente', 'success');
    }
    closeUsuarioModal();
    await renderUsuarios();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =============================================
// ALMACENERO — REGISTRAR ENTRADA
// =============================================
let entradaCart = [];
let entradaOrdenSeleccionada = null;

async function renderRegistrarEntrada() {
  entradaCart = [];
  entradaOrdenSeleccionada = null;
  try {
    [DB.ordenes, DB.proveedores, DB.productos, DB.entradas] = await Promise.all([
      API.getOrdenes(), API.getProveedores(), API.getProductos(), API.getEntradas(),
    ]);
  } catch (e) {
    showToast('Error al cargar órdenes: ' + e.message, 'error');
  }
  const ordenesPendientes = DB.ordenes.filter(o => o.estado === 'Pendiente');

  const historial = DB.entradas.map(en => `
    <tr>
      <td><strong>${esc(en.id)}</strong></td>
      <td>${formatearFecha(en.fecha)}</td>
      <td>${esc(en.orden)}</td>
      <td>${esc(en.proveedorNombre || '—')}</td>
      <td>${en.productos}</td>
      <td>${esc(en.almacenero || '—')}</td>
    </tr>`).join('');

  const content = `
    <div class="page-header">
      <div class="page-title">Registrar Entrada</div>
      <div class="page-subtitle">Recibe productos de una orden de compra y actualiza el inventario</div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Seleccionar Orden de Compra pendiente</div></div>
      <div class="card-body">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Código</th><th>Fecha</th><th>Proveedor</th><th>Total</th><th></th></tr></thead>
            <tbody id="entrada-ordenes-tbody">${entradaOrdenRows(ordenesPendientes)}</tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="entrada-detalle-root"></div>

    <div class="card" style="margin-top:18px;">
      <div class="card-header"><div class="card-title">Entradas registradas</div></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Código</th><th>Fecha</th><th>Orden</th><th>Proveedor</th><th>Productos</th><th>Registrado por</th></tr></thead>
          <tbody>${historial || `<tr><td colspan="6" style="text-align:center;color:var(--gray-400);">Aún no hay entradas</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
  renderLayout('Registrar Entrada', content, 'registrar-entrada');
}

function entradaOrdenRows(list) {
  if (!list.length) return `<tr><td colspan="5" style="text-align:center;color:var(--gray-400);">No hay órdenes pendientes por recibir</td></tr>`;
  return list.map(o => `
      <tr>
        <td><strong>${esc(o.id)}</strong></td>
        <td>${formatearFecha(o.fecha)}</td>
        <td>${esc(o.proveedorNombre || '—')}</td>
        <td>S/ ${o.total.toFixed(2)}</td>
        <td><button class="btn btn-sm btn-outline" onclick="seleccionarOrdenEntrada('${o.id}')">${ICONS.box} Recibir</button></td>
      </tr>`).join('');
}

// Los productos a recibir salen del detalle REAL de la orden de compra
async function seleccionarOrdenEntrada(ordenId) {
  entradaOrdenSeleccionada = DB.ordenes.find(o => o.id === ordenId);
  try {
    const det = await API.getDetalleOrden(ordenId);
    entradaCart = det.map(d => ({ id: d.id_producto, nombre: d.nombre, pedida: d.cantidad, cantidad: d.cantidad }));
  } catch (e) {
    showToast('No se pudo cargar el detalle de la orden: ' + e.message, 'error');
    return;
  }

  document.getElementById('entrada-detalle-root').innerHTML = `
    <div class="card" style="margin-top:18px;">
      <div class="card-header">
        <div class="card-title">Detalle de entrada — Orden ${esc(entradaOrdenSeleccionada.id)}</div>
      </div>
      <div class="card-body">
        <p style="color:var(--gray-400);font-size:13px;margin-bottom:12px;">Ajusta la cantidad realmente recibida de cada producto. Quita los que no llegaron.</p>
        <div class="table-wrapper">
          <table class="order-items-table">
            <thead><tr><th>Producto</th><th>Pedido</th><th>Cantidad recibida</th><th></th></tr></thead>
            <tbody id="entrada-cart-tbody">${entradaCartRowsHTML()}</tbody>
          </table>
        </div>
        <div class="form-actions" style="justify-content:flex-end; margin-top:18px;">
          <button class="btn btn-primary btn-lg" id="entrada-confirmar" onclick="confirmarEntrada()">${ICONS.check} Confirmar Entrada</button>
        </div>
      </div>
    </div>`;
  document.getElementById('entrada-detalle-root').scrollIntoView({ behavior: 'smooth' });
}

function changeEntradaQty(productId, delta) {
  const item = entradaCart.find(i => i.id === productId);
  if (!item) return;
  item.cantidad = Math.max(1, Math.min(item.pedida, item.cantidad + delta));
  document.getElementById('entrada-cart-tbody').innerHTML = entradaCartRowsHTML();
}

function removeFromEntradaCart(productId) {
  entradaCart = entradaCart.filter(i => i.id !== productId);
  document.getElementById('entrada-cart-tbody').innerHTML = entradaCartRowsHTML();
}

function entradaCartRowsHTML() {
  if (!entradaCart.length) {
    return `<tr><td colspan="4" style="text-align:center;color:var(--gray-400); padding:24px;">No hay productos por recibir</td></tr>`;
  }
  return entradaCart.map(item => `
    <tr>
      <td>${esc(item.nombre)}</td>
      <td>${item.pedida}</td>
      <td>
        <div class="qty-control">
          <button class="qty-btn" onclick="changeEntradaQty('${item.id}', -1)">−</button>
          <input class="qty-input" type="text" value="${item.cantidad}" readonly>
          <button class="qty-btn" onclick="changeEntradaQty('${item.id}', 1)">+</button>
        </div>
      </td>
      <td><button class="btn btn-sm btn-ghost" onclick="removeFromEntradaCart('${item.id}')">${ICONS.trash}</button></td>
    </tr>`).join('');
}

async function confirmarEntrada() {
  if (!entradaCart.length) { showToast('Agrega al menos un producto recibido', 'error'); return; }
  const btn = document.getElementById('entrada-confirmar');
  btn.disabled = true;
  try {
    await API.createEntrada({
      id_orden: entradaOrdenSeleccionada.id,
      items: entradaCart.map(i => ({ id_producto: i.id, cantidad: i.cantidad })),
    });
    invalidarDatos();
    showToast(`Entrada registrada para la orden ${entradaOrdenSeleccionada.id}. Stock actualizado.`, 'success');
    await renderRegistrarEntrada();
  } catch (err) {
    btn.disabled = false;
    showToast(err.message, 'error');
  }
}

// =============================================
// ALMACENERO — PRODUCTOS AGOTADOS
// =============================================
function renderProductosAgotados() {
  const agotados = DB.productos.filter(p => p.stock <= p.stockMin);
  const rows = agotados.map(p => {
    return `
      <tr>
        <td><strong>${esc(p.id)}</strong></td>
        <td>${esc(p.nombre)}</td>
        <td>${esc(p.categoria)}</td>
        <td><span class="badge ${p.stock === 0 ? 'badge-error' : 'badge-warning'}">${p.stock}</span></td>
        <td>${p.stockMin}</td>
        <td>${esc(p.proveedorNombre || '—')}</td>
      </tr>`;
  }).join('');

  const content = `
    <div class="page-header">
      <div class="page-title">Productos Agotados</div>
      <div class="page-subtitle">Productos que han llegado o están por debajo del stock mínimo</div>
    </div>
    ${agotados.length ? `
      <div class="alert alert-warning">${ICONS.alert} Hay ${agotados.length} producto(s) que requieren reposición.</div>
    ` : ''}
    <div class="card">
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Stock actual</th><th>Stock mínimo</th><th>Proveedor</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="6" style="text-align:center;color:var(--gray-400);">No hay productos agotados 🎉</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
  renderLayout('Productos Agotados', content, 'productos-agotados');
}

// =============================================
// ALMACENERO — REPORTE DE INVENTARIO
// =============================================
function renderReporteInventario() {
  const valorTotal = DB.productos.reduce((s, p) => s + p.precio * p.stock, 0);
  const rows = DB.productos.map(p => `
    <tr>
      <td><strong>${esc(p.id)}</strong></td>
      <td>${esc(p.nombre)}</td>
      <td>${esc(p.categoria)}</td>
      <td>${p.stock}</td>
      <td>S/ ${p.precio.toFixed(2)}</td>
      <td>S/ ${(p.precio * p.stock).toFixed(2)}</td>
    </tr>`).join('');

  const content = `
    <div class="page-header">
      <div class="page-title">Reporte de Inventario</div>
      <div class="page-subtitle">Valorización y estado actual del inventario</div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon green">${ICONS.chart}</div>
        <div class="stat-value">S/ ${valorTotal.toFixed(2)}</div>
        <div class="stat-label">Valor total del inventario</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">${ICONS.box}</div>
        <div class="stat-value">${DB.productos.length}</div>
        <div class="stat-label">Productos en catálogo</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon yellow">${ICONS.alert}</div>
        <div class="stat-value">${DB.productos.filter(p => p.stock <= p.stockMin).length}</div>
        <div class="stat-label">Con stock bajo</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Valorización por producto</div>
        <button class="btn btn-sm btn-outline" onclick="exportarInventarioCSV()">${ICONS.download} Exportar CSV</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Stock</th><th>Precio Unit.</th><th>Valor Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  renderLayout('Reporte de Inventario', content, 'reporte-inventario');
}

function exportarInventarioCSV() {
  if (!DB.productos.length) { showToast('No hay productos para exportar', 'error'); return; }
  descargarCSV('reporte_inventario.csv', [
    ['Codigo', 'Producto', 'Categoria', 'Stock', 'Stock minimo', 'Precio', 'Valor total'],
    ...DB.productos.map(p => [p.id, p.nombre, p.categoria, p.stock, p.stockMin, p.precio.toFixed(2), (p.precio * p.stock).toFixed(2)]),
  ]);
  showToast('Inventario exportado como CSV', 'success');
}

// ── Listas desplegables de búsqueda (clientes y proveedores) ──
(function () {
  const st = document.createElement('style');
  st.textContent = `
    .lista-busqueda { position:absolute; top:100%; left:0; right:0; z-index:50; margin-top:4px; max-height:240px;
      overflow-y:auto; background:var(--white); border:1px solid var(--gray-200); border-radius:8px;
      box-shadow:0 8px 24px rgba(0,0,0,.12); }
    .item-busqueda { padding:10px 14px; cursor:pointer; border-bottom:1px solid var(--gray-100); }
    .item-busqueda:last-child { border-bottom:none; }
    .item-busqueda:hover { background:var(--gray-50); }
    .item-busqueda strong { display:block; font-weight:600; color:var(--gray-800); font-size:14px; }
    .item-busqueda span { display:block; font-size:12px; color:var(--gray-600); margin-top:2px; }
    .item-busqueda-vacio { padding:12px 14px; color:var(--gray-400); font-size:13px; }`;
  document.head.appendChild(st);
})();

// Muestra la lista indicada (y oculta las demás)
function mostrarLista(id) {
  document.querySelectorAll('.lista-busqueda').forEach(l => { l.style.display = (l.id === id) ? 'block' : 'none'; });
}

// Al hacer clic fuera de la barra de búsqueda, la lista se cierra
document.addEventListener('click', (e) => {
  if (!e.target.closest || !e.target.closest('.busqueda-wrap')) {
    document.querySelectorAll('.lista-busqueda').forEach(l => { l.style.display = 'none'; });
  }
});