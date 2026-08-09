import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Demo from './pages/Demo';
import Summary from './pages/Summary';

function Landing() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm text-center">
        <h1 className="text-3xl font-bold mb-4 text-gray-900">FieldReq</h1>
        <p className="text-gray-600 mb-8">SMS Material Outreach Agent</p>
        <div className="space-y-4">
          <Link to="/demo" className="block w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition">
            View Live Demo
          </Link>
          <Link to="/demo/summary" className="block w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition">
            View Summary Page
          </Link>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/demo/summary" element={<Summary />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
