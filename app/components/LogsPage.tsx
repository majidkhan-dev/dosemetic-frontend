"use client";

import { useEffect, useState, useRef } from "react";
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
  const [esp32Enabled, setEsp32Enabled] = useState(false); // Backend command state
  const [isOnline, setIsOnline] = useState(false); // Actual online status from heartbeat
  const [wakeUpCountdown, setWakeUpCountdown] = useState<number | null>(null); // Seconds remaining
  const [wakeUpStartTime, setWakeUpStartTime] = useState<number | null>(null); // When wake-up was initiated
  const [collapsedSessions, setCollapsedSessions] = useState<Set<number>>(new Set());
  const wakeUpCountdownRef = useRef<number | null>(null); // Ref to track countdown for async functions
  
  const WAKE_UP_DURATION = 30; // 30 seconds for ESP32 to wake up

  // Format timestamp to Pakistan timezone (Asia/Karachi)
  const formatPakistanTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString("en-PK", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  };

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
      // Only consider online if ESP32 is enabled AND online
      // If disabled, ESP32 may briefly wake up to check status but should be shown as offline
      // Don't update isOnline if we're in wake-up countdown - wait for it to complete
      if (wakeUpCountdownRef.current === null || wakeUpCountdownRef.current <= 0) {
        setIsOnline(res.data.esp32Enabled && res.data.isOnline);
      }
    } catch (error) {
      console.error("Error fetching ESP32 status:", error);
      if (wakeUpCountdownRef.current === null || wakeUpCountdownRef.current <= 0) {
        setIsOnline(false);
      }
    }
  };

  // Clear countdown ONLY when ESP32 is actually online AND countdown has had time to run
  // Don't clear immediately on isOnline change - let countdown run its course
  useEffect(() => {
    // Only clear if ESP32 is online AND countdown is very low (almost finished)
    // This prevents clearing prematurely when ESP32 briefly wakes up
    if (isOnline && esp32Enabled && wakeUpCountdown !== null && wakeUpCountdown <= 5) {
      setWakeUpCountdown(null);
      setWakeUpStartTime(null);
    }
  }, [isOnline, esp32Enabled, wakeUpCountdown]);

  // Update ref whenever countdown changes
  useEffect(() => {
    wakeUpCountdownRef.current = wakeUpCountdown;
  }, [wakeUpCountdown]);

  // Countdown timer for wake-up
  useEffect(() => {
    if (wakeUpCountdown === null || wakeUpCountdown <= 0) {
      return;
    }
    
    const timer = setInterval(() => {
      setWakeUpCountdown((prev) => {
        if (prev === null || prev <= 1) {
          // Countdown finished - check if ESP32 is online now
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [wakeUpCountdown]);

  // When countdown finishes, check ESP32 status
  useEffect(() => {
    if (wakeUpCountdown === null && wakeUpStartTime !== null) {
      // Countdown just finished, fetch status to see if ESP32 is online
      fetchEsp32Status();
      setWakeUpStartTime(null);
    }
  }, [wakeUpCountdown, wakeUpStartTime]);

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
        
        if (action === "on") {
          // Start wake-up countdown and ensure we show as offline initially
          setIsOnline(false); // Reset to offline state
          setWakeUpCountdown(WAKE_UP_DURATION);
          setWakeUpStartTime(Date.now());
        } else {
          // Turning off - clear countdown and force offline
          setWakeUpCountdown(null);
          setWakeUpStartTime(null);
          setIsOnline(false);
        }
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
                onClick={() => handleEsp32Control(isOnline ? "off" : "on")}
                disabled={wakeUpCountdown !== null && wakeUpCountdown > 0}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  wakeUpCountdown !== null && wakeUpCountdown > 0
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : isOnline
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-green-500 text-white hover:bg-green-600"
                }`}
              >
                {wakeUpCountdown !== null && wakeUpCountdown > 0
                  ? "Waking up..."
                  : isOnline
                  ? "Turn ESP32 OFF"
                  : "Turn ESP32 ON"}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                isOnline 
                  ? "bg-green-500 animate-pulse" 
                  : wakeUpCountdown !== null && wakeUpCountdown > 0
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-red-500"
              }`}></div>
              <span className="text-sm font-medium text-gray-700">
                ESP32 Status: <span className={
                  isOnline 
                    ? "text-green-600" 
                    : wakeUpCountdown !== null && wakeUpCountdown > 0
                    ? "text-yellow-600"
                    : "text-red-600"
                }>
                  {isOnline 
                    ? "ONLINE" 
                    : wakeUpCountdown !== null && wakeUpCountdown > 0
                    ? "WAKING UP"
                    : "OFFLINE / IN DEEP SLEEP"}
                </span>
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {isOnline 
                ? "Active and monitoring" 
                : wakeUpCountdown !== null && wakeUpCountdown > 0
                ? "ESP32 is waking up"
                : "Powered off or disconnected"}
            </span>
          </div>
        </div>

        {/* Logs Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Detection Logs
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Times displayed in Pakistan Standard Time (PKT)
              </p>
            </div>
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
                    <div 
                      className={`overflow-hidden transition-all duration-500 ease-in-out ${
                        isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
                      }`}
                    >
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
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
                                  {formatPakistanTime(log.timestamp)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden space-y-3 p-4">
                        {grouped[session].map((log: Log, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                          >
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-500 uppercase">Cycle</span>
                                <span className="text-sm font-semibold text-gray-900">{log.cycle}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-500 uppercase">Status</span>
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    log.status === "DETECTED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {log.status}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-500 uppercase">Timestamp</span>
                                <span className="text-sm text-gray-600 text-right">
                                  {formatPakistanTime(log.timestamp)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
