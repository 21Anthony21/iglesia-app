import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, X, Users, MapPin, Clock } from 'lucide-react';

const TIPO_LABELS = { culto_regular: 'Culto Regular', conferencia: 'Conferencia', retiro: 'Retiro', actividad_especial: 'Actividad Especial', capacitacion: 'Capacitación' };
const TIPO_COLORS = { culto_regular: '#3b82f6', conferencia: '#8b5cf6', retiro: '#10b981', actividad_especial: '#f59e0b', capacitacion: '#ef4444' };
const ESTADO_LABELS = { programado: 'Programado', en_curso: 'En Curso', completado: 'Completado', cancelado: 'Cancelado' };

export default function Events() {
  const [eventos, setEventos] = useState([]);
  const [detail, setDetail] = useState(null);
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ titulo: '', tipo: 'culto_regular', descripcion: '', fecha_inicio: '', fecha_fin: '', responsable_id: '', cupo_maximo: '', costo: '', color: '#3b82f6', estado: 'programado' });
  const [saving, setSaving] = useState(false);
  const { hasRole } = useAuth();
  const canEdit = hasRole('administrador', 'pastor');

  const load = () => {
    api.get('/eventos').then(({ data }) => setEventos(data)).catch(console.error);
    api.get('/members', { params: { limit: 200 } }).then(({ data }) => setMembers(data.data)).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const openForm = (item = null) => {
    if (item) {
      setForm({
        titulo: item.titulo, tipo: item.tipo, descripcion: item.descripcion || '',
        fecha_inicio: item.fecha_inicio ? item.fecha_inicio.slice(0, 16) : '',
        fecha_fin: item.fecha_fin ? item.fecha_fin.slice(0, 16) : '',
        responsable_id: item.responsable_id || '', cupo_maximo: item.cupo_maximo || '',
        costo: item.costo || '', color: item.color || '#3b82f6', estado: item.estado || 'programado'
      });
      setEditItem(item.id);
    } else {
      setForm({ titulo: '', tipo: 'culto_regular', descripcion: '', fecha_inicio: '', fecha_fin: '', responsable_id: '', cupo_maximo: '', costo: '', color: '#3b82f6', estado: 'programado' });
      setEditItem(null);
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo || !form.fecha_inicio) return;
    setSaving(true);
    try {
      if (editItem) await api.put(`/eventos/${editItem}`, form);
      else await api.post('/eventos', form);
      setShowForm(false);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const openDetail = async (id) => {
    const { data } = await api.get(`/eventos/${id}`);
    setDetail(data);
  };

  const handleRegister = async () => {
    const miembroId = prompt('ID del miembro a inscribir:');
    if (!miembroId) return;
    try {
      await api.post(`/eventos/${detail.id}/register`, { miembro_id: miembroId });
      const { data } = await api.get(`/eventos/${detail.id}`);
      setDetail(data);
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const handleUnregister = async (miembroId) => {
    if (!confirm('¿Cancelar inscripción?')) return;
    try {
      await api.delete(`/eventos/${detail.id}/register/${miembroId}`);
      const { data } = await api.get(`/eventos/${detail.id}`);
      setDetail(data);
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este evento?')) return;
    try { await api.delete(`/eventos/${id}`); setDetail(null); load(); }
    catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  if (detail) {
    return (
      <div className="space-y-4">
        <button onClick={() => setDetail(null)} className="text-primary-600 hover:text-primary-700 text-sm font-medium">&larr; Volver a eventos</button>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-info">{TIPO_LABELS[detail.tipo] || detail.tipo}</span>
                <span className={`badge-${detail.estado === 'completado' ? 'success' : detail.estado === 'cancelado' ? 'danger' : 'warning'}`}>{ESTADO_LABELS[detail.estado]}</span>
              </div>
              <h3 className="text-xl font-bold dark:text-white">{detail.titulo}</h3>
              {detail.descripcion && <p className="text-sm text-gray-500 mt-1">{detail.descripcion}</p>}
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(detail.fecha_inicio).toLocaleDateString('es-ES')}</span>
                {detail.responsable_nombre && <span className="flex items-center gap-1"><Users className="w-4 h-4" />{detail.responsable_nombre}</span>}
                {detail.cupo_maximo && <span>Cupo: {detail.cupo_maximo}</span>}
                {detail.costo > 0 && <span>Costo: ${detail.costo}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              {canEdit && <button onClick={() => openForm(detail)} className="btn-secondary text-sm">Editar</button>}
              {hasRole('administrador') && <button onClick={() => handleDelete(detail.id)} className="btn-secondary text-sm text-red-600">Eliminar</button>}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold dark:text-white">Inscripciones ({detail.inscripciones?.length || 0})</h4>
            {canEdit && <button onClick={handleRegister} className="btn-primary text-sm"><Plus className="w-4 h-4 inline mr-1" />Inscribir Miembro</button>}
          </div>
          {detail.inscripciones?.length > 0 ? (
            <div className="space-y-2">
              {detail.inscripciones.map(ins => (
                <div key={ins.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium dark:text-white">{ins.nombre} {ins.apellido}</p>
                    <p className="text-xs text-gray-500">{ins.email || ins.telefono || 'Sin contacto'}</p>
                  </div>
                  {canEdit && <button onClick={() => handleUnregister(ins.miembro_id)} className="text-red-500 text-sm hover:text-red-700">Cancelar</button>}
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-center py-4">No hay inscripciones</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold dark:text-white">{editItem ? 'Editar Evento' : 'Nuevo Evento'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Título *</label>
                <input className="input-field" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} required /></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Tipo</label>
                <select className="input-field" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Descripción</label>
                <textarea className="input-field" rows="2" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Fecha Inicio *</label>
                <input type="datetime-local" className="input-field" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} required /></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Fecha Fin</label>
                <input type="datetime-local" className="input-field" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Responsable</label>
                <select className="input-field" value={form.responsable_id} onChange={e => setForm(f => ({ ...f, responsable_id: e.target.value }))}>
                  <option value="">Seleccionar</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Cupo Máximo</label>
                  <input type="number" className="input-field" value={form.cupo_maximo} onChange={e => setForm(f => ({ ...f, cupo_maximo: e.target.value }))} /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Costo ($)</label>
                  <input type="number" className="input-field" value={form.costo} onChange={e => setForm(f => ({ ...f, costo: e.target.value }))} /></div>
              </div>
              {editItem && (
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Estado</label>
                  <select className="input-field" value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                    {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold dark:text-white">Eventos</h2>
        {canEdit && <button onClick={() => openForm()} className="btn-primary text-sm"><Plus className="w-4 h-4 inline mr-1" />Nuevo Evento</button>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {eventos.map(e => (
          <div key={e.id} className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(e.id)}>
            <div className="flex items-start gap-3">
              <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: e.color || '#3b82f6' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: (e.color || '#3b82f6') + '20', color: e.color || '#3b82f6' }}>{TIPO_LABELS[e.tipo] || e.tipo}</span>
                  <span className={`text-xs ${e.estado === 'completado' ? 'text-green-600' : e.estado === 'cancelado' ? 'text-red-600' : 'text-yellow-600'}`}>{ESTADO_LABELS[e.estado]}</span>
                </div>
                <p className="font-semibold dark:text-white truncate">{e.titulo}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(e.fecha_inicio).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold">{e.inscritos || 0}</p>
                <p className="text-xs text-gray-400">{e.cupo_maximo ? `/ ${e.cupo_maximo}` : 'inscritos'}</p>
              </div>
            </div>
          </div>
        ))}
        {eventos.length === 0 && <div className="col-span-full card text-center py-10 text-gray-400">No hay eventos registrados</div>}
      </div>
    </div>
  );
}
