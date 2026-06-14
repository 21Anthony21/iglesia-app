import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Send, Megaphone, Plus, X, Users, Mail } from 'lucide-react';

export default function Communication() {
  const [tab, setTab] = useState('anuncios');
  const [anuncios, setAnuncios] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [sentList, setSentList] = useState([]);
  const [showForm, setShowForm] = useState(null);
  const [form, setForm] = useState({ titulo: '', contenido: '', tipo: 'general' });
  const [comForm, setComForm] = useState({ para: [], asunto: '', mensaje: '' });
  const [saving, setSaving] = useState(false);
  const { hasRole } = useAuth();
  const canEdit = hasRole('administrador', 'pastor', 'secretaria');

  const load = () => {
    api.get('/communication/announcements').then(({ data }) => setAnuncios(data)).catch(console.error);
    api.get('/communication/contacts').then(({ data }) => setContacts(data)).catch(console.error);
    api.get('/communication/sent').then(({ data }) => setSentList(data)).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/communication/announcements', form);
      setShowForm(null);
      setForm({ titulo: '', contenido: '', tipo: 'general' });
      load();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (comForm.para.length === 0) return alert('Selecciona al menos un destinatario');
    setSaving(true);
    try {
      await api.post('/communication/send', comForm);
      setComForm({ para: [], asunto: '', mensaje: '' });
      load();
      alert('Comunicación enviada');
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  };

  const toggleContact = (id) => {
    setComForm(f => ({
      ...f,
      para: f.para.includes(id) ? f.para.filter(x => x !== id) : [...f.para, id]
    }));
  };

  return (
    <div className="space-y-4">
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold dark:text-white">Nuevo Anuncio</h3>
              <button onClick={() => setShowForm(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Título</label>
                <input className="input-field" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} required /></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Tipo</label>
                <select className="input-field" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="general">General</option>
                  <option value="ministerio">Ministerio</option>
                  <option value="evento">Evento</option>
                  <option value="urgente">Urgente</option>
                </select></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Contenido</label>
                <textarea className="input-field" rows="4" value={form.contenido} onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))} required /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(null)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Publicar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'anuncios', label: 'Anuncios', icon: Megaphone },
          { id: 'enviar', label: 'Enviar Comunicación', icon: Send },
          { id: 'enviados', label: 'Enviados', icon: Mail },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium ${tab === t.id ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'anuncios' && (
        <>
          <div className="flex justify-end">
            {canEdit && <button onClick={() => setShowForm('anuncio')} className="btn-primary text-sm"><Plus className="w-4 h-4 inline mr-1" />Nuevo Anuncio</button>}
          </div>
          <div className="grid gap-3">
            {anuncios.map(a => (
              <div key={a.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`badge-${a.tipo === 'urgente' ? 'danger' : a.tipo === 'evento' ? 'warning' : 'info'}`}>{a.tipo}</span>
                    <h4 className="font-semibold dark:text-white">{a.titulo}</h4>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('es-ES')}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{a.contenido}</p>
              </div>
            ))}
            {anuncios.length === 0 && <div className="card text-center py-10 text-gray-400">No hay anuncios</div>}
          </div>
        </>
      )}

      {tab === 'enviar' && (
        <div className="card">
          <h3 className="font-semibold mb-4 dark:text-white">Enviar Comunicación</h3>
          <form onSubmit={handleSend} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Destinatarios ({comForm.para.length} seleccionados)</label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                {contacts.map(c => (
                  <label key={c.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer">
                    <input type="checkbox" checked={comForm.para.includes(c.id)} onChange={() => toggleContact(c.id)} className="rounded" />
                    <span className="text-sm">{c.nombre} {c.apellido}</span>
                    <span className="text-xs text-gray-400 ml-auto">{c.email || c.telefono}</span>
                  </label>
                ))}
                {contacts.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No hay contactos disponibles</p>}
              </div>
            </div>
            <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Asunto</label>
              <input className="input-field" value={comForm.asunto} onChange={e => setComForm(f => ({ ...f, asunto: e.target.value }))} required /></div>
            <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Mensaje</label>
              <textarea className="input-field" rows="5" value={comForm.mensaje} onChange={e => setComForm(f => ({ ...f, mensaje: e.target.value }))} required /></div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={saving || comForm.para.length === 0}>
                <Send className="w-4 h-4 inline mr-1" />{saving ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'enviados' && (
        <div className="space-y-3">
          {sentList.map(c => (
            <div key={c.id} className="card">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold dark:text-white">{c.asunto}</h4>
                <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('es-ES')}</span>
              </div>
              <p className="text-sm text-gray-500">Para: {c.remitente || 'Desconocido'}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">{c.mensaje}</p>
            </div>
          ))}
          {sentList.length === 0 && <div className="card text-center py-10 text-gray-400">No hay comunicaciones enviadas</div>}
        </div>
      )}
    </div>
  );
}
