// =============================================
// MINISO SYSTEM — Page Renderers
// =============================================

// ── LOGIN ──
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
  const password  = document.getElementById('login-pass').value.trim();
  const errorBox  = document.getElementById('login-error');
  const submitBtn = e.target.querySelector('button[type=submit]');

  submitBtn.disabled    = true;
  submitBtn.textContent = 'Ingresando...';

  try {
    const user = await API.login(username, password);
    APP.currentUser = user;
    APP.currentPage = 'dashboard';
    renderApp();
    showToast(`Bienvenido, ${user.nombre}`, 'success');
  } catch (err) {
    errorBox.innerHTML    = `<div class="alert alert-error">${ICONS.alert}${err.message}</div>`;
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
    const totalHoy = misVentas.reduce((s, v) => s + (v.estado === 'Completada' ? v.total : 0), 0);
    content = `
      <div class="page-header">
        <div class="page-title">Hola, ${u.nombre.split(' ')[0]}</div>
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
    const totalVentas = DB.ventas.reduce((s, v) => s + (v.estado === 'Completada' ? v.total : 0), 0);
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
                  <td>${p.nombre}</td><td>${p.categoria}</td><td>${p.stock}</td><td>${p.stockMin}</td>
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
        <div class="page-title">Hola, ${u.nombre.split(' ')[0]}</div>
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
      <td><strong>${c.id}</strong></td>
      <td>${c.nombre}</td>
      <td>${c.dni}</td>
      <td>${c.email}</td>
      <td>${c.telefono}</td>
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
                <input type="text" id="cl-nombre" value="${editing ? editing.nombre : ''}" required>
              </div>
              <div class="form-group">
                <label>DNI</label>
                <input type="text" id="cl-dni" maxlength="8" value="${editing ? editing.dni : ''}" required>
              </div>
              <div class="form-group">
                <label>Teléfono</label>
                <input type="text" id="cl-telefono" value="${editing ? editing.telefono : ''}" required>
              </div>
              <div class="form-group span-2">
                <label>Email</label>
                <input type="email" id="cl-email" value="${editing ? editing.email : ''}" required>
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
    if (clienteId) {
      // Pasos 7-12 diagrama: valida, verifica existencia, graba en BD
      await API.updateCliente(clienteId, data);
      showToast('Cliente actualizado correctamente', 'success');
    } else {
      await API.createCliente(data);
      showToast('Cliente registrado correctamente', 'success');
    }
    closeClienteModal();
    await renderClientes(); // recarga desde Supabase
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
    </div>`;

  renderLayout('Registrar Venta', content, 'registrar-venta');
}

function productoRowsVenta(list) {
  if (!list.length) return `<tr><td colspan="5" style="text-align:center;color:var(--gray-400);">Sin resultados</td></tr>`;
  return list.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${p.nombre}</td>
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
      <div class="form-group">
        <input type="text" id="venta-buscar-cliente" placeholder="Buscar por nombre o DNI..." oninput="filtrarClientesVenta(this.value)">
      </div>
      <div id="venta-clientes-resultados" style="max-height:160px; overflow-y:auto;"></div>
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
        <strong>${c.nombre}</strong><br>
        <span style="font-size:12px;">DNI: ${c.dni} · ${c.puntos} pts acumulados</span>
      </div>
    </div>
    <button class="btn btn-ghost btn-sm" style="width:100%; justify-content:center; margin-top:8px;" onclick="quitarClienteVenta()">
      ${ICONS.x} Quitar cliente
    </button>`;
}

function filtrarClientesVenta(query) {
  const q = query.toLowerCase().trim();
  const box = document.getElementById('venta-clientes-resultados');
  if (!q) { box.innerHTML = ''; return; }
  const matches = DB.clientes.filter(c => c.nombre.toLowerCase().includes(q) || c.dni.includes(q));
  box.innerHTML = matches.length ? matches.map(c => `
    <div class="nav-item" style="border-radius:6px; margin-bottom:4px;" onclick="seleccionarClienteVenta('${c.id}')">
      <strong style="font-weight:500;">${c.nombre}</strong>&nbsp;<span style="color:var(--gray-400);font-size:12px;">${c.dni}</span>
    </div>`).join('') : `<div style="padding:8px; color:var(--gray-400); font-size:13px;">Sin coincidencias</div>`;
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
  // Tras registrar, el modal estándar refresca la tabla de clientes;
  // aquí solo habilitamos que el cajero pueda buscarlo de inmediato.
  const original = submitCliente;
  showToast('Registra al cliente y luego búscalo arriba', 'info');
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
      <td>${item.nombre}</td>
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

  // Paso 10: Verificar existencia de stock contra BD antes de grabar
  for (const item of ventaCart) {
    const productoActual = DB.productos.find(p => p.id === item.id);
    if (!productoActual || productoActual.stock < item.cantidad) {
      showToast(`Stock insuficiente para "${item.nombre}". Disponible: ${productoActual ? productoActual.stock : 0}`, 'error');
      return;
    }
  }

  try {
    // Pasos 11-13: Generar nro, grabar venta y detalle (lo hace el Service en el backend)
    const venta = await API.createVenta({
      id_cliente:      ventaClienteSeleccionado ? ventaClienteSeleccionado.id : null,
      username_cajero: APP.currentUser.username,
      items: ventaCart.map(i => ({
        id_producto: i.id,
        cantidad:    i.cantidad,
        precio_unit: i.precio,
      })),
    });
    // Paso 14: Mostrar mensaje de éxito
    showToast(`Venta ${venta.id} registrada correctamente`, 'success');
    navigateTo('dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =============================================
// CAJERO — DEVOLUCIONES
// =============================================
async function renderDevoluciones() {
  try { DB.ventas = await API.getVentas(); } catch(e) {}

  const content = `
    <div class="page-header">
      <div class="page-title">Devoluciones</div>
      <div class="page-subtitle">Busca una venta y registra la devolución correspondiente</div>
    </div>
    <div class="card">
      <div class="card-body">
        <div class="form-group" style="max-width:400px;">
          <label>Buscar Venta</label>
          <input type="text" id="dev-buscar" placeholder="Código de venta (ej. V001)" oninput="filtrarVentasDevolucion(this.value)">
        </div>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Código</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Estado</th><th></th></tr></thead>
          <tbody id="dev-tbody">${devolucionRows(DB.ventas)}</tbody>
        </table>
      </div>
    </div>
    <div id="dev-modal-root"></div>`;
  renderLayout('Devoluciones', content, 'devoluciones');
}

function devolucionRows(list) {
  if (!list.length) return `<tr><td colspan="6" style="text-align:center;color:var(--gray-400);">Sin resultados</td></tr>`;
  return list.map(v => {
    const cliente = DB.clientes.find(c => c.id === (v.cliente || v.id_cliente));
    return `
      <tr>
        <td><strong>${v.id}</strong></td>
        <td>${v.fecha}</td>
        <td>${cliente ? cliente.nombre : '—'}</td>
        <td>S/ ${parseFloat(v.total || 0).toFixed(2)}</td>
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
  return `<span class="badge ${map[estado] || 'badge-gray'}">${estado}</span>`;
}

