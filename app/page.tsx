// app/page.tsx
"use client"; // required because we are using hooks (useState, useEffect)

import { useEffect, useState } from "react";
import axios from "axios";

const BACKEND_URL = "https://dosemetic-backend-production.up.railway.app"; // replace with your backend

export default function Page() {
  const [logs, setLogs] = useState<{ cycle: number; status: string; timestamp: number }[]>([]);

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/logs`);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-5 font-sans">
      <h1 className="text-2xl font-bold mb-4">Pill Box Logs</h1>
      {logs.length === 0 ? (
        <p>No logs yet</p>
      ) : (
        <table className="table-auto border border-black">
          <thead>
            <tr>
              <th className="border px-2 py-1">Cycle</th>
              <th className="border px-2 py-1">Status</th>
              <th className="border px-2 py-1">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={index}>
                <td className="border px-2 py-1">{log.cycle}</td>
                <td className="border px-2 py-1">{log.status}</td>
                <td className="border px-2 py-1">
                  {new Date(log.timestamp * 1000).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
