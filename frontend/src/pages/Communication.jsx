import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Send, Mail, Users, Megaphone } from 'lucide-react';

export default function Communication() {
  const [tab, setTab] = useState('enviar');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'enviar', label: 'Enviar', icon: Send },
          { id: 'anuncios', label: 'Anuncios', icon: Megaphone },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t.id ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            <t.icon className="w-4 h-4 inline mr-1" />{t.label}
          </button>
        ))}
      </div>
      {tab === 'enviar' && <div className="card"><h3 className="font-semibold mb-2 dark:text-white">Enviar Comunicación</h3><p className="text-gray-500 text-sm">Módulo de comunicaciones</p></div>}
      {tab === 'anuncios' && <div className="card"><h3 className="font-semibold mb-2 dark:text-white">Anuncios</h3><p className="text-gray-500 text-sm">Módulo de anuncios</p></div>}
    </div>
  );
}