function filtrarVentasDevolucion(query) {
  const q = query.toLowerCase().trim();
  const filtered = DB.ventas.filter(v => v.id.toLowerCase().includes(q));
  document.getElementById('dev-tbody').innerHTML = devolucionRows(filtered);
}

// Abre modal con detalle real desde Supabase
async function abrirModalDevolucion(ventaId) {
  const venta = DB.ventas.find(v => v.id === ventaId);
  if (!venta) return;

  // Buscar cliente correctamente (Supabase usa id_cliente, mock usa cliente)
  const idCliente = venta.id_cliente || venta.cliente;
  const cliente   = DB.clientes.find(c => c.id === idCliente);
  const total     = parseFloat(venta.total || 0);

  // Mostrar modal con estado de carga primero
  document.getElementById('dev-modal-root').innerHTML = `
    <div class="modal-overlay open" id="dev-modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">Registrar Devolución — ${ventaId}</div>
          <button class="modal-close" onclick="cerrarModalDevolucion()">${ICONS.x}</button>
        </div>
        <div class="modal-body" id="dev-modal-body">
          <div style="text-align:center; padding:24px; color:var(--gray-400);">Cargando detalle...</div>
        </div>
      </div>
    </div>`;

  // Cargar detalle de la venta desde el backend
  let detalleRows = '';
  let detalleItems = [];
  try {
    const detalle = await API.getDetalleVenta(ventaId);
    detalleItems = detalle || [];
    detalleRows = detalleItems.map(d => {
      const prod = DB.productos.find(p => p.id === d.id_producto);
      const nombre = prod ? prod.nombre : d.id_producto;
      return `<tr>
        <td>${nombre}</td>
        <td style="text-align:center;">
          <div class="qty-control" style="justify-content:center;">
            <button class="qty-btn" onclick="cambiarCantidadDev('${d.id_producto}', -1, ${d.cantidad})">−</button>
            <input class="qty-input" id="dev-qty-${d.id_producto}" type="text" value="${d.cantidad}" readonly style="width:40px;">
            <button class="qty-btn" onclick="cambiarCantidadDev('${d.id_producto}', 1, ${d.cantidad})">+</button>
          </div>
        </td>
        <td>S/ ${parseFloat(d.subtotal||0).toFixed(2)}</td>
      </tr>`;
    }).join('');
  } catch(e) {
    detalleRows = `<tr><td colspan="3" style="color:var(--gray-400);">Venta total: S/ ${total.toFixed(2)}</td></tr>`;
  }

  document.getElementById('dev-modal-body').innerHTML = `
    <div class="alert alert-info" style="margin-bottom:16px;">
      ${ICONS.users}
      <div>
        <strong>Cliente:</strong> ${cliente ? cliente.nombre : 'Venta sin cliente'}<br>
        <strong>Fecha de venta:</strong> ${venta.fecha}
      </div>
    </div>
    <div class="table-wrapper" style="margin-bottom:16px;">
      <table>
        <thead><tr><th>Producto</th><th style="text-align:center;">Cant. a devolver</th><th>Subtotal</th></tr></thead>
        <tbody>${detalleRows}</tbody>
      </table>
    </div>
    <div style="background:#fafafa; border-radius:8px; padding:12px 16px; margin-bottom:16px;">
      <div style="font-size:13px; color:#888;">Monto a devolver</div>
      <div style="font-size:22px; font-weight:700; color:var(--red);">S/ ${total.toFixed(2)}</div>
    </div>
    <div class="form-group">
      <label>Motivo de la devolución <span style="color:var(--red);">*</span></label>
      <select id="dev-motivo" required>
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

  document.getElementById('dev-motivo').addEventListener('change', function() {
    document.getElementById('dev-otro-grupo').style.display = this.value === 'Otro' ? 'block' : 'none';
  });

  // Agregar footer con botones
  document.querySelector('#dev-modal-overlay .modal').insertAdjacentHTML('beforeend', `
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="cerrarModalDevolucion()">Cancelar</button>
      <button class="btn btn-primary" onclick="confirmarDevolucion('${ventaId}', ${total})">${ICONS.check} Confirmar Devolución</button>
    </div>`);
}

function cambiarCantidadDev(productoId, delta, maxCantidad) {
  const input = document.getElementById('dev-qty-' + productoId);
  if (!input) return;
  let val = parseInt(input.value) + delta;
  val = Math.max(1, Math.min(maxCantidad, val));
  input.value = val;
}

function cerrarModalDevolucion() {
  document.getElementById('dev-modal-root').innerHTML = '';
}

async function confirmarDevolucion(ventaId, total) {
  const motivoSelect = document.getElementById('dev-motivo').value;
  const motivoOtro   = document.getElementById('dev-motivo-otro')?.value || '';
  const motivo = motivoSelect === 'Otro' ? motivoOtro : motivoSelect;

  if (!motivo) {
    showToast('Selecciona un motivo para la devolución', 'error');
    return;
  }

  try {
    // Paso 10: venta ya validada al abrir el modal
    // Paso 11: monto calculado = total de la venta
    // Paso 12: Grabar devolución en BD
    await API.registrarDevolucion(ventaId);
    cerrarModalDevolucion();
    // Paso 13: Mostrar mensaje de éxito con monto
    showToast(`Devolución de ${ventaId} registrada. Motivo: ${motivo}. Monto: S/ ${parseFloat(total).toFixed(2)}`, 'success');
    await renderDevoluciones();
  } catch(err) {
    showToast(err.message, 'error');
  }
}

async function registrarDevolucion(ventaId) {
  abrirModalDevolucion(ventaId);
}

// =============================================
// ADMINISTRADOR — PRODUCTOS (Mantener producto)
// =============================================
function renderProductos() {
  const rows = DB.productos.map(p => {
    const proveedor = DB.proveedores.find(pr => pr.id === p.proveedor);
    return `
      <tr>
        <td><strong>${p.id}</strong></td>
        <td>${p.nombre}</td>
        <td><span class="badge badge-gray">${p.categoria}</span></td>
        <td>S/ ${p.precio.toFixed(2)}</td>
        <td>${p.stock <= p.stockMin ? `<span class="badge badge-error">${p.stock}</span>` : p.stock}</td>
        <td>${proveedor ? proveedor.nombre : '—'}</td>
        <td>
          <button class="btn btn-sm btn-ghost" onclick="openProductoModal('${p.id}')" title="Editar">${ICONS.edit}</button>
        </td>
      </tr>`;
  }).join('');

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
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    <div id="producto-modal-root"></div>`;
  renderLayout('Productos', content, 'productos');
}

