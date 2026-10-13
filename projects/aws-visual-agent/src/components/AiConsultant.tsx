import React, { useState } from 'react';
import { AwsConsultationResponse } from '../types';
import { AWS_MENTAL_MODELS } from '../data/awsKnowledge';
import { VisualDiagram } from './VisualDiagram';
import {
  Sparkles,
  Send,
  Code,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Check,
  Copy,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Zap,
  Network
} from 'lucide-react';

const APP_DEV_QUESTION_PRESETS = [
  {
    label: 'Step Functions ✕ SQS ✕ Lambda 非同期バッチ',
    query: '重いデータ処理をWeb APIから同期実行せず、SQSとStep Functionsを使ってリトライやDLQを担保する設計と通信フローはどう組むべきですか？'
  },
  {
    label: 'EventBridge マイクロサービス疎結合',
    query: 'マイクロサービス間でREST APIを直呼びせず、EventBridgeのカスタムイベントバスを使ってPub/Sub連携するパターンの構成とメリットは？'
  },
  {
    label: 'CloudFront ✕ S3 OAC & 署名付きURL',
    query: 'S3のパブリックアクセスを完全遮断しつつ、CloudFrontのOACと署名付きURLを使って特定ユーザーだけにセキュア配信する設定手順とバケットポリシーは？'
  },
  {
    label: 'VPC内Lambda ✕ OpenSearch SigV4認証',
    query: 'VPCプライベートサブネット内のOpenSearch ServiceへLambdaから安全に接続し、IAM SigV4署名で検索クエリを発行する構成とセキュリティグループの急所は？'
  },
  {
    label: 'FSx for NetApp ONTAP Multi-AZ マウント',
    query: 'アプリコンテナやEC2からFSx for NetApp ONTAPをNFSマウントする際、Multi-AZのフローティングIPやルートテーブル、セキュリティグループはどう設計しますか？'
  },
  {
    label: 'VPC基礎: なぜLambdaが外に出られないのか',
    query: 'LambdaをVPCにアタッチした途端に外部インターネット（外部API）に繋がらなくなる原因と、NAT GatewayやVPCエンドポイントを使った正しい解決策は？'
  }
];

export const AiConsultant: React.FC = () => {
  const [query, setQuery] = useState(APP_DEV_QUESTION_PRESETS[0].query);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AwsConsultationResponse | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Initialize with the first model
  React.useEffect(() => {
    handleConsult(APP_DEV_QUESTION_PRESETS[0].query);
  }, []);

  const handleConsult = async (targetQuery: string) => {
    if (!targetQuery.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: targetQuery }),
      });

      const data = await res.json();
      if (data.consultation) {
        setResponse(data.consultation);
      }
    } catch (err) {
      console.error('Consultation error:', err);
      // Fallback from knowledge base
      const matched = AWS_MENTAL_MODELS[0];
      setResponse({
        title: matched.title,
        targetServices: ['Step Functions', 'SQS', 'Lambda'],
        devSummary: matched.summary,
        mentalModelExplanation: matched.whyThisWay.join('\n\n'),
        diagram: matched.diagram,
        packetFlow: matched.diagram.packetFlowSteps || [],
        infraKeyPoints: [
          {
            category: 'ネットワーク & 可視性',
            title: 'SQS可視性タイムアウトとLambdaタイムアウト',
            explanation: 'SQSのVisibility Timeoutは必ずLambdaのタイムアウトの6倍程度に設定します。',
            pitfall: matched.commonPitfall
          }
        ],
        codeSnippet: matched.solutionCode ? {
          language: 'json',
          title: matched.solutionCode.tool,
          code: matched.solutionCode.code
        } : undefined
      });
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
      {/* Search & Prompt Box */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-950/30 border border-slate-800 shadow-xl space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 rounded bg-amber-500/20 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              アプリ開発者のためのAWS技術相談 ✕ アーキテクチャ図解生成
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            AWS実装イメージ・疑問解消エージェント
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            「基盤の知識に自信がない」「VPCやセキュリティグループ、IAMロールがどう繋がっているか分からない」というアプリ開発者向けに、直感的なメンタルモデルと動的構成図でわかりやすく解説します。
          </p>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConsult(query);
          }}
          className="space-y-3"
        >
          <div className="relative">
            <textarea
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="聞きたいAWS構成や疑問を入力してください（例: EventBridgeとSQSの組み合わせ、S3とCloudFront OAC、VPC内LambdaとOpenSearch、FSx ONTAPマウントなど）"
              className="w-full p-3.5 pr-28 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-sans"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2.5 bottom-3.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>解析中...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>質問する</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-xs text-slate-400 font-medium">頻出の質問プリセットから選ぶ:</span>
            <div className="flex flex-wrap gap-1.5">
              {APP_DEV_QUESTION_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(p.query);
                    handleConsult(p.query);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-amber-950/50 hover:text-amber-300 text-slate-400 border border-slate-800 text-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <span>{p.label}</span>
                  <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* Result Display */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4 p-8 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="w-12 h-12 rounded-full border-3 border-amber-500/30 border-t-amber-500 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-bold text-slate-200">AWSアーキテクチャと通信フローを構築中...</p>
            <p className="text-xs text-slate-400 mt-1">
              アプリ開発者目線でのメンタルモデルとパケットシーケンス図を描画しています
            </p>
          </div>
        </div>
      ) : response ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Summary & Mental Model Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono uppercase text-amber-400 font-semibold tracking-wider">
                  AWS Architecture Consultation
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-100">{response.title}</h3>
              </div>
              <div className="flex items-center gap-1.5">
                {response.targetServices.map((srv: string, sIdx: number) => (
                  <span
                    key={sIdx}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60"
                  >
                    {srv}
                  </span>
                ))}
              </div>
            </div>

            {/* Dev Summary */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                <BookOpen className="w-3.5 h-3.5" />
                アプリ開発者向け要約（結論）
              </span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {response.devSummary}
              </p>
            </div>

            {/* Why This Way Mental Model */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-sky-400" />
                なぜこの基盤設計が必要なのか？（メンタルモデル）
              </span>
              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 whitespace-pre-line">
                {response.mentalModelExplanation}
              </div>
            </div>
          </div>

          {/* Dynamic SVG Architecture Diagram with Packet Flow Stepper */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>推奨アーキテクチャ・ネットワーク構成図</span>
              </h4>
              <span className="text-xs text-slate-400">ステップボタンをクリックして通信の流れをトレース</span>
            </div>
            <VisualDiagram diagram={response.diagram} height={390} interactive={true} />
          </div>

          {/* Infrastructure Key Points & Pitfalls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {response.infraKeyPoints.map((kp: any, kIdx: number) => (
              <div
                key={kIdx}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      {kp.category}
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{kp.title}</span>
                  </h5>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {kp.explanation}
                  </p>
                </div>

                {kp.pitfall && (
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-300 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>アプリ開発者がハマりやすい落とし穴:</span>
                    </div>
                    <p className="leading-relaxed">{kp.pitfall}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Code Snippet (CDK / Terraform / App Code) */}
          {response.codeSnippet && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <Code className="w-4 h-4 text-amber-400" />
                  <span>{response.codeSnippet.title}</span>
                </div>
                <button
                  onClick={() => handleCopyCode(response.codeSnippet!.code)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'コピー完了' : 'コードコピー'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed">
                <code>{response.codeSnippet.code}</code>
              </pre>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
