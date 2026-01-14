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
  const [esp32Enabled, setEsp32Enabled] = useState(true);
  const [collapsedSessions, setCollapsedSessions] = useState<Set<number>>(new Set());

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${backendUrl}/logs`);
      setLogs(res.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const fetchEsp32Status = async () => {
    try {
      const res = await axios.get(`${backendUrl}/esp32/status`);
      setEsp32Enabled(res.data.esp32Enabled);
    } catch (error) {
      console.error("Error fetching ESP32 status:", error);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchEsp32Status();
    const i = setInterval(() => {
      fetchLogs();
      fetchEsp32Status();
    }, 5000);
    return () => clearInterval(i);
  }, []);

  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm(`Are you sure you want to delete all entries from Session ${sessionId}?`)) {
      return;
    }

    try {
      const res = await axios.delete(`${backendUrl}/logs/session/${sessionId}`);
      if (res.data.success) {
        await fetchLogs();
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("Failed to delete session");
    }
  };

  const handleEsp32Control = async (action: "on" | "off") => {
    try {
      const res = await axios.post(`${backendUrl}/esp32/control`, { action });
      if (res.data.success) {
        setEsp32Enabled(res.data.esp32Enabled);
      }
    } catch (error) {
      console.error("Error controlling ESP32:", error);
      alert("Failed to control ESP32");
    }
  };

  const toggleSession = (sessionId: number) => {
    const newCollapsed = new Set(collapsedSessions);
    if (newCollapsed.has(sessionId)) {
      newCollapsed.delete(sessionId);
    } else {
      newCollapsed.add(sessionId);
    }
    setCollapsedSessions(newCollapsed);
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
            <div className="flex gap-3 items-center">
              {/* ESP32 Control Button */}
              <button
                onClick={() => handleEsp32Control(esp32Enabled ? "off" : "on")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  esp32Enabled
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-green-500 text-white hover:bg-green-600"
                }`}
              >
                {esp32Enabled ? "Turn ESP32 OFF" : "Turn ESP32 ON"}
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ESP32 Status Indicator */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-8 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${esp32Enabled ? "bg-green-500" : "bg-red-500"}`}></div>
            <span className="text-sm font-medium text-gray-700">
              ESP32 Status: <span className={esp32Enabled ? "text-green-600" : "text-red-600"}>
                {esp32Enabled ? "ONLINE" : "OFFLINE"}
              </span>
            </span>
          </div>
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
              {sortedSessions.map((session) => {
                const sessionId = Number(session);
                const isCollapsed = collapsedSessions.has(sessionId);
                return (
                  <div
                    key={session}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleSession(sessionId)}
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                          >
                            {isCollapsed ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </button>
                          <h3 className="font-semibold text-gray-800">
                            Cycle {session}
                          </h3>
                          <p className="text-xs text-gray-600">
                            ({grouped[session].length} detection(s))
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteSession(sessionId)}
                          className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors duration-200"
                        >
                          Delete Cycle
                        </button>
                      </div>
                    </div>
                    {!isCollapsed && (
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
