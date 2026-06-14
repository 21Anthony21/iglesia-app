import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, X, UserPlus, Trash2 } from 'lucide-react';

export default function Ministerios() {
  const [ministerios, setMinisterios] = useState([]);
  const [detail, setDetail] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', lider_id: '', email: '', telefono: '', presupuesto_anual: '' });
  const [members, setMembers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberList, setMemberList] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [saving, setSaving] = useState(false);
  const { hasRole } = useAuth();
  const canEdit = hasRole('administrador', 'pastor');

  const load = () => {
    api.get('/ministerios').then(({ data }) => setMinisterios(data)).catch(console.error);
    api.get('/members', { params: { limit: 200 } }).then(({ data }) => setMembers(data.data)).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const openForm = (item = null) => {
    if (item) {
      setForm({ nombre: item.nombre, descripcion: item.descripcion || '', lider_id: item.lider_id || '', email: item.email || '', telefono: item.telefono || '', presupuesto_anual: item.presupuesto_anual || '' });
      setEditItem(item.id);
    } else {
      setForm({ nombre: '', descripcion: '', lider_id: '', email: '', telefono: '', presupuesto_anual: '' });
      setEditItem(null);
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre) return;
    setSaving(true);
    try {
      if (editItem) await api.put(`/ministerios/${editItem}`, form);
      else await api.post('/ministerios', form);
      setShowForm(false);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const openDetail = async (id) => {
    const { data } = await api.get(`/ministerios/${id}`);
    setDetail(data);
  };

  const handleAddMember = async () => {
    if (!selectedMember) return;
    try {
      await api.post(`/ministerios/${detail.id}/members`, { miembro_id: selectedMember });
      setShowAddMember(false);
      setSelectedMember('');
      const { data } = await api.get(`/ministerios/${detail.id}`);
      setDetail(data);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Error al agregar miembro'); }
  };

  const handleRemoveMember = async (miembroId) => {
    if (!confirm('¿Remover este miembro del ministerio?')) return;
    try {
      await api.delete(`/ministerios/${detail.id}/members/${miembroId}`);
      const { data } = await api.get(`/ministerios/${detail.id}`);
      setDetail(data);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Error al remover miembro'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este ministerio?')) return;
    try {
      await api.delete(`/ministerios/${id}`);
      setDetail(null);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Error al eliminar'); }
  };

  if (detail) {
    return (
      <div className="space-y-4">
        <button onClick={() => setDetail(null)} className="text-primary-600 hover:text-primary-700 text-sm font-medium">&larr; Volver a ministerios</button>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold dark:text-white">{detail.nombre}</h3>
              {detail.descripcion && <p className="text-sm text-gray-500">{detail.descripcion}</p>}
              {detail.email && <p className="text-sm text-gray-500">{detail.email}</p>}
              {detail.telefono && <p className="text-sm text-gray-500">{detail.telefono}</p>}
              {detail.presupuesto_anual > 0 && <p className="text-sm font-medium text-gray-500">Presupuesto: ${parseFloat(detail.presupuesto_anual).toLocaleString()}</p>}
            </div>
            <div className="flex gap-2">
              {canEdit && <button onClick={() => openForm(detail)} className="btn-secondary text-sm">Editar</button>}
              {hasRole('administrador') && <button onClick={() => handleDelete(detail.id)} className="btn-secondary text-sm text-red-600">Eliminar</button>}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold dark:text-white">Miembros ({detail.miembros?.length || 0})</h4>
            {canEdit && <button onClick={() => { setShowAddMember(true); setSelectedMember(''); }} className="btn-primary text-sm"><UserPlus className="w-4 h-4 inline mr-1" />Agregar Miembro</button>}
          </div>
          {showAddMember && (
            <div className="flex gap-2 mb-3">
              <select className="input-field flex-1" value={selectedMember} onChange={e => setSelectedMember(e.target.value)}>
                <option value="">Seleccionar miembro</option>
                {members.filter(m => !detail.miembros?.some(dm => dm.miembro_id === m.id)).map(m => (
                  <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
                ))}
              </select>
              <button onClick={handleAddMember} className="btn-primary text-sm">Agregar</button>
              <button onClick={() => setShowAddMember(false)} className="btn-secondary text-sm">Cancelar</button>
            </div>
          )}
          {detail.miembros?.length > 0 ? (
            <div className="space-y-2">
              {detail.miembros.map(mm => (
                <div key={mm.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium dark:text-white">{mm.nombre} {mm.apellido}</p>
                    <p className="text-xs text-gray-500">{mm.rol} {mm.email && `— ${mm.email}`}</p>
                  </div>
                  {canEdit && <button onClick={() => handleRemoveMember(mm.miembro_id)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>}
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-center py-4">No hay miembros en este ministerio</p>}
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
              <h3 className="text-lg font-semibold dark:text-white">{editItem ? 'Editar Ministerio' : 'Nuevo Ministerio'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Nombre *</label>
                <input className="input-field" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required /></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Descripción</label>
                <textarea className="input-field" rows="2" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Líder</label>
                <select className="input-field" value={form.lider_id} onChange={e => setForm(f => ({ ...f, lider_id: e.target.value }))}>
                  <option value="">Seleccionar líder</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Email</label>
                  <input type="email" className="input-field" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Teléfono</label>
                  <input className="input-field" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Presupuesto Anual ($)</label>
                <input type="number" className="input-field" value={form.presupuesto_anual} onChange={e => setForm(f => ({ ...f, presupuesto_anual: e.target.value }))} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold dark:text-white">Ministerios</h2>
        {canEdit && <button onClick={() => openForm()} className="btn-primary text-sm"><Plus className="w-4 h-4 inline mr-1" />Nuevo Ministerio</button>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {ministerios.map(m => (
          <div key={m.id} className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(m.id)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold dark:text-white">{m.nombre}</p>
                {m.descripcion && <p className="text-sm text-gray-500 mt-1">{m.descripcion}</p>}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary-600">{m.cantidad_miembros || 0}</p>
                <p className="text-xs text-gray-400">miembros</p>
              </div>
            </div>
          </div>
        ))}
        {ministerios.length === 0 && <div className="col-span-full card text-center py-10 text-gray-400">No hay ministerios registrados</div>}
      </div>
    </div>
  );
}