function openProductoModal(productoId) {
  const editing = productoId ? DB.productos.find(p => p.id === productoId) : null;
  const proveedorOptions = DB.proveedores.map(p => `<option value="${p.id}" ${editing && editing.proveedor === p.id ? 'selected' : ''}>${p.nombre}</option>`).join('');

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
                <input type="text" id="pr-nombre" value="${editing ? editing.nombre : ''}" required>
              </div>
              <div class="form-group">
                <label>Categoría</label>
                <input type="text" id="pr-categoria" value="${editing ? editing.categoria : ''}" required>
              </div>
              <div class="form-group">
                <label>Precio (S/)</label>
                <input type="number" step="0.10" min="0" id="pr-precio" value="${editing ? editing.precio : ''}" required>
              </div>
              <div class="form-group">
                <label>Stock actual</label>
                <input type="number" min="0" id="pr-stock" value="${editing ? editing.stock : 0}" required>
              </div>
              <div class="form-group">
                <label>Stock mínimo</label>
                <input type="number" min="0" id="pr-stockmin" value="${editing ? editing.stockMin : 5}" required>
              </div>
              <div class="form-group span-2">
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

function submitProducto(e, productoId) {
  e.preventDefault();
  const data = {
    nombre: document.getElementById('pr-nombre').value.trim(),
    categoria: document.getElementById('pr-categoria').value.trim(),
    precio: parseFloat(document.getElementById('pr-precio').value),
    stock: parseInt(document.getElementById('pr-stock').value, 10),
    stockMin: parseInt(document.getElementById('pr-stockmin').value, 10),
    proveedor: document.getElementById('pr-proveedor').value,
  };

  if (productoId) {
    Object.assign(DB.productos.find(p => p.id === productoId), data);
    showToast('Producto actualizado correctamente', 'success');
  } else {
    const nextNum = DB.productos.length + 1;
    DB.productos.push({ id: 'P' + String(nextNum).padStart(3, '0'), ...data });
    showToast('Producto registrado correctamente', 'success');
  }
  closeProductoModal();
  renderProductos();
}

// =============================================
// ADMINISTRADOR — PROVEEDORES (Mantener proveedor)
// =============================================
function renderProveedores() {
  const rows = DB.proveedores.map(p => `
    <tr>
      <td><strong>${p.id}</strong></td>
      <td>${p.nombre}</td>
      <td>${p.ruc}</td>
      <td>${p.contacto}</td>
      <td>${p.telefono}</td>
      <td>${p.email}</td>
      <td><button class="btn btn-sm btn-ghost" onclick="openProveedorModal('${p.id}')">${ICONS.edit}</button></td>
    </tr>`).join('');

  const content = `
    <div class="page-header">
      <div class="page-title">Proveedores</div>
      <div class="page-subtitle">Empresas que abastecen el inventario de la tienda</div>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Listado de proveedores</div>
        <button class="btn btn-primary btn-sm" onclick="openProveedorModal()">${ICONS.plus} Nuevo Proveedor</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Código</th><th>Razón Social</th><th>RUC</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
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
                <input type="text" id="pv-nombre" value="${editing ? editing.nombre : ''}" required>
              </div>
              <div class="form-group">
                <label>RUC</label>
                <input type="text" id="pv-ruc" maxlength="11" value="${editing ? editing.ruc : ''}" required>
              </div>
              <div class="form-group">
                <label>Persona de contacto</label>
                <input type="text" id="pv-contacto" value="${editing ? editing.contacto : ''}" required>
              </div>
              <div class="form-group">
                <label>Teléfono</label>
                <input type="text" id="pv-telefono" value="${editing ? editing.telefono : ''}" required>
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" id="pv-email" value="${editing ? editing.email : ''}" required>
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

function submitProveedor(e, proveedorId) {
  e.preventDefault();
  const ruc = document.getElementById('pv-ruc').value.trim();
  const duplicado = DB.proveedores.find(p => p.ruc === ruc && p.id !== proveedorId);
  if (duplicado) {
    showToast(`Ya existe un proveedor con RUC ${ruc}`, 'error');
    return;
  }
  const data = {
    nombre: document.getElementById('pv-nombre').value.trim(),
    ruc,
    contacto: document.getElementById('pv-contacto').value.trim(),
    telefono: document.getElementById('pv-telefono').value.trim(),
    email: document.getElementById('pv-email').value.trim(),
  };
  if (proveedorId) {
    Object.assign(DB.proveedores.find(p => p.id === proveedorId), data);
    showToast('Proveedor actualizado correctamente', 'success');
  } else {
    const nextNum = DB.proveedores.length + 1;
    DB.proveedores.push({ id: 'PR' + String(nextNum).padStart(3, '0'), ...data });
    showToast('Proveedor registrado correctamente', 'success');
  }
  closeProveedorModal();
  renderProveedores();
}

// =============================================
// ADMINISTRADOR — ÓRDENES DE COMPRA (Generar Orden de Compra)
// =============================================
let ocCart = [];
let ocProveedorSeleccionado = null;

function renderOrdenesCompra() {
  const rows = DB.ordenes.map(o => {
    const prov = DB.proveedores.find(p => p.id === o.proveedor);
    return `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${o.fecha}</td>
        <td>${prov ? prov.nombre : '—'}</td>
        <td>S/ ${o.total.toFixed(2)}</td>
        <td>${ordenEstadoBadge(o.estado)}</td>
      </tr>`;
  }).join('');

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
            <thead><tr><th>Código</th><th>Fecha</th><th>Proveedor</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="5" style="text-align:center;color:var(--gray-400);">Sin órdenes registradas</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  renderLayout('Órdenes de Compra', content, 'ordenes-compra');
}

function ordenEstadoBadge(estado) {
  const map = { Pendiente: 'badge-warning', Recibida: 'badge-success', Cancelada: 'badge-error' };
  return `<span class="badge ${map[estado] || 'badge-gray'}">${estado}</span>`;
}

function switchOcTab(tab, btn) {
  document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const container = document.getElementById('oc-tab-content');

  if (tab === 'historial') {
    renderOrdenesCompra();
    return;
  }

  // Reset estado de la orden nueva
  ocCart = [];
  ocProveedorSeleccionado = null;

  container.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:18px; align-items:start;">
      <div class="card">
        <div class="card-header"><div class="card-title">Buscar Proveedor</div></div>
        <div class="card-body">
          <div class="form-group" style="margin-bottom:14px;">
            <input type="text" id="oc-buscar-proveedor" placeholder="Buscar por nombre o RUC..." oninput="filtrarProveedoresOC(this.value)">
          </div>
          <div id="oc-proveedor-resultados" style="max-height:140px; overflow-y:auto;"></div>
          <div id="oc-proveedor-seleccionado">${ocProveedorBoxHTML()}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Buscar Producto</div></div>
        <div class="card-body">
          <div class="form-group" style="margin-bottom:14px;">
            <input type="text" id="oc-buscar-producto" placeholder="Buscar producto agotado o por código..." oninput="filtrarProductosOC(this.value)">
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Producto</th><th>Stock</th><th></th></tr></thead>
              <tbody id="oc-productos-tbody">${productoRowsOC(DB.productos.filter(p => p.stock <= p.stockMin))}</tbody>
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
            <thead><tr><th>Producto</th><th>Costo Unit.</th><th>Cantidad</th><th>Subtotal</th><th></th></tr></thead>
            <tbody id="oc-cart-tbody">${ocCartRowsHTML()}</tbody>
          </table>
        </div>
        <div class="form-actions" style="justify-content:space-between; align-items:center; margin-top:18px;">
          <div style="font-size:18px; font-weight:700; color:var(--gray-800);">
            Total: <span style="color:var(--red);">S/ <span id="oc-total">${ocCartTotal().toFixed(2)}</span></span>
          </div>
          <button class="btn btn-primary btn-lg" onclick="grabarOrdenCompra()">${ICONS.check} Grabar Orden de Compra</button>
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
        <strong>${p.nombre}</strong><br>
        <span style="font-size:12px;">RUC: ${p.ruc} · ${p.contacto}</span>
      </div>
    </div>`;
}

function filtrarProveedoresOC(query) {
  const q = query.toLowerCase().trim();
  const box = document.getElementById('oc-proveedor-resultados');
  if (!q) { box.innerHTML = ''; return; }
  const matches = DB.proveedores.filter(p => p.nombre.toLowerCase().includes(q) || p.ruc.includes(q));
  box.innerHTML = matches.length ? matches.map(p => `
    <div class="nav-item" style="border-radius:6px; margin-bottom:4px;" onclick="seleccionarProveedorOC('${p.id}')">
      <strong style="font-weight:500;">${p.nombre}</strong>&nbsp;<span style="color:var(--gray-400);font-size:12px;">${p.ruc}</span>
    </div>`).join('') : `<div style="padding:8px; color:var(--gray-400); font-size:13px;">Sin coincidencias</div>`;
}

function seleccionarProveedorOC(proveedorId) {
  ocProveedorSeleccionado = DB.proveedores.find(p => p.id === proveedorId);
  document.getElementById('oc-proveedor-seleccionado').innerHTML = ocProveedorBoxHTML();
  document.getElementById('oc-proveedor-resultados').innerHTML = '';
  document.getElementById('oc-buscar-proveedor').value = '';
}

function productoRowsOC(list) {
  if (!list.length) return `<tr><td colspan="3" style="text-align:center;color:var(--gray-400);">Sin resultados</td></tr>`;
  return list.map(p => `
    <tr>
      <td>${p.nombre} ${p.stock <= p.stockMin ? `<span class="badge badge-error" style="margin-left:6px;">Bajo</span>` : ''}</td>
      <td>${p.stock}</td>
      <td><button class="btn btn-sm btn-outline" onclick="addToOcCart('${p.id}')">${ICONS.plus}</button></td>
    </tr>`).join('');
}

function filtrarProductosOC(query) {
  const q = query.toLowerCase().trim();
  const filtered = DB.productos.filter(p => p.nombre.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  document.getElementById('oc-productos-tbody').innerHTML = productoRowsOC(q ? filtered : DB.productos.filter(p => p.stock <= p.stockMin));
}

function addToOcCart(productId) {
  const producto = DB.productos.find(p => p.id === productId);
  if (!producto) return;
  const existing = ocCart.find(i => i.id === productId);
  if (existing) {
    existing.cantidad++;
  } else {
    ocCart.push({ id: producto.id, nombre: producto.nombre, costo: producto.precio * 0.5, cantidad: 1 });
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

function removeFromOcCart(productId) {
  ocCart = ocCart.filter(i => i.id !== productId);
  refreshOcCart();
}

function refreshOcCart() {
  document.getElementById('oc-cart-tbody').innerHTML = ocCartRowsHTML();
  document.getElementById('oc-total').textContent = ocCartTotal().toFixed(2);
}

function ocCartRowsHTML() {
  if (!ocCart.length) {
    return `<tr><td colspan="5" style="text-align:center;color:var(--gray-400); padding:24px;">Agrega productos a la orden</td></tr>`;
  }
  return ocCart.map(item => `
    <tr>
      <td>${item.nombre}</td>
      <td>S/ ${item.costo.toFixed(2)}</td>
      <td>
        <div class="qty-control">
          <button class="qty-btn" onclick="changeOcQty('${item.id}', -1)">−</button>
          <input class="qty-input" type="text" value="${item.cantidad}" readonly>
          <button class="qty-btn" onclick="changeOcQty('${item.id}', 1)">+</button>
        </div>
      </td>
      <td>S/ ${(item.costo * item.cantidad).toFixed(2)}</td>
      <td><button class="btn btn-sm btn-ghost" onclick="removeFromOcCart('${item.id}')">${ICONS.trash}</button></td>
    </tr>`).join('');
}

function ocCartTotal() {
  return ocCart.reduce((s, i) => s + i.costo * i.cantidad, 0);
}

function grabarOrdenCompra() {
  if (!ocProveedorSeleccionado) {
    showToast('Selecciona un proveedor para la orden', 'error');
    return;
  }
  if (!ocCart.length) {
    showToast('Agrega al menos un producto a la orden', 'error');
    return;
  }
  const nextNum = DB.ordenes.length + 1;
  const nuevaOrden = {
    id: 'OC' + String(nextNum).padStart(3, '0'),
    fecha: new Date().toISOString().slice(0, 10),
    proveedor: ocProveedorSeleccionado.id,
    admin: APP.currentUser.username,
    total: ocCartTotal(),
    estado: 'Pendiente',
  };
  DB.ordenes.push(nuevaOrden);
  showToast(`Orden ${nuevaOrden.id} registrada correctamente`, 'success');
  navigateTo('ordenes-compra');
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

  const filtradas   = ventas.filter(v => v.fecha >= fechaIni && v.fecha <= fechaFin);
  const completadas = filtradas.filter(v => v.estado === 'Completada');
  const totalVentas = completadas.reduce((s, v) => s + parseFloat(v.total || 0), 0);
  const totalDevueltas = filtradas.filter(v => v.estado === 'Devuelta').length;

  // Agrupar ventas por fecha para el gráfico
  const ventasPorFecha = {};
  completadas.forEach(v => {
    ventasPorFecha[v.fecha] = (ventasPorFecha[v.fecha] || 0) + parseFloat(v.total || 0);
  });
  const fechas  = Object.keys(ventasPorFecha).sort();
  const totales = fechas.map(f => ventasPorFecha[f]);
  const maxVal  = Math.max(...totales, 1);
  const barW    = fechas.length === 1 ? 80 : Math.max(20, Math.min(60, Math.floor(600 / fechas.length)));

  // Filas de la tabla
  const rows = filtradas.map(v => {
    // Supabase devuelve id_cliente; mock usa cliente
    const idCliente = v.id_cliente || v.cliente;
    const cliente = DB.clientes.find(c => c.id === idCliente);
    return '<tr>'
      + '<td><strong>' + v.id + '</strong></td>'
      + '<td>' + v.fecha + '</td>'
      + '<td>' + (cliente ? cliente.nombre : (v.cliente || '—')) + '</td>'
      + '<td>' + (v.cajero || v.username_cajero || '—') + '</td>'
      + '<td>S/ ' + parseFloat(v.total || 0).toFixed(2) + '</td>'
      + '<td>' + estadoVentaBadge(v.estado) + '</td>'
      + '</tr>';
  }).join('');

  // Barras del gráfico
  const barras = fechas.map(function(f, i) {
    const altura = Math.max(4, Math.round((totales[i] / maxVal) * 140));
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:' + barW + 'px;flex-shrink:0;">'
      + '<div style="font-size:10px;color:var(--gray-500);font-weight:500;">S/' + totales[i].toFixed(0) + '</div>'
      + '<div style="width:100%;background:var(--red);border-radius:4px 4px 0 0;height:' + altura + 'px;" title="S/ ' + totales[i].toFixed(2) + '"></div>'
      + '<div style="font-size:9px;color:var(--gray-400);transform:rotate(-35deg);white-space:nowrap;">' + f.slice(5) + '</div>'
      + '</div>';
  }).join('');

  const grafico = fechas.length > 0
    ? '<div class="card" style="margin-bottom:18px;">'
      + '<div class="card-header"><div class="card-title">' + ICONS.chart + ' Gráfico de ventas por día</div></div>'
      + '<div class="card-body" style="overflow-x:auto;">'
      + '<div style="display:flex;align-items:flex-end;gap:6px;height:100px;padding:0 8px;width:20%;max-width:700px;">'
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

function exportarReporteCSV() {
  const fechaIni = document.getElementById('rpt-fecha-ini')?.value || '';
  const fechaFin = document.getElementById('rpt-fecha-fin')?.value || '';
  const filtradas = DB.ventas.filter(v => !fechaIni || (v.fecha >= fechaIni && v.fecha <= fechaFin));

  if (!filtradas.length) {
    showToast('No hay ventas para exportar en este período', 'error');
    return;
  }

  const header = 'Codigo,Fecha,Cliente,Cajero,Total,Estado';
  const filas = filtradas.map(v => {
    const cliente = DB.clientes.find(c => c.id === (v.cliente || v.id_cliente));
    return [
      v.id,
      v.fecha,
      (cliente ? cliente.nombre : (v.id_cliente || v.cliente ? 'ID:' + (v.id_cliente || v.cliente) : 'Sin cliente')),
      v.cajero || v.username_cajero || 'N/A',
      parseFloat(v.total || 0).toFixed(2),
      v.estado
    ].join(',');
  });

  // Usar punto y coma: Excel en español lo separa en columnas automáticamente
  const sep = ';';
  const headerSep = header.replace(/,/g, sep);
  const filasSep  = filas.map(f => f.replace(/,/g, sep));
  const csv = '\uFEFF' + [headerSep, ...filasSep].join('\n'); // BOM para Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'reporte_ventas_' + (fechaIni || 'todos') + '_' + (fechaFin || '') + '.csv';
  a.click();
  URL.revokeObjectURL(url);
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
function renderUsuarios() {
  const rows = DB.users.map(u => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td>${u.nombre}</td>
      <td><span class="badge badge-info">${u.rol}</span></td>
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
          <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    <div id="usuario-modal-root"></div>`;
  renderLayout('Usuarios', content, 'usuarios');
}

function openUsuarioModal(userId) {
  const editing = userId ? DB.users.find(u => u.id === userId) : null;
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
                <label>Nombre completo</label>
                <input type="text" id="us-nombre" value="${editing ? editing.nombre : ''}" required>
              </div>
              <div class="form-group">
                <label>Usuario</label>
                <input type="text" id="us-username" value="${editing ? editing.username : ''}" required>
              </div>
              <div class="form-group">
                <label>Contraseña</label>
                <input type="text" id="us-password" value="${editing ? editing.password : ''}" required>
              </div>
              <div class="form-group span-2">
                <label>Rol</label>
                <select id="us-rol" required>
                  ${['Cajero', 'Administrador', 'Almacenero'].map(r => `<option value="${r}" ${editing && editing.rol === r ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
              </div>
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

function submitUsuario(e, userId) {
  e.preventDefault();
  const username = document.getElementById('us-username').value.trim();
  const duplicado = DB.users.find(u => u.username === username && u.id !== userId);
  if (duplicado) {
    showToast(`El usuario "${username}" ya existe`, 'error');
    return;
  }
  const data = {
    nombre: document.getElementById('us-nombre').value.trim(),
    username,
    password: document.getElementById('us-password').value.trim(),
    rol: document.getElementById('us-rol').value,
  };
  if (userId) {
    Object.assign(DB.users.find(u => u.id === userId), data);
    showToast('Usuario actualizado correctamente', 'success');
  } else {
    const nextId = Math.max(...DB.users.map(u => u.id)) + 1;
    DB.users.push({ id: nextId, ...data });
    showToast('Usuario creado correctamente', 'success');
  }
  closeUsuarioModal();
  renderUsuarios();
}

// =============================================
// ALMACENERO — REGISTRAR ENTRADA
// =============================================
let entradaCart = [];
let entradaOrdenSeleccionada = null;

function renderRegistrarEntrada() {
  entradaCart = [];
  entradaOrdenSeleccionada = null;
  const ordenesPendientes = DB.ordenes.filter(o => o.estado === 'Pendiente');

  const content = `
    <div class="page-header">
      <div class="page-title">Registrar Entrada</div>
      <div class="page-subtitle">Recibe productos de una orden de compra y actualiza el inventario</div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Seleccionar Orden de Compra</div></div>
      <div class="card-body">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Código</th><th>Fecha</th><th>Proveedor</th><th>Total</th><th></th></tr></thead>
            <tbody id="entrada-ordenes-tbody">${entradaOrdenRows(ordenesPendientes)}</tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="entrada-detalle-root"></div>`;
  renderLayout('Registrar Entrada', content, 'registrar-entrada');
}

function entradaOrdenRows(list) {
  if (!list.length) return `<tr><td colspan="5" style="text-align:center;color:var(--gray-400);">No hay órdenes pendientes por recibir</td></tr>`;
  return list.map(o => {
    const prov = DB.proveedores.find(p => p.id === o.proveedor);
    return `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${o.fecha}</td>
        <td>${prov ? prov.nombre : '—'}</td>
        <td>S/ ${o.total.toFixed(2)}</td>
        <td><button class="btn btn-sm btn-outline" onclick="seleccionarOrdenEntrada('${o.id}')">${ICONS.box} Recibir</button></td>
      </tr>`;
  }).join('');
}

function seleccionarOrdenEntrada(ordenId) {
  entradaOrdenSeleccionada = DB.ordenes.find(o => o.id === ordenId);
  entradaCart = DB.productos
    .filter(p => p.proveedor === entradaOrdenSeleccionada.proveedor)
    .slice(0, 3)
    .map(p => ({ id: p.id, nombre: p.nombre, cantidad: 1 }));

  document.getElementById('entrada-detalle-root').innerHTML = `
    <div class="card" style="margin-top:18px;">
      <div class="card-header">
        <div class="card-title">Detalle de entrada — Orden ${entradaOrdenSeleccionada.id}</div>
      </div>
      <div class="card-body">
        <div class="form-group" style="max-width:400px; margin-bottom:14px;">
          <label>Buscar producto para agregar</label>
          <input type="text" id="entrada-buscar-producto" placeholder="Buscar por nombre o código..." oninput="filtrarProductosEntrada(this.value)">
        </div>
        <div id="entrada-productos-resultados" style="margin-bottom:14px;"></div>
        <div class="table-wrapper">
          <table class="order-items-table">
            <thead><tr><th>Producto</th><th>Cantidad recibida</th><th></th></tr></thead>
            <tbody id="entrada-cart-tbody">${entradaCartRowsHTML()}</tbody>
          </table>
        </div>
        <div class="form-actions" style="justify-content:flex-end; margin-top:18px;">
          <button class="btn btn-primary btn-lg" onclick="confirmarEntrada()">${ICONS.check} Confirmar Entrada</button>
        </div>
      </div>
    </div>`;
}

function filtrarProductosEntrada(query) {
  const q = query.toLowerCase().trim();
  const box = document.getElementById('entrada-productos-resultados');
  if (!q) { box.innerHTML = ''; return; }
  const matches = DB.productos.filter(p => p.nombre.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  box.innerHTML = matches.length ? matches.map(p => `
    <div class="nav-item" style="border-radius:6px; margin-bottom:4px;" onclick="addToEntradaCart('${p.id}')">
      <strong style="font-weight:500;">${p.nombre}</strong>&nbsp;<span style="color:var(--gray-400);font-size:12px;">${p.id}</span>
    </div>`).join('') : `<div style="padding:8px; color:var(--gray-400); font-size:13px;">Sin coincidencias</div>`;
}

function addToEntradaCart(productId) {
  const producto = DB.productos.find(p => p.id === productId);
  if (!producto) return;
  const existing = entradaCart.find(i => i.id === productId);
  if (existing) existing.cantidad++;
  else entradaCart.push({ id: producto.id, nombre: producto.nombre, cantidad: 1 });
  document.getElementById('entrada-cart-tbody').innerHTML = entradaCartRowsHTML();
}

function changeEntradaQty(productId, delta) {
  const item = entradaCart.find(i => i.id === productId);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) entradaCart = entradaCart.filter(i => i.id !== productId);
  document.getElementById('entrada-cart-tbody').innerHTML = entradaCartRowsHTML();
}

function removeFromEntradaCart(productId) {
  entradaCart = entradaCart.filter(i => i.id !== productId);
  document.getElementById('entrada-cart-tbody').innerHTML = entradaCartRowsHTML();
}

function entradaCartRowsHTML() {
  if (!entradaCart.length) {
    return `<tr><td colspan="3" style="text-align:center;color:var(--gray-400); padding:24px;">Agrega productos recibidos</td></tr>`;
  }
  return entradaCart.map(item => `
    <tr>
      <td>${item.nombre}</td>
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

function confirmarEntrada() {
  if (!entradaCart.length) {
    showToast('Agrega al menos un producto recibido', 'error');
    return;
  }
  entradaCart.forEach(item => {
    const p = DB.productos.find(p => p.id === item.id);
    if (p) p.stock += item.cantidad;
  });
  entradaOrdenSeleccionada.estado = 'Recibida';

  const nextNum = DB.entradas.length + 1;
  DB.entradas.push({
    id: 'E' + String(nextNum).padStart(3, '0'),
    fecha: new Date().toISOString().slice(0, 10),
    orden: entradaOrdenSeleccionada.id,
    almacenero: APP.currentUser.username,
    productos: entradaCart.length,
  });

  showToast(`Entrada registrada para la orden ${entradaOrdenSeleccionada.id}`, 'success');
  navigateTo('dashboard');
}

// =============================================
// ALMACENERO — PRODUCTOS AGOTADOS
// =============================================
function renderProductosAgotados() {
  const agotados = DB.productos.filter(p => p.stock <= p.stockMin);
  const rows = agotados.map(p => {
    const prov = DB.proveedores.find(pr => pr.id === p.proveedor);
    return `
      <tr>
        <td><strong>${p.id}</strong></td>
        <td>${p.nombre}</td>
        <td>${p.categoria}</td>
        <td><span class="badge ${p.stock === 0 ? 'badge-error' : 'badge-warning'}">${p.stock}</span></td>
        <td>${p.stockMin}</td>
        <td>${prov ? prov.nombre : '—'}</td>
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
      <td><strong>${p.id}</strong></td>
      <td>${p.nombre}</td>
      <td>${p.categoria}</td>
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
        <button class="btn btn-sm btn-outline" onclick="exportarReporteCSV()">${ICONS.download} Exportar CSV</button>
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