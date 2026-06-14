CREATE TABLE activos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  codigo TEXT UNIQUE,
  valor_adquisicion REAL,
  valor_actual REAL,
  fecha_adquisicion TEXT,
  estado TEXT DEFAULT 'bueno' CHECK(estado IN ('bueno','regular','malo','reparacion')),
  ubicacion TEXT,
  foto_url TEXT,
  categoria TEXT,
  vida_util_anos INTEGER,
  tasa_depreciacion_anual REAL,
  notas TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE anuncios (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  tipo TEXT DEFAULT 'general' CHECK(tipo IN ('general','ministerio','evento','urgente')),
  ministerio_id TEXT REFERENCES ministerios(id),
  publicado INTEGER DEFAULT 0,
  fecha_publicacion TEXT,
  fecha_expiracion TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE anuncios_vistos (
  id TEXT PRIMARY KEY,
  anuncio_id TEXT NOT NULL REFERENCES anuncios(id) ON DELETE CASCADE,
  miembro_id TEXT NOT NULL REFERENCES miembros(id),
  visto_at TEXT DEFAULT (datetime('now')),
  UNIQUE(anuncio_id, miembro_id)
);
CREATE TABLE asistencia_grupo (
  id TEXT PRIMARY KEY,
  grupo_id TEXT NOT NULL REFERENCES grupos_celulares(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL,
  asistentes TEXT DEFAULT '[]',
  ofrenda REAL DEFAULT 0,
  notas TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE asistencia_servicio (
  id TEXT PRIMARY KEY,
  servicio_id TEXT NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  miembro_id TEXT NOT NULL REFERENCES miembros(id),
  estado TEXT DEFAULT 'presente' CHECK(estado IN ('presente','ausente','justificado')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(servicio_id, miembro_id)
);
CREATE TABLE bautismos (
  id TEXT PRIMARY KEY,
  miembro_id TEXT NOT NULL REFERENCES miembros(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK(tipo IN ('agua','espiritu_santo')),
  fecha TEXT NOT NULL,
  pastor_id TEXT REFERENCES miembros(id),
  iglesia_origen TEXT,
  certificado_url TEXT,
  notas TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE caja_chica (
  id TEXT PRIMARY KEY,
  fecha_apertura TEXT NOT NULL DEFAULT (datetime('now')),
  fecha_cierre TEXT,
  monto_inicial REAL NOT NULL,
  monto_actual REAL NOT NULL,
  responsable_id TEXT REFERENCES miembros(id),
  estado TEXT DEFAULT 'abierta' CHECK(estado IN ('abierta','cerrada')),
  notas TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE categorias_egresos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE comunicaciones (
  id TEXT PRIMARY KEY,
  asunto TEXT NOT NULL,
  cuerpo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('email','whatsapp','sms')),
  plantilla_id TEXT REFERENCES plantillas_mensajes(id),
  segmentacion TEXT DEFAULT '{}',
  total_destinatarios INTEGER DEFAULT 0,
  enviados INTEGER DEFAULT 0,
  abiertos INTEGER DEFAULT 0,
  estado TEXT DEFAULT 'borrador' CHECK(estado IN ('borrador','enviando','enviada','fallida')),
  enviado_por TEXT REFERENCES miembros(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE destinatarios_comunicacion (
  id TEXT PRIMARY KEY,
  comunicacion_id TEXT NOT NULL REFERENCES comunicaciones(id) ON DELETE CASCADE,
  miembro_id TEXT REFERENCES miembros(id),
  email TEXT,
  telefono TEXT,
  enviado INTEGER DEFAULT 0,
  abierto INTEGER DEFAULT 0,
  error TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE diezmos (
  id TEXT PRIMARY KEY,
  miembro_id TEXT REFERENCES miembros(id),
  fecha TEXT NOT NULL,
  monto REAL NOT NULL CHECK(monto > 0),
  metodo_pago TEXT DEFAULT 'efectivo' CHECK(metodo_pago IN ('efectivo','transferencia','tarjeta','cheque')),
  referencia TEXT,
  recibo_numero TEXT UNIQUE,
  notas TEXT,
  registrado_por TEXT REFERENCES miembros(id),
  created_at TEXT DEFAULT (datetime('now'))
, servicio_id TEXT REFERENCES servicios(id));
CREATE TABLE egresos (
  id TEXT PRIMARY KEY,
  categoria_id TEXT REFERENCES categorias_egresos(id),
  descripcion TEXT NOT NULL,
  fecha TEXT NOT NULL,
  monto REAL NOT NULL CHECK(monto > 0),
  metodo_pago TEXT DEFAULT 'efectivo' CHECK(metodo_pago IN ('efectivo','transferencia','tarjeta','cheque')),
  beneficiario TEXT,
  comprobante_url TEXT,
  factura_numero TEXT,
  notas TEXT,
  registrado_por TEXT REFERENCES miembros(id),
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE ejecucion_presupuesto (
  id TEXT PRIMARY KEY,
  presupuesto_id TEXT NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK(mes BETWEEN 1 AND 12),
  monto_ejecutado REAL DEFAULT 0,
  notas TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(presupuesto_id, mes)
);
CREATE TABLE espacios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  capacidad INTEGER NOT NULL,
  ubicacion TEXT,
  equipamiento TEXT DEFAULT '[]',
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE eventos (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('culto_regular','conferencia','retiro','actividad_especial','capacitacion')),
  descripcion TEXT,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT,
  espacio_id TEXT REFERENCES espacios(id),
  responsable_id TEXT REFERENCES miembros(id),
  cupo_maximo INTEGER,
  requiere_inscripcion INTEGER DEFAULT 0,
  costo REAL DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',
  estado TEXT DEFAULT 'programado' CHECK(estado IN ('programado','en_curso','completado','cancelado')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE grupos_celulares (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  lider_id TEXT REFERENCES miembros(id),
  colider_id TEXT REFERENCES miembros(id),
  direccion TEXT,
  barrio TEXT,
  ciudad TEXT,
  dia_semana TEXT,
  hora TEXT,
  descripcion TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE historial_liderazgo (
  id TEXT PRIMARY KEY,
  ministerio_id TEXT NOT NULL REFERENCES ministerios(id) ON DELETE CASCADE,
  lider_id TEXT NOT NULL REFERENCES miembros(id),
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE inscripciones_evento (
  id TEXT PRIMARY KEY,
  evento_id TEXT NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  miembro_id TEXT NOT NULL REFERENCES miembros(id),
  fecha_inscripcion TEXT DEFAULT (datetime('now')),
  asistio INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(evento_id, miembro_id)
);
CREATE TABLE logs_auditoria (
  id TEXT PRIMARY KEY,
  usuario_id TEXT REFERENCES usuarios(id),
  miembro_id TEXT REFERENCES miembros(id),
  accion TEXT NOT NULL,
  entidad TEXT,
  entidad_id TEXT,
  detalles TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE mantenimientos (
  id TEXT PRIMARY KEY,
  activo_id TEXT NOT NULL REFERENCES activos(id),
  tipo TEXT DEFAULT 'preventivo' CHECK(tipo IN ('preventivo','correctivo','predictivo')),
  descripcion TEXT NOT NULL,
  fecha TEXT NOT NULL,
  proveedor TEXT,
  costo REAL,
  proximo_mantenimiento TEXT,
  notas TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE metas_recaudacion (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  monto_meta REAL NOT NULL,
  monto_actual REAL DEFAULT 0,
  fecha_inicio TEXT,
  fecha_fin TEXT,
  activa INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE miembros (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  cedula TEXT UNIQUE,
  pasaporte TEXT,
  fecha_nacimiento TEXT,
  direccion TEXT,
  telefono TEXT,
  telefono_alternativo TEXT,
  email TEXT,
  foto_url TEXT,
  estado_civil TEXT CHECK(estado_civil IN ('soltero','casado','divorciado','viudo','union_libre')),
  conyuge_id TEXT REFERENCES miembros(id),
  ocupacion TEXT,
  fecha_conversion TEXT,
  fecha_membresia TEXT,
  estado TEXT DEFAULT 'activo' CHECK(estado IN ('activo','inactivo','visitante','transferido','fallecido')),
  notas TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE miembros_grupo_celular (
  id TEXT PRIMARY KEY,
  grupo_id TEXT NOT NULL REFERENCES grupos_celulares(id) ON DELETE CASCADE,
  miembro_id TEXT NOT NULL REFERENCES miembros(id),
  fecha_inicio TEXT DEFAULT (date('now')),
  fecha_fin TEXT,
  activo INTEGER DEFAULT 1,
  UNIQUE(grupo_id, miembro_id)
);
CREATE TABLE miembros_ministerio (
  id TEXT PRIMARY KEY,
  ministerio_id TEXT NOT NULL REFERENCES ministerios(id) ON DELETE CASCADE,
  miembro_id TEXT NOT NULL REFERENCES miembros(id),
  rol TEXT DEFAULT 'miembro',
  fecha_inicio TEXT DEFAULT (date('now')),
  fecha_fin TEXT,
  activo INTEGER DEFAULT 1,
  UNIQUE(ministerio_id, miembro_id)
);
CREATE TABLE ministerios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  lider_id TEXT REFERENCES miembros(id),
  email TEXT,
  telefono TEXT,
  presupuesto_anual REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE movimientos_caja (
  id TEXT PRIMARY KEY,
  caja_id TEXT NOT NULL REFERENCES caja_chica(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK(tipo IN ('apertura','ingreso','egreso','cierre')),
  monto REAL NOT NULL,
  descripcion TEXT,
  referencia_id TEXT,
  referencia_tipo TEXT,
  registrado_por TEXT REFERENCES miembros(id),
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE ofrendas (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK(tipo IN ('ordinaria','especial','misionera','construccion','evento')),
  descripcion TEXT,
  fecha TEXT NOT NULL,
  monto REAL NOT NULL CHECK(monto > 0),
  metodo_pago TEXT DEFAULT 'efectivo' CHECK(metodo_pago IN ('efectivo','transferencia','tarjeta','cheque')),
  donante_nombre TEXT,
  donante_id TEXT REFERENCES miembros(id),
  recibo_numero TEXT UNIQUE,
  notas TEXT,
  registrado_por TEXT REFERENCES miembros(id),
  created_at TEXT DEFAULT (datetime('now'))
, servicio_id TEXT REFERENCES servicios(id));
CREATE TABLE peticiones_oracion (
  id TEXT PRIMARY KEY,
  miembro_id TEXT NOT NULL REFERENCES miembros(id),
  titulo TEXT,
  descripcion TEXT NOT NULL,
  es_anonimo INTEGER DEFAULT 0,
  intercesor_id TEXT REFERENCES miembros(id),
  estado TEXT DEFAULT 'activa' CHECK(estado IN ('activa','respondida','cerrada')),
  respuesta TEXT,
  fecha_respuesta TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE plantillas_mensajes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  asunto TEXT,
  cuerpo TEXT NOT NULL,
  tipo TEXT DEFAULT 'email' CHECK(tipo IN ('email','whatsapp','ambos')),
  variables TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE prestamos_activos (
  id TEXT PRIMARY KEY,
  activo_id TEXT NOT NULL REFERENCES activos(id),
  solicitante_id TEXT NOT NULL REFERENCES miembros(id),
  autorizado_por TEXT REFERENCES miembros(id),
  fecha_salida TEXT NOT NULL,
  fecha_devolucion_esperada TEXT,
  fecha_devolucion_real TEXT,
  estado TEXT DEFAULT 'activo' CHECK(estado IN ('activo','devuelto','vencido')),
  proposito TEXT,
  notas_devolucion TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE presupuestos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  ministerio_id TEXT,
  ano INTEGER NOT NULL,
  monto_total REAL NOT NULL,
  descripcion TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE primicias (
  id TEXT PRIMARY KEY,
  miembro_id TEXT REFERENCES miembros(id),
  fecha TEXT NOT NULL,
  monto REAL NOT NULL CHECK(monto > 0),
  tipo_periodo TEXT DEFAULT 'mensual' CHECK(tipo_periodo IN ('mensual','anual','especial')),
  periodo_referencia TEXT,
  metodo_pago TEXT DEFAULT 'efectivo' CHECK(metodo_pago IN ('efectivo','transferencia','tarjeta','cheque')),
  recibo_numero TEXT UNIQUE,
  notas TEXT,
  registrado_por TEXT REFERENCES miembros(id),
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE recordatorios_evento (
  id TEXT PRIMARY KEY,
  evento_id TEXT NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  dias_antes INTEGER NOT NULL,
  tipo_mensaje TEXT DEFAULT 'email' CHECK(tipo_mensaje IN ('email','whatsapp','ambos')),
  enviado INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE recursos_ministerio (
  id TEXT PRIMARY KEY,
  ministerio_id TEXT NOT NULL REFERENCES ministerios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT,
  descripcion TEXT,
  cantidad INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE relaciones_familiares (
  id TEXT PRIMARY KEY,
  miembro_id TEXT NOT NULL REFERENCES miembros(id) ON DELETE CASCADE,
  familiar_id TEXT NOT NULL REFERENCES miembros(id) ON DELETE CASCADE,
  parentesco TEXT NOT NULL CHECK(parentesco IN ('conyuge','hijo','hija','padre','madre','hermano','hermana','abuelo','abuela','nieto','nieta','tio','tia','primo','prima','otro')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(miembro_id, familiar_id)
);
CREATE TABLE reuniones_ministerio (
  id TEXT PRIMARY KEY,
  ministerio_id TEXT NOT NULL REFERENCES ministerios(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL,
  hora TEXT,
  tema TEXT,
  acta TEXT,
  compromisos TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE servicios (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL DEFAULT 'culto_domingo',
  fecha TEXT NOT NULL,
  hora TEXT,
  titulo TEXT,
  predicador TEXT,
  notas TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE sesiones_consejeria (
  id TEXT PRIMARY KEY,
  miembro_id TEXT NOT NULL REFERENCES miembros(id),
  consejero_id TEXT REFERENCES miembros(id),
  fecha TEXT NOT NULL,
  tipo TEXT DEFAULT 'individual',
  motivo TEXT,
  notas_confidenciales TEXT,
  compromisos TEXT,
  proxima_sesion TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE situaciones_especiales (
  id TEXT PRIMARY KEY,
  miembro_id TEXT NOT NULL REFERENCES miembros(id),
  tipo TEXT NOT NULL CHECK(tipo IN ('hospitalizacion','duelo','crisis','enfermedad','otro')),
  descripcion TEXT NOT NULL,
  nivel_urgencia TEXT DEFAULT 'media' CHECK(nivel_urgencia IN ('baja','media','alta','critica')),
  fecha_inicio TEXT NOT NULL,
  fecha_resolucion TEXT,
  estado TEXT DEFAULT 'activa' CHECK(estado IN ('activa','seguimiento','resuelta')),
  notas_seguimiento TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE usuarios (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'miembro' CHECK(rol IN ('administrador','pastor','lider','secretaria','miembro','ujier')),
  miembro_id TEXT UNIQUE REFERENCES miembros(id) ON DELETE SET NULL,
  activo INTEGER DEFAULT 1,
  ultimo_acceso TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE visitas_pastorales (
  id TEXT PRIMARY KEY,
  miembro_id TEXT NOT NULL REFERENCES miembros(id),
  pastor_id TEXT REFERENCES miembros(id),
  fecha TEXT NOT NULL,
  motivo TEXT NOT NULL,
  observaciones TEXT,
  proximo_seguimiento TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','completada','cancelada')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE voluntarios (
  id TEXT PRIMARY KEY,
  miembro_id TEXT NOT NULL REFERENCES miembros(id),
  habilidades TEXT DEFAULT '[]',
  disponibilidad TEXT DEFAULT '{}',
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(miembro_id)
);
CREATE TABLE voluntarios_evento (
  id TEXT PRIMARY KEY,
  evento_id TEXT NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  voluntario_id TEXT NOT NULL REFERENCES miembros(id),
  tarea TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_asistencia_servicio ON asistencia_servicio(servicio_id);
CREATE INDEX idx_bautismos_miembro ON bautismos(miembro_id);
CREATE INDEX idx_diezmos_fecha ON diezmos(fecha);
CREATE INDEX idx_diezmos_miembro ON diezmos(miembro_id);
CREATE INDEX idx_diezmos_servicio ON diezmos(servicio_id);
CREATE INDEX idx_egresos_fecha ON egresos(fecha);
CREATE INDEX idx_eventos_fecha ON eventos(fecha_inicio);
CREATE INDEX idx_logs_fecha ON logs_auditoria(created_at);
CREATE INDEX idx_miembros_estado ON miembros(estado);
CREATE INDEX idx_miembros_nombre ON miembros(nombre, apellido);
CREATE INDEX idx_ofrendas_fecha ON ofrendas(fecha);
CREATE INDEX idx_ofrendas_servicio ON ofrendas(servicio_id);
CREATE INDEX idx_peticiones_estado ON peticiones_oracion(estado);
CREATE INDEX idx_primicias_fecha ON primicias(fecha);
CREATE INDEX idx_usuarios_email ON usuarios(email);
