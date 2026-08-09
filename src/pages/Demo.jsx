import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Demo() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchResponses = async () => {
    try {
      const res = await fetch('/api/check-in/responses');
      if (res.ok) {
        const data = await res.json();
        setResponses(data);
      }
    } catch (err) {
      console.error("Failed to fetch responses", err);
    }
  };

  useEffect(() => {
    fetchResponses();
    const interval = setInterval(fetchResponses, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStartCheckIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/check-in/send', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to start check-in');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">FieldReq Live Demo</h1>
            <p className="text-sm text-gray-500">Real-time SMS responses</p>
          </div>
          <Link to="/" className="text-blue-600 hover:underline">Back to Home</Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Crew Status</h2>
            <button
              onClick={handleStartCheckIn}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'Sending...' : 'Start Check-in'}
            </button>
          </div>

          {error && <div className="text-red-500 mb-4">{error}</div>}

          <div className="space-y-4">
            {responses.length === 0 ? (
              <p className="text-gray-500 text-center py-8 border-2 border-dashed rounded">
                No responses yet. Click "Start Check-in" to begin.
              </p>
            ) : (
              responses.map((resp, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row border-b pb-4 mb-4 last:border-0">
                  <div className="w-full sm:w-1/3 mb-2 sm:mb-0">
                    <p className="font-semibold">{resp.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{resp.phone}</p>
                  </div>
                  <div className="w-full sm:w-2/3">
                    <p className="bg-gray-100 p-3 rounded-lg text-gray-800">
                      {resp.message || '(Empty response)'}
                    </p>
                    <div className="flex mt-2 space-x-2 text-xs">
                      {resp.intent && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Intent: {resp.intent}
                        </span>
                      )}
                      {resp.language === 'es' && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Spanish Detected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-center mt-8">
          <Link to="/demo/summary" className="text-blue-600 hover:underline">
            View Friday Summary Email Demo &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Demo;
