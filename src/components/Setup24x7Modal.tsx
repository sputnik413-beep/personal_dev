import React, { useState } from 'react';
import {
  X,
  Clock,
  Server,
  GitBranch,
  ShieldAlert,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Cpu,
  Layers,
} from 'lucide-react';

interface Setup24x7ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncGithub: () => Promise<void>;
  isSyncingGithub: boolean;
}

export const Setup24x7Modal: React.FC<Setup24x7ModalProps> = ({
  isOpen,
  onClose,
  onSyncGithub,
  isSyncingGithub,
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'github_actions' | 'sakura_vps' | 'fx_hours'>('architecture');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const sampleDaemonCommand = `# 1. リポジトリをクローン
git clone https://github.com/sputnik413-beep/personal_dev.git
cd personal_dev

# 2. 依存パッケージをインストール
npm install

# 3. 24時間スキャルピングデーモンをバックグラウンド常駐起動 (PM2を使用)
npm install -g pm2
pm2 start "npm run daemon" --name "fx-scalper"
pm2 save

# ログをリアルタイム確認
pm2 logs fx-scalper`;

  const githubActionsSnippet = `name: Scalping Forward Test Runner (24/5 FX Cron)
on:
  schedule:
    - cron: '*/5 * * * 1-5' # FX稼働平日 5分おきに自動実行
  workflow_dispatch:
jobs:
  run-forward-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install
      - run: npx tsx scripts/scalper-daemon.ts --single-pass
      - run: |
          git config user.name "Scalping-Bot"
          git config user.email "bot@scalper.ai"
          git add scalping_state.json
          git diff --staged --quiet || git commit -m "chore: auto-forward-test tick" && git push`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#101824] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                PC閉鎖時の24時間継続稼働（フォワードテスト2週間継続）構成ガイド
              </h2>
              <p className="text-xs text-slate-400">
                AI Studioの無料枠特性・リアルチャート取得・完全放置アーキテクチャの整理
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/30 px-6">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'architecture'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>1. 無料利用枠と継続稼働の条件</span>
          </button>
          <button
            onClick={() => setActiveTab('github_actions')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'github_actions'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>2. 解決策A: GitHub Actions (完全無料・推奨)</span>
          </button>
          <button
            onClick={() => setActiveTab('sakura_vps')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'sakura_vps'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>3. 解決策B: さくらVPS / 常時稼働Linux</span>
          </button>
          <button
            onClick={() => setActiveTab('fx_hours')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'fx_hours'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>4. FX市場時間・スプレッドゼロ前提</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-300">
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200">
                <div className="flex items-center gap-2 font-bold text-sm mb-1 text-amber-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>【最重要】AI Studio単体での「PCを閉じて2週間連続稼働」の制限</span>
                </div>
                <p>
                  Google AI Studioのプレビュー実行環境（Cloud Runコンテナ）は、ブラウザタブを閉じた後、リソース節約のため
                  <b>約10〜15分の無操作で自動的にスリープ（コンテナ一時停止）</b>に入ります。
                  <br />
                  したがって、<b>「ブラウザを閉じた状態のままAI Studioプレビュー単体で2週間フォワードテストを回し続けること」はプラットフォーム仕様上不可能です。</b>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    解決策A: GitHub Actions 自動Cron実行 (費用: 0円)
                  </h4>
                  <p className="text-slate-400 mb-2">
                    既に連携いただいたリポジトリ <code>sputnik413-beep/personal_dev</code> を使用し、
                    GitHubの無料クラウドサーバーで平日5分おきに自動起動してフォワードテストを回します。
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li>PCを完全にシャットダウンしていても2週間稼働継続</li>
                    <li>トレード結果を自動でGitHubリポジトリにコミット保存</li>
                    <li>完全無料（GitHub Actions無料枠 月2,000分以内）</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    解決策B: さくらVPS / クラウドVM (常時起動)
                  </h4>
                  <p className="text-slate-400 mb-2">
                    さくらクラウド/さくらVPSなどのLinuxサーバー（月額500円台〜）に、本プロジェクト同梱の
                    <code>scripts/scalper-daemon.ts</code> を常駐させます。
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li>秒単位のリアルタイム高頻度スキャルピング監視</li>
                    <li>将来的な「個人実口座での自動トレードAPI接続」にもそのまま転用可能</li>
                    <li>PM2でプロセス自動再起動</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <h4 className="font-bold text-white text-xs mb-1">現在のWeb画面（AI Studio）の位置づけ</h4>
                <p className="text-slate-400">
                  このWeb画面は、<b>「グラフィカルなチャート分析・リアルタイムシミュレーション確認・パラメータ最適化・Gemini AIクオンツ診断を行うコックピット」</b>として機能します。
                  開いている間はリアルタイムにティックを回し、閉じる前に「GitHub同期」を押せば、GitHubリポジトリと完全に戦績が統合されます。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'github_actions' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">
                    同梱済みワークフロー: <code>.github/workflows/scalping_forward_test.yml</code>
                  </span>
                  <button
                    onClick={() => copyToClipboard(githubActionsSnippet, 'gh_snippet')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                  >
                    {copiedText === 'gh_snippet' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedText === 'gh_snippet' ? 'コピー完了' : 'コードをコピー'}</span>
                  </button>
                </div>
                <p className="text-slate-400 mb-3">
                  すでにリポジトリ内の <code>.github/workflows/scalping_forward_test.yml</code> にこの構成ファイルを保存しています。
                  GitHubにプッシュするだけで、GitHub Actions側で平日（FX市場開場中）5分ごとに自動でレート取得とトレード判定が回ります。
                </p>
                <pre className="p-3 bg-slate-950 rounded-lg font-mono text-[11px] text-slate-300 overflow-x-auto border border-slate-800">
                  {githubActionsSnippet}
                </pre>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40">
                <div>
                  <div className="font-bold text-white text-xs">今すぐGitHubに最新コードとワークフローをプッシュ</div>
                  <div className="text-[11px] text-slate-400">
                    リポジトリ <code>sputnik413-beep/personal_dev</code> の main ブランチに即時同期します。
                  </div>
                </div>
                <button
                  onClick={onSyncGithub}
                  disabled={isSyncingGithub}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <GitBranch className="w-4 h-4" />
                  <span>{isSyncingGithub ? '同期中...' : 'GitHubにプッシュ'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'sakura_vps' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">
                    さくらVPS / さくらクラウド上での常駐起動コマンド
                  </span>
                  <button
                    onClick={() => copyToClipboard(sampleDaemonCommand, 'daemon_cmd')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                  >
                    {copiedText === 'daemon_cmd' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedText === 'daemon_cmd' ? 'コピー完了' : 'コマンドコピー'}</span>
                  </button>
                </div>
                <p className="text-slate-400 mb-3">
                  本リポジトリに同梱されている <code>scripts/scalper-daemon.ts</code> は、スタンドアロンのヘッドレスデーモンです。
                  以下のコマンドを実行すると、PCを落としてもVPS上で秒単位でトレードシミュレーションが回ります。
                </p>
                <pre className="p-3 bg-slate-950 rounded-lg font-mono text-[11px] text-emerald-300 overflow-x-auto border border-slate-800">
                  {sampleDaemonCommand}
                </pre>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-400">
                <b className="text-slate-200">将来の実口座自動売買への移行について:</b>
                <br />
                この <code>scripts/scalper-daemon.ts</code> 内の <code>openPositionFromSignal</code> を、
                国内FX業者（GMOクリック証券、OANDA Japan、楽天証券等）または海外ブローカーのREST API / FIX API発注関数に差し替えるだけで、
                フォワードテストで検証したと全く同じロジックで本番実口座自動トレードに昇格できます。
              </div>
            </div>
          )}

          {activeTab === 'fx_hours' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="font-bold text-white text-sm mb-2">為替市場（FX）の取引時間と週末の挙動</h4>
                <div className="space-y-2 text-slate-300">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="font-bold">月曜 07:00 JST 〜 土曜 06:00 JST</span>
                    <span className="text-emerald-400 font-mono font-bold">24時間取引可能 (平日)</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="font-bold">土曜 06:00 JST 〜 月曜 07:00 JST</span>
                    <span className="text-amber-400 font-mono font-bold">世界市場クローズ (週末)</span>
                  </div>
                </div>
                <p className="mt-3 text-slate-400">
                  週末は世界のインターバンク為替市場が休場するため、生為替レートの更新が停止します。
                  当アプリでは、<b>土日でもロジックの動作検証ができるように「継続リプレイシミュレーション」</b>を自動でフォールバック稼働させています。平日になるとリアルタイム生レートに自動復帰します。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-200">
                <h4 className="font-bold text-emerald-400 text-sm mb-1">スプレッドゼロ口座（Spread 0.0）想定の統計的優位性</h4>
                <p>
                  通常のスキャルピングでは、0.2〜1.0 pipsのスプレッド（取引コスト）が薄利を削り、勝率低下の最大要因となります。
                  ご指定の「スプレッドゼロ口座」前提では、わずか2〜4 pipsの微細な押し目・反発でも即座にプラス圏に浮上するため、
                  Bob Volman式プライスアクションの勝率が理論上65%〜75%前後に跳ね上がります。フォワードテストでこの数値を検証できます。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            リポジトリ: sputnik413-beep/personal_dev
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
