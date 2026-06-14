import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Heart, Users, Cross, Church, AlertTriangle, Plus, X, Phone, Calendar } from 'lucide-react';

const TABS = [
  { id: 'visitas', label: 'Visitas', icon: Heart },
  { id: 'consejeria', label: 'Consejería', icon: Users },
  { id: 'bautismos', label: 'Bautismos', icon: Cross },
  { id: 'oracion', label: 'Oración', icon: Church },
  { id: 'situaciones', label: 'Situaciones', icon: AlertTriangle },
];

export default function Pastoral() {
  const [tab, setTab] = useState('visitas');
  const [visits, setVisits] = useState([]);
  const [counseling, setCounseling] = useState([]);
  const [baptisms, setBaptisms] = useState([]);
  const [prayers, setPrayers] = useState([]);
  const [situations, setSituations] = useState([]);
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const { hasRole, user } = useAuth();
  const canEdit = hasRole('administrador', 'pastor');

  const load = () => {
    api.get('/pastoral/visits').then(({ data }) => setVisits(data)).catch(console.error);
    api.get('/pastoral/counseling').then(({ data }) => setCounseling(data)).catch(console.error);
    api.get('/pastoral/baptisms').then(({ data }) => setBaptisms(data)).catch(console.error);
    api.get('/pastoral/prayers').then(({ data }) => setPrayers(data)).catch(console.error);
    api.get('/pastoral/situations').then(({ data }) => setSituations(data)).catch(console.error);
    api.get('/members', { params: { limit: 200 } }).then(({ data }) => setMembers(data.data)).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const formDefaults = {
    visita: { miembro_id: '', fecha: new Date().toISOString().split('T')[0], motivo: '', observaciones: '', proximo_seguimiento: '', estado: 'pendiente' },
    consejeria: { miembro_id: '', fecha: new Date().toISOString().split('T')[0], tipo: 'individual', motivo: '', notas_confidenciales: '', compromisos: '', proxima_sesion: '' },
    bautismo: { miembro_id: '', tipo: 'agua', fecha: new Date().toISOString().split('T')[0], pastor_id: '', iglesia_origen: '', notas: '' },
    oracion: { titulo: '', descripcion: '', es_anonimo: false },
    situacion: { miembro_id: '', tipo: 'otro', descripcion: '', nivel_urgencia: 'media', fecha_inicio: new Date().toISOString().split('T')[0] },
  };

  const openForm = (type, item = null) => {
    setForm(item ? { ...formDefaults[type], ...item } : formDefaults[type]);
    setEditItem(item?.id || null);
    setShowForm(type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoints = {
        visita: editItem ? `/pastoral/visits/${editItem}` : '/pastoral/visits',
        consejeria: '/pastoral/counseling',
        bautismo: '/pastoral/baptisms',
        oracion: '/pastoral/prayers',
        situacion: '/pastoral/situations',
      };
      const method = editItem ? 'put' : 'post';
      await api[method](endpoints[showForm], form);
      setShowForm(null);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleComplete = async (type, id, data) => {
    try {
      if (type === 'visita') await api.put(`/pastoral/visits/${id}`, data);
      else if (type === 'oracion') await api.put(`/pastoral/prayers/${id}`, data);
      else if (type === 'situacion') await api.put(`/pastoral/situations/${id}`, data);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const renderForm = () => {
    const base = (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(null)}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold dark:text-white">
              {showForm === 'visita' ? 'Nueva Visita' : showForm === 'consejeria' ? 'Nueva Sesión' : showForm === 'bautismo' ? 'Nuevo Bautismo' : showForm === 'oracion' ? 'Nueva Petición' : 'Nueva Situación'}
            </h3>
            <button onClick={() => setShowForm(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            {showForm !== 'oracion' && (
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Miembro</label>
                <select className="input-field" value={form.miembro_id || ''} onChange={e => setForm(f => ({ ...f, miembro_id: e.target.value }))} required>
                  <option value="">Seleccionar</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                </select></div>
            )}
            {showForm === 'visita' && (
              <><div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Fecha</label>
                <input type="date" className="input-field" value={form.fecha || ''} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Motivo</label>
                  <textarea className="input-field" rows="2" value={form.motivo || ''} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} required /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Observaciones</label>
                  <textarea className="input-field" rows="2" value={form.observaciones || ''} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Próximo Seguimiento</label>
                  <input type="date" className="input-field" value={form.proximo_seguimiento || ''} onChange={e => setForm(f => ({ ...f, proximo_seguimiento: e.target.value }))} /></div>
              </>
            )}
            {showForm === 'consejeria' && (
              <><div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Fecha</label>
                <input type="date" className="input-field" value={form.fecha || ''} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Tipo</label>
                  <select className="input-field" value={form.tipo || 'individual'} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="individual">Individual</option>
                    <option value="pareja">Pareja</option>
                    <option value="familiar">Familiar</option>
                    <option value="grupal">Grupal</option>
                  </select></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Motivo</label>
                  <textarea className="input-field" rows="2" value={form.motivo || ''} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Notas (confidencial)</label>
                  <textarea className="input-field" rows="2" value={form.notas_confidenciales || ''} onChange={e => setForm(f => ({ ...f, notas_confidenciales: e.target.value }))} /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Compromisos</label>
                  <textarea className="input-field" rows="2" value={form.compromisos || ''} onChange={e => setForm(f => ({ ...f, compromisos: e.target.value }))} /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Próxima Sesión</label>
                  <input type="date" className="input-field" value={form.proxima_sesion || ''} onChange={e => setForm(f => ({ ...f, proxima_sesion: e.target.value }))} /></div>
              </>
            )}
            {showForm === 'bautismo' && (
              <><div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Tipo</label>
                <select className="input-field" value={form.tipo || 'agua'} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="agua">Agua</option>
                  <option value="espiritu_santo">Espíritu Santo</option>
                </select></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Fecha</label>
                  <input type="date" className="input-field" value={form.fecha || ''} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Pastor</label>
                  <select className="input-field" value={form.pastor_id || ''} onChange={e => setForm(f => ({ ...f, pastor_id: e.target.value }))}>
                    <option value="">Seleccionar</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Iglesia de Origen</label>
                  <input className="input-field" value={form.iglesia_origen || ''} onChange={e => setForm(f => ({ ...f, iglesia_origen: e.target.value }))} /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Notas</label>
                  <textarea className="input-field" rows="2" value={form.notas || ''} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></div>
              </>
            )}
            {showForm === 'oracion' && (
              <><div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Título</label>
                <input className="input-field" value={form.titulo || ''} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Descripción</label>
                  <textarea className="input-field" rows="3" value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} required /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.es_anonimo} onChange={e => setForm(f => ({ ...f, es_anonimo: e.target.checked }))} /> Anónimo</label>
              </>
            )}
            {showForm === 'situacion' && (
              <><div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Tipo</label>
                <select className="input-field" value={form.tipo || 'otro'} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="hospitalizacion">Hospitalización</option>
                  <option value="duelo">Duelo</option>
                  <option value="crisis">Crisis</option>
                  <option value="enfermedad">Enfermedad</option>
                  <option value="otro">Otro</option>
                </select></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Urgencia</label>
                  <select className="input-field" value={form.nivel_urgencia || 'media'} onChange={e => setForm(f => ({ ...f, nivel_urgencia: e.target.value }))}>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Fecha Inicio</label>
                  <input type="date" className="input-field" value={form.fecha_inicio || ''} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} required /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Descripción</label>
                  <textarea className="input-field" rows="3" value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} required /></div>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(null)} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      </div>
    );
    return base;
  };

  return (
    <div className="space-y-4">
      {showForm && renderForm()}

      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium ${tab === t.id ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'visitas' && (
        <><div className="flex justify-end">{canEdit && <button onClick={() => openForm('visita')} className="btn-primary text-sm"><Plus className="w-4 h-4 inline mr-1" />Nueva Visita</button>}</div>
          <div className="grid gap-3">{visits.map(v => (
            <div key={v.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold dark:text-white">{v.miembro_nombre}</p>
                  <p className="text-sm text-gray-500">{new Date(v.fecha).toLocaleDateString('es-ES')} — {v.motivo}</p>
                  {v.observaciones && <p className="text-sm text-gray-400 mt-1">{v.observaciones}</p>}
                  {v.proximo_seguimiento && <p className="text-xs text-primary-600 mt-1">Seguimiento: {new Date(v.proximo_seguimiento).toLocaleDateString('es-ES')}</p>}
                </div>
                <div className="text-right">
                  <span className={`badge-${v.estado === 'completada' ? 'success' : v.estado === 'cancelada' ? 'danger' : 'warning'}`}>{v.estado}</span>
                  {canEdit && v.estado === 'pendiente' && <button onClick={() => handleComplete('visita', v.id, { estado: 'completada' })} className="block mt-2 text-xs text-primary-600 hover:text-primary-700">Completar</button>}
                </div>
              </div>
            </div>
          ))}</div>
        </>
      )}

      {tab === 'consejeria' && (
        <><div className="flex justify-end">{canEdit && <button onClick={() => openForm('consejeria')} className="btn-primary text-sm"><Plus className="w-4 h-4 inline mr-1" />Nueva Sesión</button>}</div>
          <div className="grid gap-3">{counseling.map(s => (
            <div key={s.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold dark:text-white">{s.miembro_nombre}</p>
                  <p className="text-sm text-gray-500">{new Date(s.fecha).toLocaleDateString('es-ES')} — {s.tipo}{s.consejero_nombre ? ` — ${s.consejero_nombre}` : ''}</p>
                  {s.motivo && <p className="text-sm text-gray-400 mt-1">{s.motivo}</p>}
                  {s.proxima_sesion && <p className="text-xs text-primary-600 mt-1">Próxima: {new Date(s.proxima_sesion).toLocaleDateString('es-ES')}</p>}
                </div>
              </div>
            </div>
          ))}</div>
        </>
      )}

      {tab === 'bautismos' && (
        <><div className="flex justify-end">{canEdit && <button onClick={() => openForm('bautismo')} className="btn-primary text-sm"><Plus className="w-4 h-4 inline mr-1" />Nuevo Bautismo</button>}</div>
          <div className="grid gap-3">{baptisms.map(b => (
            <div key={b.id} className="card">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"><Cross className="w-5 h-5 text-blue-600" /></div>
                <div className="flex-1">
                  <p className="font-semibold dark:text-white">{b.miembro_nombre}</p>
                  <p className="text-sm text-gray-500">{new Date(b.fecha).toLocaleDateString('es-ES')} — {b.tipo === 'agua' ? 'Agua' : 'Espíritu Santo'}</p>
                  {b.pastor_nombre && <p className="text-xs text-gray-400">Pastor: {b.pastor_nombre}</p>}
                </div>
              </div>
            </div>
          ))}</div>
        </>
      )}

      {tab === 'oracion' && (
        <><div className="flex justify-end">{canEdit && <button onClick={() => openForm('oracion')} className="btn-primary text-sm"><Plus className="w-4 h-4 inline mr-1" />Nueva Petición</button>}</div>
          <div className="grid gap-3">{prayers.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {p.titulo && <h4 className="font-semibold dark:text-white">{p.titulo}</h4>}
                    <span className={`badge-${p.estado === 'respondida' ? 'success' : p.estado === 'cerrada' ? 'danger' : 'warning'}`}>{p.estado}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{p.descripcion}</p>
                  {!p.es_anonimo && p.miembro_nombre && <p className="text-xs text-gray-400 mt-1">— {p.miembro_nombre}</p>}
                  {p.respuesta && <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm"><span className="font-medium">Respuesta: </span>{p.respuesta}</div>}
                </div>
                {canEdit && p.estado === 'activa' && <button onClick={() => {
                  const r = prompt('Respuesta (dejar vacío para marcar como cerrada):');
                  handleComplete('oracion', p.id, { estado: r ? 'respondida' : 'cerrada', respuesta: r || null });
                }} className="text-xs text-primary-600 hover:text-primary-700 ml-2">Responder</button>}
              </div>
            </div>
          ))}</div>
        </>
      )}

      {tab === 'situaciones' && (
        <><div className="flex justify-end">{canEdit && <button onClick={() => openForm('situacion')} className="btn-primary text-sm"><Plus className="w-4 h-4 inline mr-1" />Nueva Situación</button>}</div>
          <div className="grid gap-3">{situations.map(s => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`badge-${s.nivel_urgencia === 'critica' || s.nivel_urgencia === 'alta' ? 'danger' : s.nivel_urgencia === 'media' ? 'warning' : 'info'}`}>{s.nivel_urgencia}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">{s.tipo}</span>
                    <span className={`badge-${s.estado === 'resuelta' ? 'success' : s.estado === 'seguimiento' ? 'warning' : 'info'}`}>{s.estado}</span>
                  </div>
                  <p className="font-semibold dark:text-white mt-1">{s.miembro_nombre}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{s.descripcion}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(s.fecha_inicio).toLocaleDateString('es-ES')}</p>
                </div>
                {canEdit && s.estado !== 'resuelta' && <button onClick={() => handleComplete('situacion', s.id, { estado: 'resuelta' })} className="text-xs text-primary-600 hover:text-primary-700">Resolver</button>}
              </div>
            </div>
          ))}</div>
        </>
      )}
    </div>
  );
}
