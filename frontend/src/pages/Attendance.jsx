import { useState, useEffect } from 'react';
import api from '../utils/api';
import { downloadFile } from '../utils/download';
import { useAuth } from '../context/AuthContext';
import { ClipboardCheck, Users, TrendingUp, Download, Plus, X, Church, BarChart3, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = { culto_domingo: '#3b82f6', culto_martes: '#f59e0b', culto_jueves: '#8b5cf6' };
const DAY_LABELS = { culto_domingo: 'Domingo', culto_martes: 'Martes', culto_jueves: 'Jueves' };

export default function Attendance() {
  const [tab, setTab] = useState('servicios');
  const [services, setServices] = useState([]);
  const [trends, setTrends] = useState([]);
  const [absentees, setAbsentees] = useState([]);
  const [statsByDay, setStatsByDay] = useState([]);
  const [memberSummary, setMemberSummary] = useState([]);
  const [memberDetail, setMemberDetail] = useState(null);
  const [showCreateService, setShowCreateService] = useState(false);
  const [showRegisterAttendance, setShowRegisterAttendance] = useState(null);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editMemberId, setEditMemberId] = useState(null);
  const [memberForm, setMemberForm] = useState({ nombre: '', apellido: '', cedula: '', pasaporte: '', fecha_nacimiento: '', direccion: '', telefono: '', telefono_alternativo: '', email: '', estado_civil: '', ocupacion: '', fecha_conversion: '', fecha_membresia: '', notas: '' });
  const [serviceForm, setServiceForm] = useState({ tipo: 'culto_domingo', fecha: new Date().toISOString().split('T')[0], hora: '19:00', titulo: '', predicador: '' });
  const [members, setMembers] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [saving, setSaving] = useState(false);
  const { hasRole } = useAuth();
  const canEdit = hasRole('administrador', 'pastor', 'secretaria', 'lider', 'ujier');

  const loadData = () => {
    api.get('/attendance/services', { params: { limit: 20 } }).then(({ data }) => setServices(data.data)).catch(console.error);
    api.get('/attendance/trends').then(({ data }) => setTrends(data)).catch(console.error);
    api.get('/attendance/absentees', { params: { semanas: 3 } }).then(({ data }) => setAbsentees(data)).catch(console.error);
    api.get('/attendance/stats-by-day', { params: { semanas: 8 } }).then(({ data }) => setStatsByDay(data)).catch(console.error);
    api.get('/attendance/member-summary', { params: { semanas: 8, limit: 100 } }).then(({ data }) => setMemberSummary(data.data)).catch(console.error);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      await api.post('/attendance/services', serviceForm);
      setShowCreateService(false);
      loadData();
    } catch (err) { alert(err.response?.data?.error || 'Error al crear'); }
  };

  const openRegisterAttendance = async (serviceId) => {
    setShowRegisterAttendance(serviceId);
    const { data: m } = await api.get('/members', { params: { limit: 200 } });
    setMembers(m.data);
    const { data } = await api.get(`/attendance/services/${serviceId}`);
    const map = {};
    (data.asistentes || []).forEach(a => { map[a.miembro_id] = a.estado; });
    setAttendanceMap(map);
  };

  const openMemberForm = (member = null) => {
    if (member) {
      setMemberForm({
        nombre: member.nombre || '',
        apellido: member.apellido || '',
        cedula: member.cedula || '',
        pasaporte: member.pasaporte || '',
        fecha_nacimiento: member.fecha_nacimiento ? member.fecha_nacimiento.split('T')[0] : '',
        direccion: member.direccion || '',
        telefono: member.telefono || '',
        telefono_alternativo: member.telefono_alternativo || '',
        email: member.email || '',
        estado_civil: member.estado_civil || '',
        ocupacion: member.ocupacion || '',
        fecha_conversion: member.fecha_conversion ? member.fecha_conversion.split('T')[0] : '',
        fecha_membresia: member.fecha_membresia ? member.fecha_membresia.split('T')[0] : '',
        notas: member.notas || '',
      });
      setEditMemberId(member.id);
    } else {
      setMemberForm({ nombre: '', apellido: '', cedula: '', pasaporte: '', fecha_nacimiento: '', direccion: '', telefono: '', telefono_alternativo: '', email: '', estado_civil: '', ocupacion: '', fecha_conversion: '', fecha_membresia: '', notas: '' });
      setEditMemberId(null);
    }
    setShowMemberForm(true);
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editMemberId) {
        await api.put(`/members/${editMemberId}`, memberForm);
      } else {
        await api.post('/members', memberForm);
      }
      setShowMemberForm(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar miembro');
    } finally {
      setSaving(false);
    }
  };

  const toggleAttendance = async (miembroId, estado, servicioId) => {
    const newMap = { ...attendanceMap, [miembroId]: estado === attendanceMap[miembroId] ? '' : estado };
    setAttendanceMap(newMap);
    const asistencias = Object.entries(newMap).filter(([_, v]) => v).map(([id, est]) => ({ miembro_id: id, estado: est }));
    try { await api.post(`/attendance/services/${servicioId}/register`, { asistencias }); }
    catch (err) { console.error(err); }
  };

  const chartData = trends.map(t => ({
    semana: new Date(t.semana + '-1').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    presentes: parseInt(t.presentes),
    total: parseInt(t.total),
  }));

  const pieData = statsByDay.filter(d => d.tipo in COLORS).map(d => ({
    name: DAY_LABELS[d.tipo] || d.tipo,
    value: parseInt(d.presentes) || 0,
    total: parseInt(d.total_asistencias) || 0,
  }));

  const barData = statsByDay.filter(d => d.tipo in COLORS).map(d => ({
    dia: DAY_LABELS[d.tipo] || d.tipo,
    presentes: parseInt(d.presentes) || 0,
    ausentes: (parseInt(d.total_asistencias) || 0) - (parseInt(d.presentes) || 0),
  }));

  return (
    <div className="space-y-4">
      {showCreateService && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateService(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold dark:text-white">Nuevo Servicio</h3>
              <button onClick={() => setShowCreateService(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleCreateService} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Día</label>
                <select className="input-field" value={serviceForm.tipo} onChange={e => setServiceForm(f => ({ ...f, tipo: e.target.value }))} required>
                  <option value="culto_domingo">Domingo</option>
                  <option value="culto_martes">Martes</option>
                  <option value="culto_jueves">Jueves</option>
                  <option value="culto_miercoles">Miércoles</option>
                  <option value="culto_sabado">Sábado</option>
                  <option value="especial">Especial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Fecha</label>
                <input type="date" className="input-field" value={serviceForm.fecha} onChange={e => setServiceForm(f => ({ ...f, fecha: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Hora</label>
                <input type="time" className="input-field" value={serviceForm.hora} onChange={e => setServiceForm(f => ({ ...f, hora: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Título</label>
                <input className="input-field" value={serviceForm.titulo} onChange={e => setServiceForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Culto de Domingo" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Predicador</label>
                <input className="input-field" value={serviceForm.predicador} onChange={e => setServiceForm(f => ({ ...f, predicador: e.target.value }))} placeholder="Pastor Juan" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateService(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Crear Servicio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRegisterAttendance && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRegisterAttendance(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold dark:text-white">Registrar Asistencia</h3>
              <button onClick={() => setShowRegisterAttendance(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Toca el nombre para cambiar entre presente/ausente</p>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {members.map(m => {
                const estado = attendanceMap[m.id] || '';
                return (
                  <div key={m.id}
                    onClick={() => toggleAttendance(m.id, 'presente', showRegisterAttendance)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      estado === 'presente' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200' :
                      estado === 'ausente' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200' :
                      'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onContextMenu={(e) => { e.preventDefault(); toggleAttendance(m.id, 'ausente', showRegisterAttendance); }}
                  >
                    <span className="font-medium dark:text-white">{m.nombre} {m.apellido}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      estado === 'presente' ? 'bg-green-200 text-green-800' :
                      estado === 'ausente' ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-600'
                    }`}>{estado || 'sin marcar'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showMemberForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowMemberForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold dark:text-white">{editMemberId ? 'Editar Miembro' : 'Nuevo Miembro'}</h3>
              <button onClick={() => setShowMemberForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleMemberSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Nombre *</label>
                  <input className="input-field" value={memberForm.nombre} onChange={e => setMemberForm(f => ({ ...f, nombre: e.target.value }))} required /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Apellido *</label>
                  <input className="input-field" value={memberForm.apellido} onChange={e => setMemberForm(f => ({ ...f, apellido: e.target.value }))} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Cédula</label>
                  <input className="input-field" value={memberForm.cedula} onChange={e => setMemberForm(f => ({ ...f, cedula: e.target.value }))} /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Pasaporte</label>
                  <input className="input-field" value={memberForm.pasaporte} onChange={e => setMemberForm(f => ({ ...f, pasaporte: e.target.value }))} /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Email</label>
                <input type="email" className="input-field" value={memberForm.email} onChange={e => setMemberForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Teléfono</label>
                  <input className="input-field" value={memberForm.telefono} onChange={e => setMemberForm(f => ({ ...f, telefono: e.target.value }))} /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Tel. Alternativo</label>
                  <input className="input-field" value={memberForm.telefono_alternativo} onChange={e => setMemberForm(f => ({ ...f, telefono_alternativo: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Fecha Nacimiento</label>
                  <input type="date" className="input-field" value={memberForm.fecha_nacimiento} onChange={e => setMemberForm(f => ({ ...f, fecha_nacimiento: e.target.value }))} /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Estado Civil</label>
                  <select className="input-field" value={memberForm.estado_civil} onChange={e => setMemberForm(f => ({ ...f, estado_civil: e.target.value }))}>
                    <option value="">Seleccionar</option>
                    <option value="soltero">Soltero</option>
                    <option value="casado">Casado</option>
                    <option value="divorciado">Divorciado</option>
                    <option value="viudo">Viudo</option>
                  </select></div>
              </div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Dirección</label>
                <input className="input-field" value={memberForm.direccion} onChange={e => setMemberForm(f => ({ ...f, direccion: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Ocupación</label>
                <input className="input-field" value={memberForm.ocupacion} onChange={e => setMemberForm(f => ({ ...f, ocupacion: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Fecha Conversión</label>
                  <input type="date" className="input-field" value={memberForm.fecha_conversion} onChange={e => setMemberForm(f => ({ ...f, fecha_conversion: e.target.value }))} /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Fecha Membresía</label>
                  <input type="date" className="input-field" value={memberForm.fecha_membresia} onChange={e => setMemberForm(f => ({ ...f, fecha_membresia: e.target.value }))} /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Notas</label>
                <textarea className="input-field" rows="2" value={memberForm.notas} onChange={e => setMemberForm(f => ({ ...f, notas: e.target.value }))} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowMemberForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'servicios', label: 'Servicios', icon: Church },
          { id: 'miembros', label: 'Miembros', icon: Users },
          { id: 'graficas', label: 'Gráficas', icon: BarChart3 },
          { id: 'ausentes', label: 'Ausentes', icon: TrendingUp },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium ${tab === t.id ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => downloadFile('/attendance/export/pdf', 'asistencia.pdf')} className="btn-secondary text-sm"><Download className="w-4 h-4 inline mr-1" />PDF</button>
      </div>

      {tab === 'servicios' && (
        <>
          <div className="flex justify-end">
            {canEdit && <button onClick={() => setShowCreateService(true)} className="btn-primary text-sm"><Plus className="w-4 h-4 inline mr-1" />Nuevo Servicio</button>}
          </div>
          <div className="grid gap-3">
            {services.map(s => {
              const totalS = parseInt(s.total) || 0;
              const presentes = parseInt(s.presentes) || 0;
              const pct = totalS > 0 ? Math.round(presentes / totalS * 100) : 0;
              return (
                <div key={s.id} className="card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${s.tipo === 'culto_domingo' ? 'bg-blue-100' : s.tipo === 'culto_martes' ? 'bg-amber-100' : s.tipo === 'culto_jueves' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                      <Calendar className={`w-5 h-5 ${s.tipo === 'culto_domingo' ? 'text-blue-600' : s.tipo === 'culto_martes' ? 'text-amber-600' : 'text-purple-600'}`} />
                    </div>
                    <div>
                      <p className="font-medium dark:text-white">{s.titulo || DAY_LABELS[s.tipo] || s.tipo}</p>
                      <p className="text-sm text-gray-500">{new Date(s.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      {s.predicador && <p className="text-xs text-gray-400">{s.predicador}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-medium">{presentes}/{totalS}</span>
                      </div>
                    </div>
                    <button onClick={() => openRegisterAttendance(s.id)} className="btn-secondary text-xs">Asistencia</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'miembros' && (
        <><div className="flex justify-end">{canEdit && <button onClick={() => openMemberForm()} className="btn-primary text-sm"><Plus className="w-4 h-4 inline mr-1" />Nuevo Miembro</button>}</div>
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Miembro</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">%</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-blue-600 uppercase">Dom</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-amber-600 uppercase">Mar</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-purple-600 uppercase">Jue</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {memberSummary.map(m => {
                  const pct = parseInt(m.porcentaje) || 0;
                  const pctClass = pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-yellow-600' : 'text-red-600';
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
                      onClick={async () => {
                        const { data } = await api.get(`/attendance/member/${m.id}`);
                        setMemberDetail({ member: m, history: data });
                      }}>
                      <td className="px-4 py-3 text-sm font-medium dark:text-white">{m.nombre} {m.apellido}</td>
                      <td className={`px-4 py-3 text-sm text-center font-bold ${pctClass}`}>{pct}%</td>
                      <td className="px-4 py-3 text-sm text-center">{m.total_servicios || 0}</td>
                      <td className="px-4 py-3 text-sm text-center text-blue-600">{m.domingo_p || 0}</td>
                      <td className="px-4 py-3 text-sm text-center text-amber-600">{m.martes_p || 0}</td>
                      <td className="px-4 py-3 text-sm text-center text-purple-600">{m.jueves_p || 0}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="w-full max-w-[60px] h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mx-auto">
                          <div className={`h-full rounded-full ${pctClass}`} style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>)}

      {memberDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setMemberDetail(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold dark:text-white">{memberDetail.member.nombre} {memberDetail.member.apellido}</h3>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button onClick={async () => {
                    if (!confirm(`¿Eliminar a ${memberDetail.member.nombre} ${memberDetail.member.apellido}?`)) return;
                    try {
                      await api.put(`/members/${memberDetail.member.id}`, { estado: 'inactivo' });
                      setMemberDetail(null);
                      loadData();
                    } catch (err) { alert(err.response?.data?.error || 'Error al eliminar'); }
                  }} className="text-red-600 hover:text-red-700 text-sm font-medium">Eliminar</button>
                )}
                <button onClick={() => setMemberDetail(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
            </div>
            <div className="space-y-2">
              {memberDetail.history.map(h => (
                <div key={h.fecha + h.tipo} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium dark:text-white">{new Date(h.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-xs text-gray-500">{DAY_LABELS[h.tipo] || h.tipo} {h.titulo ? `— ${h.titulo}` : ''}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    h.estado === 'presente' ? 'bg-green-100 text-green-700' :
                    h.estado === 'ausente' ? 'bg-red-100 text-red-700' :
                    h.estado === 'justificado' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-500'
                  }`}>{h.estado || 'sin registro'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'graficas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-semibold mb-4 dark:text-white">Asistencia por Día</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dia" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="presentes" name="Presentes" fill="#10b981" stackId="a" />
                    <Bar dataKey="ausentes" name="Ausentes" fill="#ef4444" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-4 dark:text-white">Distribución de Asistencia</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map(d => <Cell key={d.name} fill={COLORS[Object.keys(COLORS).find(k => DAY_LABELS[k] === d.name)] || '#888'} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-4 dark:text-white">Tendencia Semanal</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="semana" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="presentes" stroke="#10b981" strokeWidth={2} name="Presentes" />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Total Registrados" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === 'ausentes' && (
        <div className="card">
          <h3 className="font-semibold mb-4 dark:text-white">Miembros sin Asistir (últimas 3 semanas)</h3>
          {absentees.length > 0 ? (
            <div className="grid gap-2">
              {absentees.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div>
                    <p className="font-medium dark:text-white">{m.nombre} {m.apellido}</p>
                    <p className="text-sm text-gray-500">{m.telefono || m.email || 'Sin contacto'}</p>
                  </div>
                  <span className="badge-danger">Ausente</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-center py-8">Todos los miembros han asistido recientemente</p>}
        </div>
      )}
    </div>
  );
}
