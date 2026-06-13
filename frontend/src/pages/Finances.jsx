import { useState, useEffect } from 'react';
import api from '../utils/api';
import { downloadFile } from '../utils/download';
import { useAuth } from '../context/AuthContext';
import { Plus, Download, TrendingUp, TrendingDown, X, Church, Calendar, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'culto', label: 'Por Culto' },
  { id: 'mensual', label: 'Mensual' },
  { id: 'diezmos', label: 'Diezmos' },
  { id: 'primicias', label: 'Primicias' },
  { id: 'ofrendas', label: 'Ofrendas' },
  { id: 'egresos', label: 'Egresos' },
];

export default function Finances() {
  const [tab, setTab] = useState('resumen');
  const [summary, setSummary] = useState(null);
  const [tithes, setTithes] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [firstfruits, setFirstfruits] = useState([]);
  const [trends, setTrends] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceDetail, setServiceDetail] = useState(null);
  const [showForm, setShowForm] = useState(null);
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { hasRole } = useAuth();
  const canAdd = hasRole('administrador', 'pastor', 'secretaria');

  const formDefaults = {
    diezmo: { miembro_id: '', fecha: new Date().toISOString().split('T')[0], monto: '', metodo_pago: 'efectivo', referencia: '', servicio_id: '', notas: '' },
    ofrenda: { tipo: 'ordinaria', descripcion: '', fecha: new Date().toISOString().split('T')[0], monto: '', metodo_pago: 'efectivo', donante_nombre: '', servicio_id: '', notas: '' },
    egreso: { categoria_id: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], monto: '', metodo_pago: 'efectivo', beneficiario: '', factura_numero: '', notas: '' },
    primicia: { miembro_id: '', fecha: new Date().toISOString().split('T')[0], monto: '', tipo_periodo: 'mensual', periodo_referencia: '', metodo_pago: 'efectivo', notas: '' },
  };
  const [form, setForm] = useState(formDefaults.diezmo);

  const loadData = () => {
    api.get('/finances/reports/summary').then(({ data }) => setSummary(data)).catch(console.error);
    api.get('/finances/reports/monthly').then(({ data }) => setTrends(data)).catch(console.error);
    api.get('/finances/tithes', { params: { limit: 20 } }).then(({ data }) => setTithes(data.data)).catch(console.error);
    api.get('/finances/offerings', { params: { limit: 20 } }).then(({ data }) => setOfferings(data.data)).catch(console.error);
    api.get('/finances/expenses', { params: { limit: 20 } }).then(({ data }) => setExpenses(data.data)).catch(console.error);
    api.get('/finances/firstfruits', { params: { limit: 20 } }).then(({ data }) => setFirstfruits(data.data)).catch(console.error);
    api.get('/finances/reports/services', { params: { limit: 30 } }).then(({ data }) => setServices(data)).catch(console.error);
  };

  useEffect(() => { loadData(); }, []);

  const openForm = (type, prefill = {}) => {
    setForm({ ...formDefaults[type], ...prefill });
    setShowForm(type);
    setError('');
    if (type === 'diezmo' || type === 'primicia') api.get('/members', { params: { limit: 100 } }).then(({ data }) => setMembers(data.data)).catch(console.error);
    if (type === 'egreso') api.get('/finances/expense-categories').then(({ data }) => setCategories(data)).catch(console.error);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const monto = parseFloat(form.monto);
    if (isNaN(monto) || monto <= 0) { setError('El monto debe ser un número mayor a 0'); return; }
    setSaving(true);
    try {
      const payload = { ...form, monto };
      if (showForm === 'diezmo') await api.post('/finances/tithes', payload);
      else if (showForm === 'ofrenda') await api.post('/finances/offerings', payload);
      else if (showForm === 'egreso') await api.post('/finances/expenses', payload);
      else if (showForm === 'primicia') await api.post('/finances/firstfruits', payload);
      setShowForm(null);
      loadData();
    } catch (err) { setError(err.response?.data?.error || err.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const downloadPDF = () => downloadFile('/finances/export/pdf', 'reporte-financiero.pdf');
  const downloadExcel = () => downloadFile('/finances/export/excel', 'reporte-financiero.xlsx');

  return (
    <div className="space-y-4">
      {showForm && <ModalForm showForm={showForm} form={form} setForm={setForm} handleSubmit={handleSubmit} setShowForm={setShowForm} members={members} categories={categories} services={services} error={error} saving={saving} />}

      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setServiceDetail(null); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t.id ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>{t.label}</button>
        ))}
        <div className="flex-1" />
        <button onClick={downloadPDF} className="btn-secondary text-sm"><Download className="w-4 h-4 inline mr-1" />PDF</button>
        <button onClick={downloadExcel} className="btn-secondary text-sm"><Download className="w-4 h-4 inline mr-1" />Excel</button>
      </div>

      {tab === 'resumen' && <ResumenTab summary={summary} trends={trends} />}
      {tab === 'culto' && <CultoTab services={services} serviceDetail={serviceDetail} setServiceDetail={setServiceDetail} openForm={openForm} />}
      {tab === 'mensual' && <MensualTab trends={trends} />}
      {tab === 'diezmos' && <ListTab items={tithes} type="diezmo" canAdd={canAdd} openForm={openForm} />}
      {tab === 'primicias' && <ListPrimicias items={firstfruits} canAdd={canAdd} openForm={openForm} />}
      {tab === 'ofrendas' && <ListTab items={offerings} type="ofrenda" canAdd={canAdd} openForm={openForm} />}
      {tab === 'egresos' && <EgresosTab items={expenses} canAdd={canAdd} openForm={openForm} />}
    </div>
  );
}

