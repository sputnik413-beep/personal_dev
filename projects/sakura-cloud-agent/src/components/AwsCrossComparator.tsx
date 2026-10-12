import React, { useState } from 'react';
import { SAKURA_SERVICES } from '../data/sakuraKnowledge';
import { ArchitectureTranslation, ServiceComparison } from '../types';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { PRESET_DIAGRAMS } from '../data/sakuraKnowledge';
import {
  ArrowLeftRight,
  Sparkles,
  Search,
  ExternalLink,
  Code,
  Check,
  Copy,
  DollarSign,
  TrendingDown,
  Layers,
  HelpCircle,
  Network,
  Cpu,
} from 'lucide-react';

const AWS_PRESET_TEMPLATES = [
  {
    title: '標準Web 3層冗長構成',
    description: 'ALB + EC2 (Web/App) + RDS PostgreSQL Multi-AZ + S3 + NAT Gateway',
    rawText: 'ALB (インターネット公開, SSL終端) + プライベートサブネット内のEC2 2台 (Nginx+Node.js) + RDS PostgreSQL (Multi-AZ冗長化) + S3 (画像保存) + NAT Gateway (外部API通信用)',
  },
  {
    title: '大容量メディア配信・CDN構成',
    description: 'CloudFront + ALB + EC2 + S3 (月間転送量 30TB)',
    rawText: 'CloudFront + ALB + EC2 4台 + S3 (大量の動画・高解像度画像配信。月間アウトバウンド通信量が30TB以上あり、AWSの転送料金が高騰している構成)',
  },
  {
    title: 'オンプレミス閉域VPNハイブリッド構成',
    description: 'Direct Connect / Site-to-Site VPN + VPC + RDS + EC2',
    rawText: 'AWS Site-to-Site VPN (またはDirect Connect) で社内DCとVPCを接続し、オンプレミスの社内システムとクラウド内のWeb/DBシステムが閉域網で通信する構成',
  },
  {
    title: '広域ディザスタリカバリ (DR) 構成',
    description: 'Route 53 DNS Failover + 東京リージョン ＆ 大阪リージョン',
    rawText: 'Route 53のヘルスチェック連携DNSフェイルオーバーを用い、平常時は東京リージョンのWeb/DB、有事には大阪リージョンのスタンバイサイトへ自動切り替える構成',
  },
];

