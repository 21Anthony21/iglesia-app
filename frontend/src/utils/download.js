import api from './api';

export async function downloadFile(url, filename) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url.startsWith('http') ? url : `/api${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Error al descargar');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || 'download';
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('Download error:', err);
    alert('Error al descargar el archivo');
  }
}
