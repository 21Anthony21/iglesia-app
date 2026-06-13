import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Calendar, Plus, X } from 'lucide-react';

export default function Events() {
  const [tab, setTab] = useState('eventos');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'eventos', label: 'Eventos', icon: Calendar },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t.id ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            <t.icon className="w-4 h-4 inline mr-1" />{t.label}
          </button>
        ))}
      </div>
      {tab === 'eventos' && <div className="card"><h3 className="font-semibold mb-2 dark:text-white">Eventos</h3><p className="text-gray-500 text-sm">Módulo de eventos</p></div>}
    </div>
  );
}