function ModalForm({ showForm, form, setForm, handleSubmit, setShowForm, members, categories, services, error, saving }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(null)}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold dark:text-white">
            {showForm === 'diezmo' ? 'Nuevo Diezmo' : showForm === 'ofrenda' ? 'Nueva Ofrenda' : showForm === 'primicia' ? 'Nueva Primicia' : 'Nuevo Egreso'}
          </h3>
          <button onClick={() => setShowForm(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          {(showForm === 'diezmo' || showForm === 'primicia') && (
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Miembro</label>
              <select className="input-field" value={form.miembro_id} onChange={e => setForm(f => ({ ...f, miembro_id: e.target.value }))} required>
                <option value="">Seleccionar miembro</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
              </select>
            </div>
          )}
          {showForm === 'primicia' && (
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tipo Período</label>
              <select className="input-field" value={form.tipo_periodo} onChange={e => setForm(f => ({ ...f, tipo_periodo: e.target.value }))}>
                <option value="mensual">Mensual</option>
                <option value="anual">Anual</option>
                <option value="especial">Especial</option>
              </select>
            </div>
          )}
          {showForm === 'primicia' && (
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Período Referencia (ej: Enero 2026)</label>
              <input className="input-field" value={form.periodo_referencia} onChange={e => setForm(f => ({ ...f, periodo_referencia: e.target.value }))} placeholder="Enero 2026" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Fecha</label>
            <input type="date" className="input-field" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Monto ($)</label>
            <input type="text" inputMode="decimal" className="input-field" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="0.00" required autoFocus />
          </div>
          {showForm === 'diezmo' && (
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Método de Pago</label>
              <select className="input-field" value={form.metodo_pago} onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          )}
          {(showForm === 'diezmo' || showForm === 'ofrenda') && (
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Culto / Servicio</label>
              <select className="input-field" value={form.servicio_id} onChange={e => setForm(f => ({ ...f, servicio_id: e.target.value }))}>
                <option value="">-- Sin culto asignado --</option>
                {Array.isArray(services) && services.map(s => (
                  <option key={s.id} value={s.id}>{s.titulo || s.tipo} — {new Date(s.fecha).toLocaleDateString('es-ES')}</option>
                ))}
              </select>
            </div>
          )}
          {showForm === 'diezmo' && (
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Referencia</label>
              <input className="input-field" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} />
            </div>
          )}
          {showForm === 'ofrenda' && (
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tipo</label>
              <select className="input-field" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                <option value="ordinaria">Ordinaria</option>
                <option value="especial">Especial</option>
                <option value="misionera">Misionera</option>
                <option value="construccion">Construcción</option>
                <option value="evento">Evento</option>
              </select>
            </div>
          )}
          {showForm === 'ofrenda' && (
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Donante</label>
              <input className="input-field" value={form.donante_nombre} onChange={e => setForm(f => ({ ...f, donante_nombre: e.target.value }))} placeholder="Nombre del donante" />
            </div>
          )}
          {(showForm === 'ofrenda' || showForm === 'egreso') && (
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Descripción</label>
              <textarea className="input-field" rows="2" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
            </div>
          )}
          {showForm === 'egreso' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Categoría</label>
                <select className="input-field" value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))} required>
                  <option value="">Seleccionar categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Beneficiario</label>
                <input className="input-field" value={form.beneficiario} onChange={e => setForm(f => ({ ...f, beneficiario: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Factura N°</label>
                <input className="input-field" value={form.factura_numero} onChange={e => setForm(f => ({ ...f, factura_numero: e.target.value }))} />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Notas</label>
            <textarea className="input-field" rows="2" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(null)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResumenTab({ summary, trends }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card"><div className="flex items-center gap-2 text-green-600"><TrendingUp className="w-5 h-5" /><span className="text-sm text-gray-500">Diezmos</span></div>
          <p className="text-2xl font-bold mt-1 dark:text-white">${(summary?.total_diezmos || 0).toLocaleString()}</p></div>
        <div className="card"><div className="flex items-center gap-2 text-green-500"><TrendingUp className="w-5 h-5" /><span className="text-sm text-gray-500">Ofrendas</span></div>
          <p className="text-2xl font-bold mt-1 dark:text-white">${(summary?.total_ofrendas || 0).toLocaleString()}</p></div>
        <div className="card"><div className="flex items-center gap-2 text-blue-500"><TrendingUp className="w-5 h-5" /><span className="text-sm text-gray-500">Primicias</span></div>
          <p className="text-2xl font-bold mt-1 dark:text-white">${(summary?.total_primicias || 0).toLocaleString()}</p></div>
        <div className="card"><div className="flex items-center gap-2 text-red-600"><TrendingDown className="w-5 h-5" /><span className="text-sm text-gray-500">Egresos</span></div>
          <p className="text-2xl font-bold mt-1 dark:text-white">${(summary?.total_egresos || 0).toLocaleString()}</p></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card"><span className="text-sm text-gray-500">Ingresos Totales</span>
          <p className="text-2xl font-bold mt-1 text-green-600">${(summary?.total_ingresos || 0).toLocaleString()}</p></div>
        <div className="card"><span className="text-sm text-gray-500">Balance</span>
          <p className={`text-2xl font-bold mt-1 ${(summary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>${(summary?.balance || 0).toLocaleString()}</p></div>
      </div>
      <div className="card"><h3 className="font-semibold mb-4 dark:text-white">Tendencia Mensual</h3>
        <div className="h-72"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={trends}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" /><YAxis /><Tooltip />
            <Bar dataKey="total_diezmos" name="Diezmos" fill="#3b82f6" /><Bar dataKey="total_ofrendas" name="Ofrendas" fill="#10b981" />
            <Bar dataKey="total_primicias" name="Primicias" fill="#8b5cf6" /><Bar dataKey="total_egresos" name="Egresos" fill="#ef4444" /></BarChart></ResponsiveContainer></div></div>
    </>
  );
}

function CultoTab({ services, serviceDetail, setServiceDetail, openForm }) {
  if (serviceDetail) {
    const { servicio, diezmos, ofrendas, resumen } = serviceDetail;
    return (
      <div className="space-y-4">
        <button onClick={() => setServiceDetail(null)} className="text-primary-600 hover:text-primary-700 text-sm font-medium">&larr; Volver a cultos</button>
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Church className="w-8 h-8 text-primary-600" />
            <div className="flex-1"><h3 className="text-xl font-bold dark:text-white">{servicio.titulo || 'Culto'}</h3>
              <p className="text-sm text-gray-500">{new Date(servicio.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — {servicio.tipo}</p>
              {servicio.predicador && <p className="text-sm text-gray-500">Predicador: {servicio.predicador}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openForm('diezmo', { servicio_id: servicio.id, fecha: servicio.fecha })} className="btn-secondary text-sm"><Plus className="w-4 h-4 inline mr-1" />Diezmo</button>
              <button onClick={() => openForm('ofrenda', { servicio_id: servicio.id, fecha: servicio.fecha })} className="btn-secondary text-sm"><Plus className="w-4 h-4 inline mr-1" />Ofrenda</button>
              <button onClick={() => downloadFile(`/finances/reports/treasury/${servicio.id}`, `tesoreria-${servicio.fecha}.pdf`)} className="btn-primary text-sm"><Download className="w-4 h-4 inline mr-1" />Informe Tesorería</button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{resumen.total_diezmeros}</p>
              <p className="text-xs text-gray-500">Diezmaron</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">${resumen.monto_diezmos.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Diezmos</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
              <p className="text-2xl font-bold text-emerald-600">{resumen.total_ofrendas}</p>
              <p className="text-xs text-gray-500">Ofrendas</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">${resumen.monto_ofrendas.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Monto Ofrendas</p>
            </div>
          </div>
        </div>
        {diezmos.length > 0 && (
          <div className="card"><h4 className="font-semibold mb-3 dark:text-white">Diezmos — Lista de Personas</h4>
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Nombre</th><th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Monto</th>
            </tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {diezmos.map(d => <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-2 text-sm dark:text-white">{d.nombre} {d.apellido}</td>
                <td className="px-4 py-2 text-sm text-right font-medium text-green-600">${d.monto.toFixed(2)}</td>
              </tr>)}
            </tbody></table></div>
          </div>
        )}
        {ofrendas.length > 0 && (
          <div className="card"><h4 className="font-semibold mb-3 dark:text-white">Ofrendas</h4>
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Tipo</th><th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Donante</th><th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Monto</th>
            </tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {ofrendas.map(o => <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-2 text-sm capitalize">{o.tipo}</td>
                <td className="px-4 py-2 text-sm">{o.donante_nombre || '-'}</td>
                <td className="px-4 py-2 text-sm text-right font-medium text-green-600">${o.monto.toFixed(2)}</td>
              </tr>)}
            </tbody></table></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {services.map(s => {
        const total = (parseFloat(s.monto_diezmos) || 0) + (parseFloat(s.monto_ofrendas) || 0);
        return (
          <div key={s.id} className="card flex items-center gap-3 hover:shadow-md transition-shadow">
            <button onClick={async () => {
              const { data } = await api.get(`/finances/reports/by-service/${s.id}`);
              setServiceDetail(data);
            }} className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary-600" />
                  <div>
                    <p className="font-medium dark:text-white">{s.titulo || 'Culto'}</p>
                    <p className="text-sm text-gray-500">{new Date(s.fecha).toLocaleDateString('es-ES')} — {s.tipo}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold dark:text-white">${total.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{s.total_diezmos} diezmos · {s.total_ofrendas} ofrendas</p>
                </div>
              </div>
            </button>
            <button onClick={() => downloadFile(`/finances/reports/treasury/${s.id}`, `tesoreria-${s.fecha}.pdf`)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Descargar Informe de Tesorería"><Download className="w-4 h-4 text-primary-600" /></button>
          </div>
        );
      })}
      {services.length === 0 && <div className="card text-center py-10 text-gray-400">No hay cultos registrados</div>}
    </div>
  );
}

function MensualTab({ trends }) {
  const downloadMonthlyReport = () => {
    const now = new Date();
    const mes = now.toLocaleString('es-ES', { month: 'long' });
    const anio = now.getFullYear();
    downloadFile(`/finances/reports/monthly-report?mes=${mes}&anio=${anio}&iglesia=Templo Puerta del Cielo&provincia=Panamá`, `informe-mensual-${anio}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button onClick={downloadMonthlyReport} className="btn-primary text-sm"><FileText className="w-4 h-4 inline mr-1" />Informe Mensual</button>
      </div>
      <div className="card"><h3 className="font-semibold mb-4 dark:text-white">Tendencia Mensual</h3>
        <div className="h-72"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={trends}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" /><YAxis /><Tooltip />
            <Bar dataKey="total_diezmos" name="Diezmos" fill="#3b82f6" /><Bar dataKey="total_ofrendas" name="Ofrendas" fill="#10b981" />
            <Bar dataKey="total_primicias" name="Primicias" fill="#8b5cf6" /><Bar dataKey="total_egresos" name="Egresos" fill="#ef4444" /></BarChart></ResponsiveContainer></div></div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full"><thead><tr className="bg-gray-50 dark:bg-gray-700/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Mes</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Diezmos</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ofrendas</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Primicias</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Egresos</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Balance</th>
        </tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {trends.map(m => {
            const balance = (parseFloat(m.total_diezmos) + parseFloat(m.total_ofrendas) + parseFloat(m.total_primicias)) - parseFloat(m.total_egresos);
            return <tr key={m.mes} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td className="px-4 py-3 text-sm font-medium dark:text-white">{m.mes}</td>
              <td className="px-4 py-3 text-sm text-right text-green-600">${parseFloat(m.total_diezmos || 0).toFixed(2)}</td>
              <td className="px-4 py-3 text-sm text-right text-green-500">${parseFloat(m.total_ofrendas || 0).toFixed(2)}</td>
              <td className="px-4 py-3 text-sm text-right text-blue-500">${parseFloat(m.total_primicias || 0).toFixed(2)}</td>
              <td className="px-4 py-3 text-sm text-right text-red-600">${parseFloat(m.total_egresos || 0).toFixed(2)}</td>
              <td className={`px-4 py-3 text-sm text-right font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>${balance.toFixed(2)}</td>
            </tr>;
          })}
        </tbody></table>
      </div>
    </div>
  );
}

function ListTab({ items, type, canAdd, openForm }) {
  return (
    <><div className="flex justify-end">{canAdd && <button onClick={() => openForm(type)} className="btn-primary text-sm"><Plus className="w-4 h-4 inline mr-1" />Nuev{type === 'diezmo' ? 'o' : 'a'} {type === 'diezmo' ? 'Diezmo' : 'Ofrenda'}</button>}</div>
    <div className="card p-0 overflow-hidden"><table className="w-full"><thead><tr className="bg-gray-50 dark:bg-gray-700/50">
      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
      {type === 'diezmo' && <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Miembro</th>}
      {type === 'ofrenda' && <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>}
      {type === 'ofrenda' && <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Donante</th>}
      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Monto</th>
      {type === 'diezmo' && <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Método</th>}
      {type === 'diezmo' && <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Recibo</th>}
    </tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">
      {items.map(i => <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
        <td className="px-4 py-3 text-sm">{new Date(i.fecha).toLocaleDateString('es-ES')}</td>
        {type === 'diezmo' && <td className="px-4 py-3 text-sm font-medium dark:text-white">{i.nombre} {i.apellido}</td>}
        {type === 'ofrenda' && <td className="px-4 py-3 text-sm capitalize">{i.tipo}</td>}
        {type === 'ofrenda' && <td className="px-4 py-3 text-sm">{i.donante_nombre || '-'}</td>}
        <td className="px-4 py-3 text-sm text-right font-medium text-green-600">${parseFloat(i.monto).toFixed(2)}</td>
        {type === 'diezmo' && <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell capitalize">{i.metodo_pago}</td>}
        {type === 'diezmo' && <td className="px-4 py-3 text-center"><button onClick={() => downloadFile(`/finances/tithes/${i.id}/receipt`, `recibo-${i.recibo_numero}.pdf`)} className="text-primary-600 hover:text-primary-800 text-sm">{i.recibo_numero}</button></td>}
      </tr>)}
    </tbody></table></div></>
  );
}

function ListPrimicias({ items, canAdd, openForm }) {
  return (
    <><div className="flex justify-end">{canAdd && <button onClick={() => openForm('primicia')} className="btn-primary text-sm"><Plus className="w-4 h-4 inline mr-1" />Nueva Primicia</button>}</div>
    <div className="card p-0 overflow-hidden"><table className="w-full"><thead><tr className="bg-gray-50 dark:bg-gray-700/50">
      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Miembro</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Período</th>
      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Monto</th>
    </tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">
      {items.map(i => <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
        <td className="px-4 py-3 text-sm">{new Date(i.fecha).toLocaleDateString('es-ES')}</td>
        <td className="px-4 py-3 text-sm font-medium dark:text-white">{i.nombre} {i.apellido}</td>
        <td className="px-4 py-3 text-sm capitalize">{i.tipo_periodo}{i.periodo_referencia ? ` — ${i.periodo_referencia}` : ''}</td>
        <td className="px-4 py-3 text-sm text-right font-medium text-purple-600">${parseFloat(i.monto).toFixed(2)}</td>
      </tr>)}
    </tbody></table></div></>
  );
}

function EgresosTab({ items, canAdd, openForm }) {
  return (
    <><div className="flex justify-end">{canAdd && <button onClick={() => openForm('egreso')} className="btn-primary text-sm"><Plus className="w-4 h-4 inline mr-1" />Nuevo Egreso</button>}</div>
    <div className="card p-0 overflow-hidden"><table className="w-full"><thead><tr className="bg-gray-50 dark:bg-gray-700/50">
      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Categoría</th>
      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Descripción</th>
      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Monto</th>
    </tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">
      {items.map(e => <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
        <td className="px-4 py-3 text-sm">{new Date(e.fecha).toLocaleDateString('es-ES')}</td>
        <td className="px-4 py-3 text-sm">{e.categoria_nombre || '-'}</td>
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{e.descripcion}</td>
        <td className="px-4 py-3 text-sm text-right font-medium text-red-600">${parseFloat(e.monto).toFixed(2)}</td>
      </tr>)}
    </tbody></table></div></>
  );
}