export const AwsCrossComparator: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'translator'>('translator');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Architecture translator state
  const [awsInput, setAwsInput] = useState(AWS_PRESET_TEMPLATES[0].rawText);
  const [useCase, setUseCase] = useState('一般的なEC / Webサービス');
  const [budgetOrTraffic, setBudgetOrTraffic] = useState('月間転送量 約5TB〜10TB');
  const [loading, setLoading] = useState(false);
  const [translationResult, setTranslationResult] = useState<ArchitectureTranslation | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Filter services for matrix
  const categories = ['all', ...Array.from(new Set(SAKURA_SERVICES.map(s => s.category.split(' ')[0])))];

  const filteredServices = SAKURA_SERVICES.filter(s => {
    const matchesCat = selectedCategory === 'all' || s.category.startsWith(selectedCategory);
    const matchesQuery = !searchQuery ||
      s.sakuraName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.awsName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.overview.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleTranslate = async () => {
    if (!awsInput.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/translate-architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          awsArchitecture: awsInput,
          useCase,
          budgetOrTraffic,
        }),
      });

      const data = await res.json();
      if (data.translation) {
        setTranslationResult(data.translation);
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-sky-950/30 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1 rounded bg-sky-500/20 text-sky-400">
                <ArrowLeftRight className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">AWS ✕ さくらクラウド 相互補完</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              AWSアーキテクトのための さくらクラウド翻訳・比較スタジオ
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              普段AWSを使っているエンジニアが、さくらクラウドの同等機能や優位性（データ転送量無料・固定月額など）を直感的にマッピング。構成変換とハイブリッド設計を支援します。
            </p>
          </div>

          {/* Subtabs Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
            <button
              onClick={() => setActiveSubTab('translator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeSubTab === 'translator'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              アーキテクチャ相互変換
            </button>
            <button
              onClick={() => setActiveSubTab('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeSubTab === 'matrix'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              サービス対応対比表
            </button>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: ARCHITECTURE TRANSLATOR */}
      {activeSubTab === 'translator' && (
        <div className="space-y-6">
          {/* Input Panel */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-400" />
              AWS構成を入力して、さくらクラウド等価アーキテクチャへ変換
            </h3>

            {/* Template Presets */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-medium">よくあるAWS構成テンプレートから選ぶ:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {AWS_PRESET_TEMPLATES.map((tmpl, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setAwsInput(tmpl.rawText);
                      setUseCase(tmpl.title);
                    }}
                    className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                      awsInput === tmpl.rawText
                        ? 'bg-rose-950/40 border-rose-500/80 text-rose-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-semibold block text-slate-100 mb-1">{tmpl.title}</span>
                    <span className="text-slate-400 text-[11px] line-clamp-2">{tmpl.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Textarea & Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">AWSアーキテクチャ構成の詳細:</label>
                <textarea
                  rows={4}
                  value={awsInput}
                  onChange={(e) => setAwsInput(e.target.value)}
                  placeholder="AWSで使用しているサービス構成や要件を入力してください..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono"
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">システムの用途 / ユースケース:</label>
                  <input
                    type="text"
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">トラフィック規模・懸念点:</label>
                  <input
                    type="text"
                    value={budgetOrTraffic}
                    onChange={(e) => setBudgetOrTraffic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100"
                  />
                </div>

                <button
                  onClick={handleTranslate}
                  disabled={loading || !awsInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>マッピング解析中...</span>
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="w-4 h-4" />
                      <span>さくらクラウド構成へ変換・分析</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Translation Result View */}
          {translationResult && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Summary Card */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-mono uppercase text-sky-400 font-semibold">
                      Architecture Mapping Blueprint
                    </span>
                    <h3 className="text-lg font-bold text-slate-100">{translationResult.title}</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
                    変換完了
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  {translationResult.summary}
                </p>

                {/* Service Mapping Table */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-rose-400" />
                    サービス対応マッピング表
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
                        <tr>
                          <th className="p-3 w-1/4">AWS サービス</th>
                          <th className="p-3 w-1/4">さくらクラウド 相当サービス</th>
                          <th className="p-3 w-1/6">役割</th>
                          <th className="p-3">設計・運用のポイント</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {translationResult.mappingTable.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/40">
                            <td className="p-3 font-semibold text-sky-300">{item.awsService}</td>
                            <td className="p-3 font-semibold text-rose-300">{item.sakuraService}</td>
                            <td className="p-3 text-slate-400">{item.role}</td>
                            <td className="p-3 text-slate-300 leading-relaxed">{item.considerations}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cost & Spec Advantages */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                      <TrendingDown className="w-4 h-4 text-emerald-400" />
                      <span>データ転送量・コスト優位性</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {translationResult.costAndPerformanceComparison.trafficAdvantage}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <HelpCircle className="w-4 h-4 text-amber-400" />
                      <span>考慮点・AWSとの違いと代替策</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {translationResult.costAndPerformanceComparison.tradeOffs}
                    </p>
                  </div>
                </div>

                {/* Hybrid Recommendation */}
                {translationResult.hybridBlueprint && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/30 to-rose-950/30 border border-slate-700/60 space-y-2">
                    <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                      <Network className="w-4 h-4 text-sky-400" />
                      <span>{translationResult.hybridBlueprint.title}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {translationResult.hybridBlueprint.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Architecture Diagram Visualization */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-rose-400" />
                  さくらクラウド変換後の推奨トポロジー図
                </h4>
                <ArchitectureDiagram
                  diagram={translationResult.architectureDiagram || PRESET_DIAGRAMS.web_ha}
                  height={340}
                  interactive={true}
                />
              </div>

              {/* Terraform IaC Code Snippet */}
              {translationResult.iacSnippet && (
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                      <Code className="w-4 h-4 text-rose-400" />
                      <span>{translationResult.iacSnippet.tool} サンプルコード</span>
                    </div>
                    <button
                      onClick={() => handleCopyCode(translationResult.iacSnippet!.code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'コピー完了' : 'コードコピー'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed">
                    <code>{translationResult.iacSnippet.code}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: SERVICE MATRIX */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="サービス名で検索 (EC2, S3, RDS...)"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none">
              {categories.map((cat, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat === 'all' ? 'すべて' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredServices.map((srv, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-4 shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Category & Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">{srv.category}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {srv.pricingModel}
                    </span>
                  </div>

                  {/* Service Names Comparison */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <span className="text-[10px] font-mono text-rose-400 font-semibold block">さくらのクラウド</span>
                      <span className="text-sm font-bold text-slate-100 block mt-0.5">{srv.sakuraName}</span>
                    </div>
                    <div className="border-l border-slate-800 pl-3">
                      <span className="text-[10px] font-mono text-sky-400 font-semibold block">AWS 相当</span>
                      <span className="text-sm font-bold text-slate-200 block mt-0.5">{srv.awsName}</span>
                    </div>
                  </div>

                  {/* Overview */}
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {srv.overview}
                  </p>

                  {/* Key Differences */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-200 block">主な設計・仕様の相違点:</span>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {srv.differences.map((diff, dIdx) => (
                        <li key={dIdx} className="flex items-start gap-1.5">
                          <span className="text-rose-400 text-xs shrink-0">•</span>
                          <span className="leading-normal">{diff}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer link */}
                <div className="pt-3 border-t border-slate-800/80 flex justify-end">
                  <a
                    href={srv.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium transition"
                  >
                    <span>公式仕様書</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
