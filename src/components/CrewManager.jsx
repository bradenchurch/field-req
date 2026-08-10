import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

function CrewManager() {
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', language: 'en' });
  const { session } = useAuth();

  const fetchCrew = useCallback(async () => {
    try {
      const res = await fetch('/api/crew', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCrew(data);
      }
    } catch (err) {
      console.error('Failed to fetch crew:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchCrew();
  }, [fetchCrew]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/crew', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setForm({ name: '', phone: '', language: 'en' });
        fetchCrew();
      }
    } catch (err) {
      console.error('Failed to add crew member:', err);
    }
  };

  const handleRemove = async (id) => {
    try {
      const res = await fetch(`/api/crew/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        fetchCrew();
      }
    } catch (err) {
      console.error('Failed to remove crew member:', err);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Crew Management</h2>

      <form onSubmit={handleAdd} className="mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Name"
            required
            className="border p-2 rounded"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <input
            type="tel"
            placeholder="Phone (e.g. +1...)"
            required
            className="border p-2 rounded"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
          />
          <select
            className="border p-2 rounded"
            value={form.language}
            onChange={e => setForm({ ...form, language: e.target.value })}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
          </select>
        </div>
        <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
          Add Crew Member
        </button>
      </form>

      <div className="space-y-3">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading crew...</p>
        ) : crew.length === 0 ? (
          <p className="text-gray-500 text-sm">No crew members found.</p>
        ) : (
          crew.map(member => (
            <div key={member.id} className="flex justify-between items-center border-b pb-2">
              <div>
                <p className="font-medium">{member.name} ({member.language.toUpperCase()})</p>
                <p className="text-sm text-gray-500">{member.phone}</p>
              </div>
              <button
                onClick={() => handleRemove(member.id)}
                className="text-red-500 text-sm hover:underline"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CrewManager;
