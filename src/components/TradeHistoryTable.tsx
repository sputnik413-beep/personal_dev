import React, { useState } from 'react';
import {
  History,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { TradeLog } from '../types/scalper';

interface TradeHistoryTableProps {
  tradeLogs: TradeLog[];
}

export const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({ tradeLogs }) => {
  const [filter, setFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');

  const filteredLogs = tradeLogs.filter((log) => {
    if (filter === 'WIN') return log.pipsGain > 0;
    if (filter === 'LOSS') return log.pipsGain < 0;
    return true;
  });

  const exportCSV = () => {
    if (tradeLogs.length === 0) return;
    const header = [
      'TradeID',
      'Pair',
      'Direction',
      'Lots',
      'EntryTime',
      'ExitTime',
      'EntryPrice',
      'ExitPrice',
      'PipsGain',
      'RealizedPnL(JPY)',
      'ExitReason',
      'DurationMinutes',
    ];
    const rows = tradeLogs.map((l) => [
      l.id,
      l.pair,
      l.direction,
      l.lots,
      new Date(l.entryTime).toISOString(),
      new Date(l.exitTime).toISOString(),
      l.entryPrice,
      l.exitPrice,
      l.pipsGain,
      l.realizedPnL,
      l.exitReason,
      l.holdingDurationMinutes,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [header.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `scalping_trade_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#101824] border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800/80 mb-3 gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-sm text-white">
            決済履歴・約定テレメトリ ({tradeLogs.length}件)
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Win/Loss filter */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2 py-1 rounded transition-colors ${
                filter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              すべて ({tradeLogs.length})
            </button>
            <button
              onClick={() => setFilter('WIN')}
              className={`px-2 py-1 rounded transition-colors ${
                filter === 'WIN' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              勝ち ({tradeLogs.filter((t) => t.pipsGain > 0).length})
            </button>
            <button
              onClick={() => setFilter('LOSS')}
              className={`px-2 py-1 rounded transition-colors ${
                filter === 'LOSS' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              負け ({tradeLogs.filter((t) => t.pipsGain < 0).length})
            </button>
          </div>

          <button
            onClick={exportCSV}
            disabled={tradeLogs.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            title="CSVエクスポート"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV出力</span>
          </button>
        </div>
      </div>

      {tradeLogs.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs">
          まだ決済されたトレードはありません。シグナル検出または手動発注により自動でトレードが記録されます。
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-2 pl-2">日時</th>
                <th className="pb-2">通貨 / 売買</th>
                <th className="pb-2">ロット</th>
                <th className="pb-2">約定価格 → 決済価格</th>
                <th className="pb-2">獲得Pips</th>
                <th className="pb-2">実現損益</th>
                <th className="pb-2">決済理由</th>
                <th className="pb-2 pr-2">保有時間</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.slice(0, 50).map((log) => {
                const isWin = log.pipsGain > 0;
                const decimals = log.pair === 'USDJPY' ? 3 : 5;

                return (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-2.5 pl-2 text-slate-400 text-[11px]">
                      {new Date(log.exitTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5">
                      <span className="text-white font-bold mr-1.5">{log.pair}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                          log.direction === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {log.direction}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-300">{log.lots}</td>
                    <td className="py-2.5 text-slate-200">
                      {log.entryPrice.toFixed(decimals)}{' '}
                      <span className="text-slate-500">→</span>{' '}
                      {log.exitPrice.toFixed(decimals)}
                    </td>
                    <td className="py-2.5 font-bold">
                      <span
                        className={`flex items-center ${
                          isWin ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isWin ? (
                          <ArrowUpRight className="w-3.5 h-3.5 inline mr-0.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 inline mr-0.5" />
                        )}
                        {log.pipsGain > 0 ? '+' : ''}
                        {log.pipsGain.toFixed(1)} p
                      </span>
                    </td>
                    <td className="py-2.5 font-bold">
                      <span className={isWin ? 'text-emerald-400' : 'text-rose-400'}>
                        {log.realizedPnL > 0 ? '+' : ''}¥{log.realizedPnL.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          log.exitReason === 'TAKE_PROFIT'
                            ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                            : log.exitReason === 'TRAILING_STOP'
                            ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-700/50'
                            : log.exitReason === 'STOP_LOSS'
                            ? 'bg-rose-900/50 text-rose-300 border border-rose-700/50'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {log.exitReason === 'TAKE_PROFIT'
                          ? '利確 (TP)'
                          : log.exitReason === 'TRAILING_STOP'
                          ? '追従SL'
                          : log.exitReason === 'STOP_LOSS'
                          ? '損切 (SL)'
                          : '手動決済'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 text-slate-400 text-[11px]">
                      {log.holdingDurationMinutes}分
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
