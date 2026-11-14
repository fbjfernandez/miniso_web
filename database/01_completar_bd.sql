-- =====================================================================
-- MINISO · Complemento de BD: triggers, stock automático, excepciones e integridad
-- Se ejecuta DESPUÉS de tu script actual. NO borra datos de negocio ni hace TRUNCATE.
-- Es repetible (idempotente). Pruébalo primero en una copia de tu proyecto.
--
-- Qué cambia en tu esquema:
--  * orden_compra.id y entrada_inventario.id pasan de UUID a códigos OC001 / E001
--    (las filas existentes se renumeran y sus referencias se actualizan).
--  * cliente, producto y proveedor generan su código solo (C001, P001, PR001).
--  * producto.costo (nuevo, opcional) y vistas de reportes con el formato que usa el backend.
--  * Stock automático: la venta DESCUENTA; la entrada y la devolución AUMENTAN; anular un
--    detalle de venta o de entrada revierte el stock. Todo queda en movimiento_inventario.
--
-- Códigos de error propios (los puede leer el backend en error.code):
--   MN001 stock insuficiente      MN002 dato inválido
--   MN003 estado / regla de negocio no permitida      MN004 registro no encontrado
-- =====================================================================

create extension if not exists "uuid-ossp";

-- Limpieza SOLO si ya corriste la versión anterior de este archivo (tablas nuevas con id UUID)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public'
              and table_name = 'devolucion' and column_name = 'id' and data_type = 'uuid') then
    drop table if exists detalle_devolucion cascade;
    drop table if exists devolucion cascade;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public'
              and table_name = 'detalle_entrada' and column_name = 'id_entrada' and data_type = 'uuid') then
    drop table if exists detalle_entrada cascade;
  end if;
end $$;
drop function if exists registrar_entrada(uuid, varchar, jsonb);

-- ---------------------------------------------------------------------
-- 1. RESTRICCIONES CHECK (NOT VALID: se aplican a datos nuevos sin romper los viejos)
-- ---------------------------------------------------------------------
create or replace function _add_check(p_tabla text, p_nombre text, p_expr text)
returns void language plpgsql as $$
begin
  if not exists (select 1 from pg_constraint where conname = p_nombre and conrelid = p_tabla::regclass) then
    execute format('alter table %I add constraint %I check (%s) not valid', p_tabla, p_nombre, p_expr);
  end if;
end $$;

alter table producto add column if not exists costo numeric(10,2);   -- costo de compra (opcional)
select _add_check('producto',            'ck_producto_costo',    'costo is null or costo >= 0');
select _add_check('producto',            'ck_producto_precio',   'precio >= 0');
select _add_check('producto',            'ck_producto_stock',    'stock >= 0');
select _add_check('producto',            'ck_producto_stockmin', 'stock_min >= 0');
select _add_check('cliente',             'ck_cliente_puntos',    'puntos >= 0');
select _add_check('cliente',             'ck_cliente_dni',       $$dni ~ '^[0-9]{8}$'$$);
select _add_check('cliente',             'ck_cliente_email',     $$email ~ '^[^@ ]+@[^@ ]+[.][^@ ]+$'$$);
select _add_check('proveedor',           'ck_proveedor_ruc',     $$ruc ~ '^[0-9]{11}$'$$);
select _add_check('proveedor',           'ck_proveedor_email',   $$email ~ '^[^@ ]+@[^@ ]+[.][^@ ]+$'$$);
select _add_check('venta',               'ck_venta_total',       'total >= 0');
select _add_check('detalle_venta',       'ck_dv_cantidad',       'cantidad > 0');
select _add_check('detalle_venta',       'ck_dv_precio',         'precio_unit >= 0 and subtotal >= 0');
select _add_check('orden_compra',        'ck_oc_total',          'total >= 0');
select _add_check('detalle_orden_compra','ck_doc_valores',       'cantidad > 0 and costo_unit >= 0 and subtotal >= 0');
select _add_check('entrada_inventario',  'ck_ent_cantidad',      'cantidad_productos >= 0');
select _add_check('usuario',             'ck_usuario_intentos',  'intentos_fallidos >= 0');

