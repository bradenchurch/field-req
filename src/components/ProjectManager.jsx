import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

function ProjectManager() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', address: '', specs: '' });
  const { session } = useAuth();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setForm({ name: '', address: '', specs: '' });
        fetchProjects();
      }
    } catch (err) {
      console.error('Failed to add project:', err);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Project Management</h2>

      <form onSubmit={handleAdd} className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="Project Name"
          required
          className="w-full border p-2 rounded"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Address (optional)"
          className="w-full border p-2 rounded"
          value={form.address}
          onChange={e => setForm({ ...form, address: e.target.value })}
        />
        <textarea
          placeholder="Specs or Context (optional)"
          className="w-full border p-2 rounded"
          rows="2"
          value={form.specs}
          onChange={e => setForm({ ...form, specs: e.target.value })}
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Add Project
        </button>
      </form>

      <div className="space-y-3">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="text-gray-500 text-sm">No projects found.</p>
        ) : (
          projects.map(project => (
            <div key={project.id} className="border-b pb-2">
              <p className="font-medium">{project.name}</p>
              {project.address && <p className="text-sm text-gray-500">{project.address}</p>}
              {project.specs && <p className="text-sm text-gray-600 italic mt-1">{project.specs}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ProjectManager;
