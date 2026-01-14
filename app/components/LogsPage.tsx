"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface LogsPageProps {
  onLogout: () => void;
  backendUrl: string;
}

type Log = {
  session: number;
  cycle: number;
  status: string;
  timestamp: number;
};

export default function LogsPage({ onLogout, backendUrl }: LogsPageProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${backendUrl}/logs`);
      setLogs(res.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  useEffect(() => {
    fetchLogs();
    const i = setInterval(fetchLogs, 5000);
    return () => clearInterval(i);
  }, []);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    setPinSuccess(false);
    setIsLoading(true);

    try {
      const res = await axios.post(`${backendUrl}/disable-buzzer`, { pin });
      if (res.data.success) {
        setPinSuccess(true);
        setPin("");
        setTimeout(() => setPinSuccess(false), 2000);
      } else {
        setPinError(res.data.message || "Invalid PIN");
      }
    } catch (error: any) {
      setPinError(
        error.response?.data?.message || "Failed to disable buzzer"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const grouped = logs.reduce((acc: any, log) => {
    acc[log.session] = acc[log.session] || [];
    acc[log.session].push(log);
    return acc;
  }, {});

  const sortedSessions = Object.keys(grouped).sort(
    (a, b) => Number(b) - Number(a)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Dosematic Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Real-time pill detection logs
              </p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* PIN Control Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Buzzer Control
          </h2>
          <form onSubmit={handlePinSubmit} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setPinError("");
                }}
                placeholder="Enter PIN to disable buzzer (1 second)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 outline-none"
                maxLength={10}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !pin.trim()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
            >
              {isLoading ? "Processing..." : "Disable Buzzer"}
            </button>
          </form>
          {pinError && (
            <p className="mt-2 text-sm text-red-600 animate-fade-in">
              {pinError}
            </p>
          )}
          {pinSuccess && (
            <p className="mt-2 text-sm text-green-600 animate-fade-in">
              ✓ Buzzer disabled for 1 second
            </p>
          )}
        </div>

        {/* Logs Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Detection Logs
            </h2>
            <span className="text-sm text-gray-500">
              Total: {logs.length} entries
            </span>
          </div>

          {sortedSessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">No data yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Waiting for ESP32 to send detection data...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedSessions.map((session) => (
                <div
                  key={session}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
                >
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800">
                      Session {session}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      {grouped[session].length} detection(s)
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Cycle
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Timestamp
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {grouped[session].map((log: Log, idx: number) => (
                          <tr
                            key={idx}
                            className="hover:bg-gray-50 transition-colors duration-150"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {log.cycle}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  log.status === "DETECTED"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {new Date(log.timestamp * 1000).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