-- ---------------------------------------------------------------------
-- 1b. CÓDIGOS AUTOMÁTICOS (C001, P001, PR001, OC001, E001, D001)
--     Con secuencias: seguros si dos usuarios guardan al mismo tiempo.
-- ---------------------------------------------------------------------
create or replace function _sincronizar_secuencia(p_seq text, p_tabla text)
returns void language plpgsql as $$
declare v_max integer; v_actual integer;
begin
  execute format('select coalesce(max(nullif(substring(id from ''[0-9]+$''), '''')::integer), 0) from %I', p_tabla)
    into v_max;
  execute format('select case when is_called then last_value else last_value - 1 end from %I', p_seq)
    into v_actual;
  if v_actual < v_max then
    perform setval(p_seq, v_max, true);
  end if;
end $$;

-- Órdenes de compra y entradas: de UUID a código legible (OC001, E001), conservando sus relaciones
do $$
declare v_tipo text;
begin
  select data_type into v_tipo from information_schema.columns
   where table_schema = 'public' and table_name = 'orden_compra' and column_name = 'id';
  if v_tipo = 'uuid' then
    alter table detalle_orden_compra drop constraint if exists detalle_orden_compra_id_orden_fkey;
    alter table entrada_inventario   drop constraint if exists entrada_inventario_id_orden_fkey;
    alter table orden_compra alter column id drop default;
    alter table orden_compra         alter column id       type varchar(40) using id::text;
    alter table detalle_orden_compra alter column id_orden type varchar(40) using id_orden::text;
    alter table entrada_inventario   alter column id_orden type varchar(40) using id_orden::text;

    create temp table _map_oc on commit drop as
      select id as viejo, 'OC' || lpad((row_number() over (order by fecha, id))::text, 3, '0') as nuevo
        from orden_compra;
    update orden_compra         o set id       = m.nuevo from _map_oc m where o.id       = m.viejo;
    update detalle_orden_compra d set id_orden = m.nuevo from _map_oc m where d.id_orden = m.viejo;
    update entrada_inventario   e set id_orden = m.nuevo from _map_oc m where e.id_orden = m.viejo;

    alter table orden_compra         alter column id       type varchar(10);
    alter table detalle_orden_compra alter column id_orden type varchar(10);
    alter table entrada_inventario   alter column id_orden type varchar(10);
    alter table detalle_orden_compra add constraint detalle_orden_compra_id_orden_fkey
      foreign key (id_orden) references orden_compra(id) on delete cascade;
    alter table entrada_inventario add constraint entrada_inventario_id_orden_fkey
      foreign key (id_orden) references orden_compra(id) on update cascade;
  end if;

  select data_type into v_tipo from information_schema.columns
   where table_schema = 'public' and table_name = 'entrada_inventario' and column_name = 'id';
  if v_tipo = 'uuid' then
    alter table entrada_inventario alter column id drop default;
    alter table entrada_inventario alter column id type varchar(40) using id::text;
    create temp table _map_en on commit drop as
      select id as viejo, 'E' || lpad((row_number() over (order by fecha, id))::text, 3, '0') as nuevo
        from entrada_inventario;
    update entrada_inventario e set id = m.nuevo from _map_en m where e.id = m.viejo;
    alter table entrada_inventario alter column id type varchar(10);
  end if;
end $$;

create sequence if not exists seq_cliente;
create sequence if not exists seq_producto;
create sequence if not exists seq_proveedor;
create sequence if not exists seq_orden_compra;
create sequence if not exists seq_entrada;
create sequence if not exists seq_devolucion;

select _sincronizar_secuencia('seq_cliente',      'cliente');
select _sincronizar_secuencia('seq_producto',     'producto');
select _sincronizar_secuencia('seq_proveedor',    'proveedor');
select _sincronizar_secuencia('seq_orden_compra', 'orden_compra');
select _sincronizar_secuencia('seq_entrada',      'entrada_inventario');

alter table cliente            alter column id set default 'C'  || lpad(nextval('seq_cliente')::text, 3, '0');
alter table producto           alter column id set default 'P'  || lpad(nextval('seq_producto')::text, 3, '0');
alter table proveedor          alter column id set default 'PR' || lpad(nextval('seq_proveedor')::text, 3, '0');
alter table orden_compra       alter column id set default 'OC' || lpad(nextval('seq_orden_compra')::text, 3, '0');
alter table entrada_inventario alter column id set default 'E'  || lpad(nextval('seq_entrada')::text, 3, '0');

-- ---------------------------------------------------------------------
-- 2. TABLAS Y COLUMNAS QUE FALTAN
-- ---------------------------------------------------------------------
alter table venta         add column if not exists monto_devuelto numeric(10,2) not null default 0;
alter table detalle_venta add column if not exists cantidad_devuelta integer not null default 0;
select _add_check('detalle_venta', 'ck_dv_devuelta', 'cantidad_devuelta >= 0 and cantidad_devuelta <= cantidad');

-- Qué productos llegaron en cada entrada (hoy solo se guarda un número)
create table if not exists detalle_entrada (
  id           uuid primary key default uuid_generate_v4(),
  id_entrada   varchar(10) not null references entrada_inventario(id) on delete cascade,
  id_producto  varchar(10) not null references producto(id) on update cascade,
  cantidad     integer not null check (cantidad > 0)
);

-- Devoluciones con motivo, monto y detalle (hoy solo se cambia el estado de la venta)
create table if not exists devolucion (
  id        varchar(10) primary key default 'D' || lpad(nextval('seq_devolucion')::text, 3, '0'),
  fecha     timestamp with time zone not null default now(),
  id_venta  varchar(10) not null references venta(id) on update cascade,
  username  varchar(50) references usuario(username) on update cascade,
  motivo    text not null check (btrim(motivo) <> ''),
  monto     numeric(10,2) not null default 0
);

create table if not exists detalle_devolucion (
  id             uuid primary key default uuid_generate_v4(),
  id_devolucion  varchar(10) not null references devolucion(id) on delete cascade,
  id_producto    varchar(10) not null references producto(id) on update cascade,
  cantidad       integer not null,
  subtotal       numeric(10,2) not null default 0
);

-- Kardex: cada movimiento de stock queda registrado
create table if not exists movimiento_inventario (
  id                uuid primary key default uuid_generate_v4(),
  fecha             timestamp with time zone not null default now(),
  id_producto       varchar(10) not null references producto(id) on update cascade,
  tipo              varchar(15) not null check (tipo in ('ENTRADA','SALIDA','DEVOLUCION','AJUSTE')),
  cantidad          integer not null,         -- positivo suma, negativo resta
  stock_resultante  integer not null,
  referencia        text
);

-- Bitácora de cambios (la contraseña nunca se guarda aquí)
create table if not exists auditoria (
  id                bigint generated always as identity primary key,
  fecha             timestamp with time zone not null default now(),
  tabla             text not null,
  operacion         text not null,
  id_registro       text,
  datos_anteriores  jsonb,
  datos_nuevos      jsonb
);

-- Correlativo de boletas SIN saltos (la secuencia seq_boleta_b001 consume números aunque la venta falle)
create table if not exists control_comprobante (
  serie   varchar(5) primary key,
  ultimo  integer not null default 0
);
insert into control_comprobante (serie, ultimo)
select 'B001', coalesce(max(correlativo_comprobante), 0) from venta
on conflict (serie) do update set ultimo = greatest(control_comprobante.ultimo, excluded.ultimo);

-- ---------------------------------------------------------------------
-- 3. TRIGGERS DE VENTAS
-- ---------------------------------------------------------------------

-- 3.1 Valida el detalle ANTES de insertar: cantidad, producto activo, stock suficiente.
--     El precio y el subtotal los fija la BD (no se confía en el navegador).
create or replace function fn_validar_detalle_venta() returns trigger language plpgsql as $$
declare p producto%rowtype;
begin
  if NEW.cantidad is null or NEW.cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0 (producto %)', NEW.id_producto using errcode = 'MN002';
  end if;
  select * into p from producto where id = NEW.id_producto for update;   -- bloquea la fila: evita ventas simultáneas
  if not found then
    raise exception 'El producto % no existe', NEW.id_producto using errcode = 'MN004';
  end if;
  if not p.activo then
    raise exception 'El producto "%" está inactivo', p.nombre using errcode = 'MN003';
  end if;
  if p.stock < NEW.cantidad then
    raise exception 'Stock insuficiente para "%" (disponible: %, solicitado: %)', p.nombre, p.stock, NEW.cantidad
      using errcode = 'MN001';
  end if;
  NEW.precio_unit := p.precio;
  NEW.subtotal    := round(p.precio * NEW.cantidad, 2);
  return NEW;
end $$;

drop trigger if exists trg_validar_detalle_venta on detalle_venta;
create trigger trg_validar_detalle_venta before insert on detalle_venta
  for each row execute function fn_validar_detalle_venta();

-- 3.2 Descuenta stock (ya lo tenías) + registra el movimiento en el kardex
create or replace function fn_descontar_stock() returns trigger language plpgsql as $$
declare v_stock integer;
begin
  update producto set stock = stock - NEW.cantidad where id = NEW.id_producto returning stock into v_stock;
  if v_stock < 0 then
    raise exception 'Stock insuficiente para el producto %', NEW.id_producto using errcode = 'MN001';
  end if;
  insert into movimiento_inventario (id_producto, tipo, cantidad, stock_resultante, referencia)
  values (NEW.id_producto, 'SALIDA', -NEW.cantidad, v_stock, 'Venta ' || NEW.id_venta);
  return NEW;
end $$;

-- 3.3 Total de la venta: tu versión fallaba al BORRAR un detalle (NEW es nulo en DELETE)
create or replace function fn_calcular_total_venta() returns trigger language plpgsql as $$
declare v_id varchar(10);
begin
  if TG_OP = 'DELETE' then v_id := OLD.id_venta; else v_id := NEW.id_venta; end if;
  update venta
     set total = (select coalesce(sum(subtotal), 0) from detalle_venta where id_venta = v_id)
   where id = v_id;
  return null;
end $$;

-- 3.4 Estados de la venta: una venta devuelta no se reabre y no se marca "Devuelta" a mano
--     (para devolver hay que usar registrar_devolucion, que repone stock y puntos)
create or replace function fn_guardar_estado_venta() returns trigger language plpgsql as $$
begin
  if OLD.estado = 'Devuelta' and NEW.estado <> 'Devuelta' then
    raise exception 'Una venta devuelta no puede reabrirse' using errcode = 'MN003';
  end if;
  if NEW.estado = 'Devuelta' and OLD.estado <> 'Devuelta' and pg_trigger_depth() = 1 then
    raise exception 'Para devolver una venta use registrar_devolucion (repone stock y puntos)' using errcode = 'MN003';
  end if;
  return NEW;
end $$;

drop trigger if exists trg_guardar_estado_venta on venta;
create trigger trg_guardar_estado_venta before update of estado on venta
  for each row when (OLD.estado is distinct from NEW.estado)
  execute function fn_guardar_estado_venta();

-- 3.5 Solo vende un usuario activo y no bloqueado
create or replace function fn_validar_venta() returns trigger language plpgsql as $$
declare u usuario%rowtype;
begin
  select * into u from usuario where username = NEW.username_cajero;
  if not found or not u.activo or u.bloqueado then
    raise exception 'El usuario % no puede registrar ventas (inactivo o bloqueado)', NEW.username_cajero
      using errcode = 'MN003';
  end if;
  return NEW;
end $$;

drop trigger if exists trg_validar_venta on venta;
create trigger trg_validar_venta before insert on venta
  for each row execute function fn_validar_venta();

-- 3.6 STOCK AUTOMÁTICO · anular un detalle de venta devuelve al stock lo que no se había devuelto
create or replace function fn_reponer_stock_detalle_venta() returns trigger language plpgsql as $$
declare v_stock integer; v_rep integer;
begin
  v_rep := OLD.cantidad - OLD.cantidad_devuelta;      -- lo ya devuelto ya regresó al stock
  if v_rep > 0 then
    update producto set stock = stock + v_rep where id = OLD.id_producto returning stock into v_stock;
    if v_stock is not null then
      insert into movimiento_inventario (id_producto, tipo, cantidad, stock_resultante, referencia)
      values (OLD.id_producto, 'AJUSTE', v_rep, v_stock, 'Anulación de venta ' || OLD.id_venta);
    end if;
  end if;
  return null;
end $$;

drop trigger if exists trg_reponer_stock_detalle_venta on detalle_venta;
create trigger trg_reponer_stock_detalle_venta after delete on detalle_venta
  for each row execute function fn_reponer_stock_detalle_venta();

-- Una venta registrada no se edita (para corregirla se usa la devolución)
create or replace function fn_bloquear_edicion_detalle() returns trigger language plpgsql as $$
begin
  raise exception 'El detalle registrado no se puede modificar; use una devolución o anule el registro'
    using errcode = 'MN003';
end $$;

drop trigger if exists trg_bloquear_edicion_detalle_venta on detalle_venta;
create trigger trg_bloquear_edicion_detalle_venta
  before update of cantidad, id_producto, precio_unit, subtotal on detalle_venta
  for each row execute function fn_bloquear_edicion_detalle();

-- ---------------------------------------------------------------------
-- 4. TRIGGERS DE DEVOLUCIONES
-- ---------------------------------------------------------------------
create or replace function fn_validar_devolucion() returns trigger language plpgsql as $$
declare v venta%rowtype;
begin
  select * into v from venta where id = NEW.id_venta for update;
  if not found then
    raise exception 'La venta % no existe', NEW.id_venta using errcode = 'MN004';
  end if;
  if v.estado <> 'Completada' then
    raise exception 'La venta % no admite devoluciones (estado: %)', NEW.id_venta, v.estado using errcode = 'MN003';
  end if;
  return NEW;
end $$;

drop trigger if exists trg_validar_devolucion on devolucion;
create trigger trg_validar_devolucion before insert on devolucion
  for each row execute function fn_validar_devolucion();

-- Al insertar cada línea devuelta: valida que no exceda lo vendido, repone stock,
-- descuenta puntos, suma el monto y cierra la venta cuando ya no queda nada por devolver.
create or replace function fn_aplicar_devolucion() returns trigger language plpgsql as $$
declare
  dev      devolucion%rowtype;
  d        record;
  v_rest   integer;
  v_take   integer;
  v_monto  numeric(10,2) := 0;
  v_stock  integer;
  v_cli    varchar(10);
  v_pend   integer;
begin
  if NEW.cantidad is null or NEW.cantidad <= 0 then
    raise exception 'La cantidad a devolver debe ser mayor a 0' using errcode = 'MN002';
  end if;
  select * into dev from devolucion where id = NEW.id_devolucion;

  v_rest := NEW.cantidad;
  for d in
    select id, cantidad, cantidad_devuelta, precio_unit
      from detalle_venta
     where id_venta = dev.id_venta and id_producto = NEW.id_producto and cantidad_devuelta < cantidad
     order by id for update
  loop
    v_take  := least(v_rest, d.cantidad - d.cantidad_devuelta);
    update detalle_venta set cantidad_devuelta = cantidad_devuelta + v_take where id = d.id;
    v_monto := v_monto + v_take * d.precio_unit;
    v_rest  := v_rest - v_take;
    exit when v_rest = 0;
  end loop;

  if v_rest > 0 then
    raise exception 'No puede devolver % unidades del producto %: excede lo vendido pendiente de devolver',
      NEW.cantidad, NEW.id_producto using errcode = 'MN002';
  end if;

  update producto set stock = stock + NEW.cantidad where id = NEW.id_producto returning stock into v_stock;
  insert into movimiento_inventario (id_producto, tipo, cantidad, stock_resultante, referencia)
  values (NEW.id_producto, 'DEVOLUCION', NEW.cantidad, v_stock, 'Devolución de venta ' || dev.id_venta);

  NEW.subtotal := v_monto;
  update devolucion set monto = monto + v_monto where id = dev.id;
  update venta set monto_devuelto = monto_devuelto + v_monto where id = dev.id_venta returning id_cliente into v_cli;
  if v_cli is not null then
    update cliente set puntos = greatest(0, puntos - floor(v_monto / 10)::integer) where id = v_cli;
  end if;

  select coalesce(sum(cantidad - cantidad_devuelta), 0) into v_pend from detalle_venta where id_venta = dev.id_venta;
  if v_pend = 0 then
    update venta set estado = 'Devuelta' where id = dev.id_venta;
  end if;
  return NEW;
end $$;

drop trigger if exists trg_aplicar_devolucion on detalle_devolucion;
create trigger trg_aplicar_devolucion before insert on detalle_devolucion
  for each row execute function fn_aplicar_devolucion();

-- ---------------------------------------------------------------------
-- 5. TRIGGERS DE COMPRAS Y ENTRADAS
-- ---------------------------------------------------------------------
create or replace function fn_validar_detalle_orden() returns trigger language plpgsql as $$
declare o orden_compra%rowtype; p producto%rowtype;
begin
  select * into o from orden_compra where id = NEW.id_orden;
  if not found then raise exception 'La orden no existe' using errcode = 'MN004'; end if;
  if o.estado <> 'Pendiente' then
    raise exception 'La orden está % y no admite cambios', o.estado using errcode = 'MN003';
  end if;
  select * into p from producto where id = NEW.id_producto;
  if not found then raise exception 'El producto % no existe', NEW.id_producto using errcode = 'MN004'; end if;
  if NEW.cantidad is null or NEW.cantidad <= 0 then
    raise exception 'Cantidad inválida para "%"', p.nombre using errcode = 'MN002';
  end if;
  if NEW.costo_unit is null or NEW.costo_unit < 0 then
    raise exception 'Costo inválido para "%"', p.nombre using errcode = 'MN002';
  end if;
  NEW.subtotal := round(NEW.cantidad * NEW.costo_unit, 2);
  return NEW;
end $$;

drop trigger if exists trg_validar_detalle_orden on detalle_orden_compra;
create trigger trg_validar_detalle_orden before insert on detalle_orden_compra
  for each row execute function fn_validar_detalle_orden();

create or replace function fn_calcular_total_orden() returns trigger language plpgsql as $$
declare v_id varchar(10);
begin
  if TG_OP = 'DELETE' then v_id := OLD.id_orden; else v_id := NEW.id_orden; end if;
  update orden_compra
     set total = (select coalesce(sum(subtotal), 0) from detalle_orden_compra where id_orden = v_id)
   where id = v_id;
  return null;
end $$;

drop trigger if exists trg_calcular_total_orden on detalle_orden_compra;
create trigger trg_calcular_total_orden after insert or update or delete on detalle_orden_compra
  for each row execute function fn_calcular_total_orden();

-- Estados de la orden: Pendiente → Recibida | Cancelada. Los otros dos son finales.
create or replace function fn_guardar_estado_orden() returns trigger language plpgsql as $$
begin
  if OLD.estado <> 'Pendiente' then
    raise exception 'La orden ya está % y no puede cambiar de estado', OLD.estado using errcode = 'MN003';
  end if;
  return NEW;
end $$;

drop trigger if exists trg_guardar_estado_orden on orden_compra;
create trigger trg_guardar_estado_orden before update of estado on orden_compra
  for each row when (OLD.estado is distinct from NEW.estado)
  execute function fn_guardar_estado_orden();

-- La entrada solo se registra contra una orden pendiente
create or replace function fn_validar_entrada() returns trigger language plpgsql as $$
declare o orden_compra%rowtype;
begin
  select * into o from orden_compra where id = NEW.id_orden for update;
  if not found then raise exception 'La orden no existe' using errcode = 'MN004'; end if;
  if o.estado <> 'Pendiente' then
    raise exception 'La orden está % y no admite entradas', o.estado using errcode = 'MN003';
  end if;
  return NEW;
end $$;

drop trigger if exists trg_validar_entrada on entrada_inventario;
create trigger trg_validar_entrada before insert on entrada_inventario
  for each row execute function fn_validar_entrada();

-- Cada producto recibido: debe pertenecer a la orden y no superar lo pedido; suma stock y kardex
create or replace function fn_aplicar_detalle_entrada() returns trigger language plpgsql as $$
declare v_orden varchar(10); v_pedida integer; v_stock integer;
begin
  select id_orden into v_orden from entrada_inventario where id = NEW.id_entrada;
  select coalesce(sum(cantidad), 0) into v_pedida
    from detalle_orden_compra where id_orden = v_orden and id_producto = NEW.id_producto;
  if v_pedida = 0 then
    raise exception 'El producto % no forma parte de la orden', NEW.id_producto using errcode = 'MN002';
  end if;
  if NEW.cantidad > v_pedida then
    raise exception 'No puede recibir % de %: la orden solo pidió %', NEW.cantidad, NEW.id_producto, v_pedida
      using errcode = 'MN002';
  end if;
  update producto set stock = stock + NEW.cantidad where id = NEW.id_producto returning stock into v_stock;
  insert into movimiento_inventario (id_producto, tipo, cantidad, stock_resultante, referencia)
  values (NEW.id_producto, 'ENTRADA', NEW.cantidad, v_stock, 'Entrada de orden ' || v_orden);
  update entrada_inventario set cantidad_productos = cantidad_productos + 1 where id = NEW.id_entrada;
  return NEW;
end $$;

drop trigger if exists trg_aplicar_detalle_entrada on detalle_entrada;
create trigger trg_aplicar_detalle_entrada before insert on detalle_entrada
  for each row execute function fn_aplicar_detalle_entrada();

-- STOCK AUTOMÁTICO · anular una línea de entrada descuenta del stock lo que había sumado
-- (si ese stock ya se vendió, el CHECK stock >= 0 rechaza la anulación)
create or replace function fn_revertir_detalle_entrada() returns trigger language plpgsql as $$
declare v_stock integer;
begin
  update producto set stock = stock - OLD.cantidad where id = OLD.id_producto returning stock into v_stock;
  if v_stock is not null then
    insert into movimiento_inventario (id_producto, tipo, cantidad, stock_resultante, referencia)
    values (OLD.id_producto, 'AJUSTE', -OLD.cantidad, v_stock, 'Anulación de entrada ' || OLD.id_entrada);
  end if;
  return null;
end $$;

drop trigger if exists trg_revertir_detalle_entrada on detalle_entrada;
create trigger trg_revertir_detalle_entrada after delete on detalle_entrada
  for each row execute function fn_revertir_detalle_entrada();

drop trigger if exists trg_bloquear_edicion_detalle_entrada on detalle_entrada;
create trigger trg_bloquear_edicion_detalle_entrada
  before update of cantidad, id_producto on detalle_entrada
  for each row execute function fn_bloquear_edicion_detalle();

-- ---------------------------------------------------------------------
-- 6. TRIGGERS DE USUARIOS, STOCK MANUAL Y AUDITORÍA
-- ---------------------------------------------------------------------

-- 6.1 Bloqueo automático a los 5 intentos (HU-08) y reinicio del contador al desbloquear
create or replace function fn_bloqueo_usuario() returns trigger language plpgsql as $$
begin
  if OLD.bloqueado and not NEW.bloqueado then
    NEW.intentos_fallidos := 0;
  end if;
  if NEW.intentos_fallidos >= 5 then
    NEW.bloqueado := true;
  end if;
  return NEW;
end $$;

drop trigger if exists trg_bloqueo_usuario on usuario;
create trigger trg_bloqueo_usuario before update on usuario
  for each row execute function fn_bloqueo_usuario();

-- 6.2 Nunca puede quedar el sistema sin un administrador activo
create or replace function fn_proteger_admin() returns trigger language plpgsql as $$
declare v_pierde boolean;
begin
  if OLD.rol = 'Administrador' and OLD.activo then
    if TG_OP = 'DELETE' then
      v_pierde := true;
    else
      v_pierde := (NEW.rol <> 'Administrador' or not NEW.activo);
    end if;
    if v_pierde then
      if not exists (select 1 from usuario where rol = 'Administrador' and activo and id <> OLD.id) then
        raise exception 'No puede quedar el sistema sin un administrador activo' using errcode = 'MN003';
      end if;
    end if;
  end if;
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end $$;

drop trigger if exists trg_proteger_admin on usuario;
create trigger trg_proteger_admin before update or delete on usuario
  for each row execute function fn_proteger_admin();

-- 6.3 Cambio manual de stock (ajuste desde Productos) queda en el kardex
create or replace function fn_kardex_ajuste() returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() = 1 then      -- solo ajustes directos; las ventas/entradas ya registran su movimiento
    insert into movimiento_inventario (id_producto, tipo, cantidad, stock_resultante, referencia)
    values (NEW.id, 'AJUSTE', NEW.stock - OLD.stock, NEW.stock, 'Ajuste manual de stock');
  end if;
  return null;
end $$;

drop trigger if exists trg_kardex_ajuste on producto;
create trigger trg_kardex_ajuste after update of stock on producto
  for each row when (OLD.stock is distinct from NEW.stock)
  execute function fn_kardex_ajuste();

-- 6.4 Auditoría de cambios (sin contraseñas)
create or replace function fn_auditar() returns trigger language plpgsql as $$
declare v_old jsonb; v_new jsonb;
begin
  if TG_OP in ('UPDATE', 'DELETE') then v_old := to_jsonb(OLD) - 'password'; end if;
  if TG_OP in ('INSERT', 'UPDATE') then v_new := to_jsonb(NEW) - 'password'; end if;
  insert into auditoria (tabla, operacion, id_registro, datos_anteriores, datos_nuevos)
  values (TG_TABLE_NAME, TG_OP, coalesce(v_new ->> 'id', v_old ->> 'id'), v_old, v_new);
  return null;
end $$;

drop trigger if exists trg_audit_producto on producto;
create trigger trg_audit_producto after insert or update of nombre, categoria, precio, stock_min, id_proveedor, activo or delete on producto
  for each row execute function fn_auditar();
drop trigger if exists trg_audit_proveedor on proveedor;
create trigger trg_audit_proveedor after insert or update or delete on proveedor
  for each row execute function fn_auditar();
drop trigger if exists trg_audit_orden on orden_compra;
create trigger trg_audit_orden after insert or update of estado or delete on orden_compra
  for each row execute function fn_auditar();
drop trigger if exists trg_audit_usuario on usuario;
create trigger trg_audit_usuario after insert or update of username, nombre, rol, activo, bloqueado or delete on usuario
  for each row execute function fn_auditar();

-- ---------------------------------------------------------------------
-- 7. FUNCIONES (una transacción cada una; los errores conservan su código y mensaje)
-- ---------------------------------------------------------------------

-- 7.1 Venta: mismo nombre y firma que la tuya, pero validada y SIN "when others" que oculta el error
drop function if exists registrar_venta(varchar, varchar, jsonb);
create function registrar_venta(p_cliente_id varchar, p_cajero_username varchar, p_detalles jsonb)
returns jsonb language plpgsql as $$
declare
  v_id     varchar(10);
  v_num    integer;
  v_corr   integer;
  v_comp   text;
  v_total  numeric(10,2);
  r        record;
begin
  if p_detalles is null or jsonb_typeof(p_detalles) <> 'array' or jsonb_array_length(p_detalles) = 0 then
    raise exception 'La venta debe tener al menos un producto' using errcode = 'MN002';
  end if;
  if p_cliente_id is not null and not exists (select 1 from cliente where id = p_cliente_id) then
    raise exception 'El cliente % no existe', p_cliente_id using errcode = 'MN004';
  end if;

  -- Código V001, V002… sin duplicados aunque dos cajeros vendan a la vez
  perform pg_advisory_xact_lock(hashtext('miniso_venta_id'));
  select coalesce(max(substring(id from 2)::integer), 0) + 1 into v_num from venta where id ~ '^V[0-9]+$';
  v_id := 'V' || lpad(v_num::text, 3, '0');

  update control_comprobante set ultimo = ultimo + 1 where serie = 'B001' returning ultimo into v_corr;
  if v_corr is null then
    raise exception 'No está configurada la serie de comprobantes B001' using errcode = 'MN003';
  end if;
  v_comp := 'B001-' || lpad(v_corr::text, 6, '0');

  insert into venta (id, id_cliente, username_cajero, serie_comprobante, correlativo_comprobante)
  values (v_id, p_cliente_id, p_cajero_username, 'B001', v_corr);

  -- Productos repetidos se suman; precio y subtotal los fija el trigger
  for r in
    select x.id_producto, sum(x.cantidad)::integer as cantidad
      from jsonb_to_recordset(p_detalles) as x(id_producto text, cantidad integer)
     group by x.id_producto
     order by x.id_producto
  loop
    insert into detalle_venta (id_venta, id_producto, cantidad, precio_unit, subtotal)
    values (v_id, r.id_producto, r.cantidad, 0, 0);
  end loop;

  select total into v_total from venta where id = v_id;
  if p_cliente_id is not null then
    update cliente set puntos = puntos + floor(v_total / 10)::integer where id = p_cliente_id;
  end if;

  insert into nota_salida (id_venta, comprobante_origen, estado_despacho)
  values (v_id, v_comp, 'PENDIENTE');

  return jsonb_build_object('id', v_id, 'comprobante', v_comp, 'total', v_total,
                            'estado', 'Completada', 'estado_almacen', 'NOTA_SALIDA_GENERADA');
end $$;

-- 7.2 Devolución total o parcial: p_items = [{"id_producto":"P001","cantidad":1}]; null = todo lo pendiente
create or replace function registrar_devolucion(p_venta_id varchar, p_username varchar, p_motivo text, p_items jsonb default null)
returns jsonb language plpgsql as $$
declare v_dev varchar(10); v_monto numeric(10,2); v_estado text;
begin
  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception 'El motivo de la devolución es obligatorio' using errcode = 'MN002';
  end if;
  insert into devolucion (id_venta, username, motivo) values (p_venta_id, p_username, btrim(p_motivo))
  returning id into v_dev;

  if p_items is null then
    insert into detalle_devolucion (id_devolucion, id_producto, cantidad)
    select v_dev, id_producto, sum(cantidad - cantidad_devuelta)
      from detalle_venta where id_venta = p_venta_id and cantidad > cantidad_devuelta
     group by id_producto;
  else
    insert into detalle_devolucion (id_devolucion, id_producto, cantidad)
    select v_dev, x.id_producto, sum(x.cantidad)
      from jsonb_to_recordset(p_items) as x(id_producto text, cantidad integer)
     where x.cantidad > 0
     group by x.id_producto;
  end if;

  if not exists (select 1 from detalle_devolucion where id_devolucion = v_dev) then
    raise exception 'Seleccione al menos una unidad para devolver' using errcode = 'MN002';
  end if;

  select monto into v_monto from devolucion where id = v_dev;
  select estado into v_estado from venta where id = p_venta_id;
  return jsonb_build_object('id', v_dev, 'id_venta', p_venta_id, 'monto', v_monto, 'estado', v_estado);
end $$;

-- 7.3 Orden de compra: p_items = [{"id_producto":"P001","cantidad":10,"costo_unit":12.5}]
create or replace function crear_orden_compra(p_proveedor_id varchar, p_username varchar, p_items jsonb)
returns jsonb language plpgsql as $$
declare v_id varchar(10); v_total numeric(10,2);
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La orden debe tener al menos un producto' using errcode = 'MN002';
  end if;
  if not exists (select 1 from proveedor where id = p_proveedor_id and activo) then
    raise exception 'El proveedor no existe o está inactivo' using errcode = 'MN004';
  end if;

  insert into orden_compra (id_proveedor, username_admin, total, estado)
  values (p_proveedor_id, p_username, 0, 'Pendiente') returning id into v_id;

  insert into detalle_orden_compra (id_orden, id_producto, cantidad, costo_unit, subtotal)
  select v_id, x.id_producto, x.cantidad, x.costo_unit, 0
    from jsonb_to_recordset(p_items) as x(id_producto text, cantidad integer, costo_unit numeric);

  select total into v_total from orden_compra where id = v_id;
  return jsonb_build_object('id', v_id, 'total', v_total, 'estado', 'Pendiente');
end $$;

-- 7.4 Entrada de almacén: p_items = [{"id_producto":"P001","cantidad":10}]
create or replace function registrar_entrada(p_orden_id varchar, p_username varchar, p_items jsonb)
returns jsonb language plpgsql as $$
declare v_id varchar(10); v_n integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Debe registrar al menos un producto recibido' using errcode = 'MN002';
  end if;
  insert into entrada_inventario (id_orden, username_almacenero, cantidad_productos)
  values (p_orden_id, p_username, 0) returning id into v_id;

  insert into detalle_entrada (id_entrada, id_producto, cantidad)
  select v_id, x.id_producto, sum(x.cantidad)
    from jsonb_to_recordset(p_items) as x(id_producto text, cantidad integer)
   group by x.id_producto;

  update orden_compra set estado = 'Recibida' where id = p_orden_id;
  select cantidad_productos into v_n from entrada_inventario where id = v_id;
  return jsonb_build_object('id', v_id, 'estado', 'ok', 'productos', v_n);
end $$;

-- 7.5 Intento de login fallido: incremento atómico (el trigger 6.1 bloquea al 5.º)
create or replace function registrar_intento_fallido(p_user_id integer)
returns jsonb language plpgsql as $$
declare v_int integer; v_blq boolean;
begin
  update usuario set intentos_fallidos = intentos_fallidos + 1 where id = p_user_id
  returning intentos_fallidos, bloqueado into v_int, v_blq;
  return jsonb_build_object('intentos', v_int, 'bloqueado', v_blq);
end $$;

-- ---------------------------------------------------------------------
-- 8. VISTAS DE REPORTES (formato que consume el backend)
-- ---------------------------------------------------------------------
drop view if exists v_reporte_ventas;
create view v_reporte_ventas as
select v.id,
       v.serie_comprobante || '-' || lpad(v.correlativo_comprobante::text, 6, '0') as comprobante,
       (v.fecha at time zone 'America/Lima')::date as fecha,          -- fecha en hora de Lima
       v.id_cliente,
       c.nombre as nombre_cliente,
       v.username_cajero as cajero,
       v.total,
       v.monto_devuelto,
       v.estado,
       ns.estado_despacho as estado_almacen
  from venta v
  left join cliente c on c.id = v.id_cliente
  left join nota_salida ns on ns.id_venta = v.id
 order by v.fecha desc, v.id desc;

drop view if exists v_productos_stock_bajo;
create view v_productos_stock_bajo as
select p.id, p.nombre, p.categoria, p.precio, p.stock, p.stock_min,
       p.id_proveedor, pr.nombre as proveedor_nombre
  from producto p
  join proveedor pr on pr.id = p.id_proveedor
 where p.stock <= p.stock_min and p.activo
 order by p.stock, p.id;

drop view if exists v_reporte_inventario;
create view v_reporte_inventario as
select p.id, p.nombre, p.categoria, p.stock, p.stock_min, p.precio, p.costo,
       (p.precio * p.stock) as valor_total,
       p.id_proveedor, pr.nombre as proveedor_nombre
  from producto p
  join proveedor pr on pr.id = p.id_proveedor
 where p.activo
 order by p.id;

-- ---------------------------------------------------------------------
-- 9. SEGURIDAD: tablas nuevas (y nota_salida, que quedó fuera de tu bloque de RLS)
-- ---------------------------------------------------------------------
alter table nota_salida           enable row level security;
alter table detalle_entrada       enable row level security;
alter table devolucion            enable row level security;
alter table detalle_devolucion    enable row level security;
alter table movimiento_inventario enable row level security;
alter table auditoria             enable row level security;
alter table control_comprobante   enable row level security;

notify pgrst, 'reload schema';
