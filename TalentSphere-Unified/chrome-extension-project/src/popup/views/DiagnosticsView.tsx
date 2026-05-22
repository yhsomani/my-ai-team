import React from 'react';

interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'warn';
  message: string;
}

interface DiagnosticsViewProps {
  logs: LogEntry[];
  setLogs: (logs: LogEntry[]) => void;
  addLog: (message: string, type?: LogEntry['type']) => void;
  pingWorker: () => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ logs, setLogs, addLog, pingWorker }) => {
  return (
    <div className="space-y-3 flex flex-col h-full" id="view-diagnostics">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-slate-300">Live Background Stream</span>
        <button 
          onClick={() => setLogs([])}
          className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
          id="clear-logs-btn"
        >
          Clear Console
        </button>
      </div>
      
      <div className="flex-1 bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 font-mono text-[10px] space-y-1.5 h-[280px] overflow-y-auto" id="diagnostics-terminal">
        {logs.map((log, idx) => (
          <div key={idx} className="flex items-start space-x-1.5">
            <span className="text-slate-600">[{log.time}]</span>
            <span className={`font-semibold ${
              log.type === 'success' ? 'text-emerald-400' :
              log.type === 'warn' ? 'text-amber-400' :
              'text-cyan-400'
            }`}>
              {log.type === 'success' ? '✔ SUCCESS:' :
               log.type === 'warn' ? '⚠ WARNING:' :
               'ℹ INFO:'}
            </span>
            <span className="text-slate-300">{log.message}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between space-x-2">
        <button
          onClick={() => addLog('Custom testing command triggered manually.', 'info')}
          className="flex-1 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 text-xs py-1.5 rounded-lg transition"
        >
          Simulate Sync
        </button>
        <button
          onClick={pingWorker}
          className="flex-1 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 text-xs py-1.5 rounded-lg transition"
          id="ping-messaging-btn"
        >
          Ping Worker
        </button>
      </div>
    </div>
  );
};
