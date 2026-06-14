import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Shield, Plus, X, UserCheck, UserX } from 'lucide-react';

const ROLE_LABELS = { administrador: 'Administrador', pastor: 'Pastor', secretaria: 'Secretaria', ujier: 'Ujier', lider: 'Líder', miembro: 'Miembro' };
const ROLE_COLORS = { administrador: 'red', pastor: 'purple', secretaria: 'blue', ujier: 'green', lider: 'amber', miembro: 'gray' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', rol: 'ujier', miembro_id: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/users').then(({ data }) => setUsers(data)).catch(console.error);
    api.get('/members', { params: { limit: 200 } }).then(({ data }) => setMembers(data.data)).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const openForm = (user = null) => {
    if (user) {
      setForm({ email: user.email, password: '', rol: user.rol, miembro_id: user.miembro_id || '' });
      setEditItem(user.id);
    } else {
      setForm({ email: '', password: '', rol: 'ujier', miembro_id: '' });
      setEditItem(null);
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editItem && !form.password) return alert('La contraseña es requerida');
    if (!form.email || !form.rol) return;
    setSaving(true);
    try {
      if (editItem) await api.put(`/users/${editItem}`, form);
      else await api.post('/users', form);
      setShowForm(false);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { activo: !user.activo });
      load();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try { await api.delete(`/users/${id}`); load(); }
    catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  return (
    <div className="space-y-4">
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold dark:text-white">{editItem ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Email *</label>
                <input type="email" className="input-field" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">{editItem ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña *'}</label>
                <input type="password" className="input-field" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editItem} /></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Rol *</label>
                <select className="input-field" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Vincular a Miembro</label>
                <select className="input-field" value={form.miembro_id} onChange={e => setForm(f => ({ ...f, miembro_id: e.target.value }))}>
                  <option value="">Sin miembro</option>
                  {members.filter(m => !users.some(u => u.miembro_id === m.id && u.id !== editItem)).map(m => (
                    <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
                  ))}
                </select></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold dark:text-white">Usuarios</h2>
        <button onClick={() => openForm()} className="btn-primary text-sm"><Plus className="w-4 h-4 inline mr-1" />Nuevo Usuario</button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full">
          <thead><tr className="bg-gray-50 dark:bg-gray-700/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rol</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Miembro</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-3 text-sm font-medium dark:text-white">{u.email}</td>
                <td className="px-4 py-3"><span className={`badge-${ROLE_COLORS[u.rol] || 'gray'}`}>{ROLE_LABELS[u.rol] || u.rol}</span></td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.miembro_nombre || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => handleToggleActive(u)} className={`inline-flex items-center gap-1 text-sm ${u.activo ? 'text-green-600' : 'text-red-600'}`}>
                    {u.activo ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}{u.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openForm(u)} className="text-primary-600 hover:text-primary-800 text-sm mr-3">Editar</button>
                  <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:text-red-800 text-sm">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
