import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Finances from './pages/Finances';
import Communication from './pages/Communication';
import Attendance from './pages/Attendance';
import Inventory from './pages/Inventory';
import Pastoral from './pages/Pastoral';
import Events from './pages/Events';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function LoginPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const form = new FormData(e.target);
      await login(form.get('email'), form.get('password'));
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary-800">Iglesia Puerta Del Cielo</h1>
          <p className="text-gray-500 mt-1">Sistema de Gestión</p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" type="email" required className="input-field" placeholder="admin@iglesia.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input name="password" type="password" required className="input-field" placeholder="••••••" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Ingresando...' : 'Ingresar'}</button>
        </form>
      </div>
    </div>
  );
}

function Layout({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <TopBar onToggleMenu={() => setOpen(true)} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const links = [
    { to: '/', label: 'Dashboard', icon: '📊', tab: 'resumen' },
    { to: '/finanzas', label: 'Finanzas', icon: '💰' },
    { to: '/asistencia', label: 'Asistencia', icon: '📋' },
    { to: '/inventario', label: 'Inventario', icon: '📦' },
    { to: '/comunicacion', label: 'Comunicación', icon: '📢' },
    { to: '/ministerios', label: 'Ministerios', icon: '👥' },
    { to: '/eventos', label: 'Eventos', icon: '📅' },
    { to: '/pastoral', label: 'Pastoral', icon: '❤️' },
  ];
  return (
    <>
      <div className={`fixed inset-0 bg-black/50 z-40 lg:hidden ${open ? 'block' : 'hidden'}`} onClick={onClose} />
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="font-bold text-lg dark:text-white">Iglesia Puerta Del Cielo</h2>
          <p className="text-xs text-gray-500">{user?.nombre || user?.email}</p>
        </div>
        <nav className="p-2 space-y-1">
          {links.map(l => (
            <a key={l.to} href={l.to} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-primary-50 dark:hover:bg-gray-700 dark:text-gray-300">
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </a>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t dark:border-gray-700">
          <button onClick={logout} className="text-sm text-red-600 hover:text-red-800 w-full text-left">Cerrar Sesión</button>
        </div>
      </aside>
    </>
  );
}

function TopBar({ onToggleMenu }) {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm px-4 py-3 lg:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={onToggleMenu} className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Menú">
          <svg className="w-6 h-6 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <h1 className="font-semibold text-lg dark:text-white">Iglesia Puerta Del Cielo</h1>
      </div>
    </header>
  );
}

function Dashboard() {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    import('./utils/api').then(m => {
      m.default.get('/finances/reports/summary').then(({ data }) => setSummary(data)).catch(() => {});
    });
  }, []);
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold dark:text-white">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card"><span className="text-sm text-gray-500">Ingresos</span><p className="text-2xl font-bold text-green-600">${(summary?.total_ingresos || 0).toLocaleString()}</p></div>
        <div className="card"><span className="text-sm text-gray-500">Egresos</span><p className="text-2xl font-bold text-red-600">${(summary?.total_egresos || 0).toLocaleString()}</p></div>
        <div className="card"><span className="text-sm text-gray-500">Balance</span><p className={`text-2xl font-bold ${(summary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>${(summary?.balance || 0).toLocaleString()}</p></div>
        <div className="card"><span className="text-sm text-gray-500">Diezmos</span><p className="text-2xl font-bold text-blue-600">${(summary?.total_diezmos || 0).toLocaleString()}</p></div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/finanzas" element={<PrivateRoute><Layout><Finances /></Layout></PrivateRoute>} />
          <Route path="/asistencia" element={<PrivateRoute><Layout><Attendance /></Layout></PrivateRoute>} />
          <Route path="/inventario" element={<PrivateRoute><Layout><Inventory /></Layout></PrivateRoute>} />
          <Route path="/comunicacion" element={<PrivateRoute><Layout><Communication /></Layout></PrivateRoute>} />
          <Route path="/eventos" element={<PrivateRoute><Layout><Events /></Layout></PrivateRoute>} />
          <Route path="/pastoral" element={<PrivateRoute><Layout><Pastoral /></Layout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
