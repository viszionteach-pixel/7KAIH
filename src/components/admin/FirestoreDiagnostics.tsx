import React, { useState } from 'react';
import { Activity, Database, CheckCircle, AlertTriangle, XCircle, RefreshCw, Terminal, Copy, Check } from 'lucide-react';
import { runFirestoreDiagnostics, FirestoreDiagnosticResult } from '../../services/firebase';

export const FirestoreDiagnostics: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<FirestoreDiagnosticResult | null>(null);
  const [copiedConsoleTip, setCopiedConsoleTip] = useState(false);

  const executeDiagnostics = async () => {
    setIsRunning(true);
    try {
      const result = await runFirestoreDiagnostics();
      setDiagnosticResult(result);
    } catch (error) {
      console.error('[FirestoreDiagnostics Component Error]', error);
    } finally {
      setIsRunning(false);
    }
  };

  const copyConsoleCommand = () => {
    navigator.clipboard.writeText('window.runFirestoreDiagnostics()');
    setCopiedConsoleTip(true);
    setTimeout(() => setCopiedConsoleTip(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              Firestore Database Diagnostics Utility
            </h3>
            <p className="text-xs text-slate-400">
              Verifies collection references, access permissions, network latency, and logs output to browser console.
            </p>
          </div>
        </div>

        <button
          id="btn-run-firestore-diagnostics"
          onClick={executeDiagnostics}
          disabled={isRunning}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md hover:shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </button>
      </div>

      {/* Developer Console Tip */}
      <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 px-4 py-3 rounded-lg text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2 overflow-hidden">
          <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-400 shrink-0">Browser Console:</span>
          <code className="text-emerald-300 font-semibold truncate">window.runFirestoreDiagnostics()</code>
        </div>
        <button
          id="btn-copy-console-cmd"
          onClick={copyConsoleCommand}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors shrink-0 cursor-pointer"
        >
          {copiedConsoleTip ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          <span>{copiedConsoleTip ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Results View */}
      {diagnosticResult && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-950/50 border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Overall Firestore Status:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  diagnosticResult.overallStatus === 'HEALTHY'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : diagnosticResult.overallStatus === 'DEGRADED'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {diagnosticResult.overallStatus === 'HEALTHY' && <CheckCircle className="w-3.5 h-3.5" />}
                {diagnosticResult.overallStatus === 'DEGRADED' && <AlertTriangle className="w-3.5 h-3.5" />}
                {diagnosticResult.overallStatus === 'DISCONNECTED' && <XCircle className="w-3.5 h-3.5" />}
                {diagnosticResult.overallStatus}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-slate-400 font-mono">
              <div>Project: <span className="text-white font-semibold">{diagnosticResult.projectId}</span></div>
              <span className="hidden sm:inline text-slate-600">•</span>
              <div>DB Instance: <span className="text-amber-300 font-semibold">{diagnosticResult.databaseId}</span></div>
            </div>
          </div>

          {/* Collection Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/40">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Collection</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Documents</th>
                  <th className="px-4 py-2.5 text-right">Latency</th>
                  <th className="px-4 py-2.5">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {diagnosticResult.collections.map((col) => (
                  <tr key={col.name} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-slate-200 flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-slate-400" />
                      {col.name}
                    </td>
                    <td className="px-4 py-2.5">
                      {col.accessible ? (
                        <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> OK
                        </span>
                      ) : (
                        <span className="text-rose-400 font-semibold inline-flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{col.docCount} docs</td>
                    <td className="px-4 py-2.5 text-right text-amber-300 font-medium">{col.latencyMs} ms</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                          col.fromCache ? 'bg-slate-800 text-slate-300' : 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                        }`}
                      >
                        {col.fromCache ? 'Cache' : 'Cloud Server'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Detailed logs and object structures are automatically printed to the browser Developer Console (F12 / Inspect &gt; Console).
          </p>
        </div>
      )}
    </div>
  );
};
