import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function ProvisionManager() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { isAdmin, session } = useAuth();

  if (!isAdmin) {
    return null; // Only admins can see this
  }

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // In a real app, we might call an API to create a stub profile and send a magic link.
    // For this POC, we just send a magic link to the email using Supabase.
    // Supabase signInWithOtp can act as an invite if configured.
    // Wait, let's call our backend to handle provisioning properly if needed.
    // Actually, Magic Link handles it all. Just tell them we sent a login link.

    try {
      const res = await fetch('/api/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ email })
      });

      if (res.ok) {
        setMessage(`Invited ${email} successfully!`);
        setEmail('');
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.error}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border-2 border-indigo-100">
      <h2 className="text-xl font-semibold mb-2 text-indigo-900">Account Provisioning</h2>
      <p className="text-sm text-gray-600 mb-4">Invite boss accounts (Admins only)</p>

      <form onSubmit={handleInvite} className="flex gap-4">
        <input
          type="email"
          placeholder="Boss Email"
          required
          className="flex-1 border p-2 rounded focus:border-indigo-500 outline-none"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Invite'}
        </button>
      </form>
      {message && <p className="mt-4 text-sm text-indigo-700 font-medium">{message}</p>}
    </div>
  );
}

export default ProvisionManager;
