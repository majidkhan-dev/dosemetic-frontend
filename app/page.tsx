"use client";

import { useEffect, useState } from "react";
import axios from "axios";

const BACKEND_URL = "https://dosemetic-backend-production.up.railway.app";

type Log = {
  session: number;
  cycle: number;
  status: string;
  timestamp: number;
};

export default function Page() {
  const [logs, setLogs] = useState<Log[]>([]);

  const fetchLogs = async () => {
    const res = await axios.get(`${BACKEND_URL}/logs`);
    setLogs(res.data);
  };

  useEffect(() => {
    fetchLogs();
    const i = setInterval(fetchLogs, 5000);
    return () => clearInterval(i);
  }, []);

  const grouped = logs.reduce((acc: any, log) => {
    acc[log.session] = acc[log.session] || [];
    acc[log.session].push(log);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dosematic Logs</h1>

      {Object.keys(grouped).length === 0 && <p>No data yet</p>}

      {Object.entries(grouped).map(([session, entries]: any) => (
        <div key={session} className="mb-6">
          <h2 className="font-semibold mb-2">
            Iteration {session}
          </h2>

          <table className="border">
            <thead>
              <tr>
                <th className="border px-2">Cycle</th>
                <th className="border px-2">Status</th>
                <th className="border px-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((l: Log, i: number) => (
                <tr key={i}>
                  <td className="border px-2">{l.cycle}</td>
                  <td className="border px-2">{l.status}</td>
                  <td className="border px-2">
                    {new Date(l.timestamp * 1000).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
