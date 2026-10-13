import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  Code,
  Search,
  Check,
  Copy
} from 'lucide-react';

interface PitfallItem {
  id: string;
  category: string;
  targetServices: string;
  symptom: string;
  cause: string;
  solution: string;
  codeSnippet?: {
    tool: string;
    code: string;
  };
}

const PITFALLS_LIST: PitfallItem[] = [
  {
    id: 'lambda_vpc_internet',
    category: 'VPC & ネットワーク',
    targetServices: 'Lambda / VPC / NAT Gateway',
    symptom: 'LambdaをVPCにアタッチした途端、Stripeや外部APIへのHTTPリクエストが15秒タイムアウト（ETIMEDOUT）する。',
    cause: 'VPCのプライベートサブネットにはインターネットへの直通経路がありません。パブリックサブネットに配置しても、LambdaはENIにパブリックIPを持てない仕様のため、そのままでは外に出られません。',
    solution: '「パブリックサブネット（0.0.0.0/0 -> IGW）にNAT Gatewayを1台配置」し、「Lambdaが所属するプライベートサブネットのルートテーブルで 0.0.0.0/0 -> nat-xxxx」を設定します。またS3宛て通信なら無料のGatewayエンドポイントを張ることでNAT課金を回避できます。',
    codeSnippet: {
      tool: 'Terraform (Private Subnet Route Table)',
      code: `resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
}`
    }
  },
  {
    id: 'cloudfront_s3_oac_403',
    category: 'Web配信 & 認証',
    targetServices: 'CloudFront / S3 (OAC)',
    symptom: 'S3にアップロードしたファイル（例: /logo.png）をCloudFrontのURL経由で開くと「403 AccessDenied」になる。',
    cause: 'S3バケットポリシーにCloudFront OAC（Origin Access Control）を許可するステートメントが書かれていない、またはバケットがKMS暗号化されている場合にKMSキーポリシーでCloudFrontへの復号（kms:Decrypt）許可が抜けています。',
    solution: 'S3バケットポリシーのPrincipalに `cloudfront.amazonaws.com` を指定し、ConditionでディストリビューションARNを限定。KMS暗号化の場合はKMSキーポリシーにも同様にCloudFrontサービスプリンシパルを許可します。',
    codeSnippet: {
      tool: 'S3 Bucket Policy Statement',
      code: `{
  "Effect": "Allow",
  "Principal": { "Service": "cloudfront.amazonaws.com" },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::my-bucket/*",
  "Condition": {
    "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/E12345EXAMPLE" }
  }
}`
    }
  },
  {
    id: 'sqs_lambda_double_execution',
    category: '非同期 & キューイング',
    targetServices: 'SQS / Lambda',
    symptom: 'SQSメッセージが処理中なのに、別のLambdaワーカーが同じメッセージを並列取得してしまい、決済やDB挿入が二重実行される。',
    cause: 'SQSの可視性タイムアウト（Visibility Timeout）が、Lambdaの実行タイムアウト（例: 30秒）以下または短すぎるため、処理完了前にメッセージの不可視状態が解除されて再配信されています。',
    solution: 'SQSのVisibility Timeoutは、必ず「Lambda関数のTimeoutの6倍（または最低でも+数分）」に設定します。また、Lambdaの処理自体の冪等性（Idempotency: 同じメッセージIDはスキップする）をDynamoDBやRedisで担保します。'
  },
  {
    id: 'opensearch_sigv4_403',
    category: '検索 & IAM認証',
    targetServices: 'OpenSearch / Lambda',
    symptom: 'VPC内OpenSearchにLambdaから検索クエリを投げると「403 Forbidden: User not authorized」と返される。',
    cause: 'OpenSearchのFGAC（きめ細かなアクセスコントロール）環境では、単なるBearerトークンやBasic認証ではなく、AWS SigV4（Signature Version 4）署名ヘッダーを付与してリクエストを送る必要があります。またOpenSearch内ロールにLambda IAMロールをマッピングしていない場合も拒絶されます。',
    solution: 'Node.jsでは `@aws-sdk/signature-v4` と `@smithy/protocol-http` を使い、リクエストにSigV4署名を付与してOpenSearchへPOSTします。またOpenSearch Dashboardsの「Security > Roles」でLambdaのIAM Role ARNを「all_access」または「read_only」にマッピングします。'
  },
  {
    id: 'fsx_ontap_mount_timeout',
    category: 'エンタープライズストレージ',
    targetServices: 'FSx for NetApp ONTAP / EC2 / ECS',
    symptom: 'mount -t nfs でFSx ONTAPをマウントしようとすると「Connection timed out」または「Access denied」で止まる。',
    cause: 'FSx ONTAPのファイルシステムに割り当てられたセキュリティグループで、クライアント側（EC2/コンテナ）からのPort 2049 (NFS) または 445 (SMB) のインバウンド通信が許可されていない。またはMulti-AZ構成でクライアントのサブネットのルートテーブルにフローティングIP宛てのルートが記載されていない。',
    solution: 'FSx ONTAPのSecurity Groupに「NFS (TCP/UDP 2049)」「SMB (TCP 445)」をクライアントのセキュリティグループIDまたはCIDRから許可。Multi-AZの場合はSVMのエンドポイントIP解決が正しく通っているかをnslookupで確認します。'
  }
];

export const InfraPitfallsStudio: React.FC = () => {
  const [selectedPitfallId, setSelectedPitfallId] = useState<string>(PITFALLS_LIST[0].id);
  const [copiedCode, setCopiedCode] = useState(false);

  const active = PITFALLS_LIST.find(p => p.id === selectedPitfallId) || PITFALLS_LIST[0];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-rose-950/30 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1 rounded bg-rose-500/20 text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
            アプリ開発者のためのAWS基盤トラブルシューティング
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
          基盤の落とし穴 ＆ アンチパターン解消スタジオ
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          「コードは正しいのになぜか動かない」「タイムアウトする」「403になる」というAWSの謎エラーの9割は基盤設定（ルートテーブル、SG、IAM、OAC、可視性）にあります。代表的なハマりポイントと解決策を整理しました。
        </p>

        {/* List Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2">
          {PITFALLS_LIST.map(item => {
            const isSelected = item.id === selectedPitfallId;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedPitfallId(item.id)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-rose-950/40 border-rose-500 text-rose-200 shadow-md ring-1 ring-rose-500/50'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <div>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border inline-block mb-1.5 ${
                    isSelected ? 'bg-rose-900/60 border-rose-600 text-rose-300' : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}>
                    {item.targetServices}
                  </span>
                  <span className="text-xs font-bold block text-slate-100 leading-tight line-clamp-2">
                    {item.symptom}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Breakdown */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
            {active.category} • {active.targetServices}
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-slate-100 mt-1">{active.symptom}</h3>
        </div>

        {/* Symptom & Cause Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              なぜこの現象が起きるのか？（根本原因）
            </span>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {active.cause}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-2">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              正しい解決策・基盤設計の急所
            </span>
            <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
              {active.solution}
            </p>
          </div>
        </div>

        {/* Code Snippet if exists */}
        {active.codeSnippet && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Code className="w-4 h-4 text-amber-400" />
                <span>修正コード・設定サンプル ({active.codeSnippet.tool})</span>
              </span>
              <button
                onClick={() => handleCopyCode(active.codeSnippet!.code)}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'コピー完了' : 'コピー'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
              <code>{active.codeSnippet.code}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
