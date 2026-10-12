import React, { useState } from 'react';
import { Search, Sparkles, BookOpen, ExternalLink, Copy, Check, Download, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { PRESET_DIAGRAMS } from '../data/sakuraKnowledge';

const QUICK_TOPICS = [
  { label: 'Web3層冗長構成とELB', query: 'エンハンスドロードバランサ(ELB)を用いた高可用性Web3層アーキテクチャの公式仕様と制限事項' },
  { label: 'VPCルータとIPsec閉域VPN', query: 'VPCルータのIPsec Site-to-Site VPNとVRRP冗長化の設計ポイントおよびIP設計' },
  { label: '石狩・東京 マルチゾーンDR', query: 'GSLBを用いた石狩・東京間のマルチゾーン広域災害対策(DR)構成とフェイルオーバー仕様' },
  { label: 'オブジェクトストレージ(S3互換)', query: 'さくらのクラウド オブジェクトストレージのS3互換性、転送量無料仕様、AWS SDKからの利用方法' },
  { label: 'AWS移行・転送量コスト削減', query: 'AWSからさくらクラウドへの移行におけるデータ転送量課金ゼロのメリットと算出モデル' },
  { label: 'Terraform & Usacloud IaC', query: 'Terraform Provider SakuraCloudを用いたインフラ構築の公式ベストプラクティスとコード例' },
];

export const ResearchAgent: React.FC = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [depth, setDepth] = useState<'overview' | 'deep' | 'architecture'>('deep');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [reportTitle, setReportTitle] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [source, setSource] = useState<string>('');

  // Initial load default report
  React.useEffect(() => {
    handleSearch(QUICK_TOPICS[0].query, 'エンハンスドロードバランサ(ELB)を用いた高可用性Web3層アーキテクチャ');
  }, []);

  const handleSearch = async (targetTopic: string, titleHint?: string) => {
    if (!targetTopic.trim()) return;
    setLoading(true);
    setReportTitle(titleHint || targetTopic);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: targetTopic,
          category: category !== 'all' ? category : undefined,
          depth: depth,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setSource(data.source || 'gemini-3.8-flash');
      }
    } catch (err) {
      console.error('Research error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sakura_cloud_report_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Intro Hero Box */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-rose-950/30 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1 rounded bg-rose-500/20 text-rose-400">
                <BookOpen className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">公式ドキュメント調査エージェント</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              さくらクラウド 公式技術調査 & レポート生成
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              さくらのクラウド公式マニュアル・仕様書・制限事項を元に、実践的な技術レポートを生成します。AWSエンジニア向けに同等サービスとの設計差異やコスト削減効果を詳細にまとめます。
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/70 border border-emerald-800/60 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              公式ドキュメント参照モード
            </span>
          </div>
        </div>

        {/* Search input & depth selector */}
        <div className="mt-5 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="調査したい機能やテーマを入力 (例: VPCルータのVRRP冗長化、S3互換ストレージ、マルチゾーンDR設計)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-sm text-slate-100 placeholder-slate-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-medium text-sm transition shadow-lg shadow-rose-950/40 cursor-pointer"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>調査中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>レポート作成</span>
                </>
              )}
            </button>
          </form>

          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-xs text-slate-400 mr-1">クイック調査:</span>
            {QUICK_TOPICS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(item.query);
                  handleSearch(item.query, item.label);
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 border border-slate-700/80 transition flex items-center gap-1 cursor-pointer"
              >
                <span>{item.label}</span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Official Specs / Preset Overview */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-400" />
              さくらクラウド 重要仕様・設計原則
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="font-semibold text-rose-300 block mb-0.5">① データ転送量完全無料</span>
                仮想サーバ・オブジェクトストレージのアウトバウンド通信料が無料。大容量メディア配信やAPI通信で圧倒的有利。
              </li>
              <li className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="font-semibold text-rose-300 block mb-0.5">② 月額上限付き時間課金</span>
                使った分だけの時間課金だが、月額上限（20日分稼働相当）で自動的に頭打ち。予期せぬ巨額請求の心配なし。
              </li>
              <li className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="font-semibold text-rose-300 block mb-0.5">③ 高機能アプライアンス</span>
                ELB(Let's Encrypt無料SSL・Anycast)、VPCルータ(NAT/VPN/VRRP)、データベース(PostgreSQL/MariaDB)をマネージド提供。
              </li>
              <li className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="font-semibold text-rose-300 block mb-0.5">④ 国内2大拠点・ソブリンクラウド</span>
                石狩DC(北海道)と東京DCの国内完結。海外法リスクを排除した完全国産ソブリンクラウド。
              </li>
            </ul>
          </div>

          {/* Architecture Visual Preview */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">構成イメージ例</h3>
            <p className="text-xs text-slate-400 mb-3">標準Web冗長化と閉域ネットワークのトポロジー</p>
            <ArchitectureDiagram diagram={PRESET_DIAGRAMS.web_ha} height={220} interactive={false} />
          </div>

          {/* Official documentation references */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">公式リファレンスリンク</h3>
            <div className="space-y-1.5 text-xs">
              <a
                href="https://manual.sakura.ad.jp/cloud/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white transition"
              >
                <span>さくらのクラウド 公式マニュアル</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <a
                href="https://cloud.sakura.ad.jp/specification/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white transition"
              >
                <span>サービス仕様・制限事項一覧</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <a
                href="https://usacloud.github.io/usacloud/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white transition"
              >
                <span>Usacloud CLI 公式ガイド</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Column (2 cols): Generated Report Display */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl min-h-[500px]">
            {/* Report Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-mono uppercase text-rose-400 font-semibold tracking-wider">
                  Technical Research Report
                </span>
                <h3 className="text-lg font-bold text-slate-100">
                  {reportTitle || '調査レポート'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  disabled={!report}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'コピー完了' : 'MDコピー'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!report}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>保存 (.md)</span>
                </button>
              </div>
            </div>

            {/* Report Body */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 rounded-full border-3 border-rose-500/30 border-t-rose-500 animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-200">公式ドキュメントを解析中...</p>
                  <p className="text-xs text-slate-400 mt-1">
                    さくらクラウド仕様・AWS比較・アーキテクチャ設計指針をまとめています
                  </p>
                </div>
              </div>
            ) : report ? (
              <div className="mt-5 prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed space-y-4">
                {/* Render report text with formatting */}
                {report.split('\n\n').map((block, idx) => {
                  if (block.startsWith('# ')) {
                    return (
                      <h2 key={idx} className="text-xl font-bold text-white border-b border-slate-800 pb-2 mt-4">
                        {block.replace('# ', '')}
                      </h2>
                    );
                  }
                  if (block.startsWith('## ')) {
                    return (
                      <h3 key={idx} className="text-base font-bold text-rose-300 border-l-2 border-rose-500 pl-3 mt-6">
                        {block.replace('## ', '')}
                      </h3>
                    );
                  }
                  if (block.startsWith('### ')) {
                    return (
                      <h4 key={idx} className="text-sm font-semibold text-slate-200 mt-4">
                        {block.replace('### ', '')}
                      </h4>
                    );
                  }
                  if (block.startsWith('```')) {
                    const lines = block.split('\n');
                    const language = lines[0].replace('```', '') || 'bash';
                    const code = lines.slice(1, -1).join('\n');
                    return (
                      <div key={idx} className="rounded-lg bg-slate-950 border border-slate-800 overflow-hidden font-mono text-xs my-3">
                        <div className="bg-slate-900 px-3 py-1 text-[10px] text-slate-400 uppercase tracking-wider">
                          {language}
                        </div>
                        <pre className="p-3 overflow-x-auto text-emerald-300">
                          <code>{code}</code>
                        </pre>
                      </div>
                    );
                  }
                  if (block.startsWith('- ')) {
                    const listItems = block.split('\n').filter(line => line.startsWith('- '));
                    return (
                      <ul key={idx} className="list-disc list-inside space-y-1.5 text-slate-300 my-2">
                        {listItems.map((item, itemIdx) => (
                          <li key={itemIdx} className="leading-normal">
                            <span dangerouslySetInnerHTML={{
                              __html: item.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100">$1</strong>')
                            }} />
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <p
                      key={idx}
                      className="text-slate-300 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: block.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100">$1</strong>')
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-500">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>上の検索バーから調べたいトピックを選択または入力してください。</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
