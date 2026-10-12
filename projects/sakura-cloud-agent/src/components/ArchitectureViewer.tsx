import React, { useState } from 'react';
import { PRESET_DIAGRAMS } from '../data/sakuraKnowledge';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { Layers, ShieldCheck, DollarSign, Server, Network, Database, CheckCircle2, FileCode2 } from 'lucide-react';

export const ArchitectureViewer: React.FC = () => {
  const [activeBlueprintKey, setActiveBlueprintKey] = useState<string>('web_ha');

  const blueprints = [
    {
      key: 'web_ha',
      title: '標準Web 3層冗長化構成',
      badge: '推奨基本構成',
      diagram: PRESET_DIAGRAMS.web_ha,
      description: 'エンハンスドロードバランサ(ELB)によるAnycast SSL終端、マルチゾーンWebクラスタ、プライベートスイッチ、冗長化RDBアプライアンスを組み合わせた王道アーキテクチャ。',
      estimatedMonthlySakura: '約 18,000円 / 月 (固定上限)',
      estimatedMonthlyAws: '約 45,000円〜75,000円 / 月 (データ転送量・NAT GW・ALB LCU含む)',
      keyPoints: [
        'ELBはLet\'s Encrypt自動更新に対応しており証明書更新作業が不要',
        'Webサーバはプライベートスイッチのみに収容し、外部からの直接アクセスを物理的に遮断',
        'データベースアプライアンスはActive/Standbyの自動フェイルオーバー対応',
        '管理者はVPCルータのWireGuard/L2TP VPNまたは閉域踏み台経由で安全にメンテナンス',
      ],
      terraformCode: `# Web3層構成 Terraformサンプル
resource "sakuracloud_switch" "app_switch" {
  name = "private-app-switch"
}

resource "sakuracloud_enhanced_load_balancer" "elb" {
  name = "production-web-elb"
  cps  = 100 # CPSプラン

  lets_encrypt {
    common_name = "example.com"
  }

  certificate {
    server_cert = "lets_encrypt"
  }

  network_interface {
    # Anycast IP自動割当
  }
}`,
    },
    {
      key: 'aws_migration',
      title: 'AWS ↔ さくらクラウド 等価移行構成',
      badge: 'コスト削減特化',
      diagram: PRESET_DIAGRAMS.aws_migration,
      description: 'AWSのALB, EC2, RDS, S3, NAT Gatewayをそのままさくらクラウドへリプレイス。データ転送量完全無料により、アクセス増加に伴うコスト高騰を完全に抑止。',
      estimatedMonthlySakura: '約 22,000円 / 月 (30TB転送でも通信費0円)',
      estimatedMonthlyAws: '約 90,000円〜180,000円 / 月 (30TBのアウトバウンド転送料で約$2,700加算)',
      keyPoints: [
        'AWS S3のクライアントコードは、endpoint_urlをさくらのオブジェクトストレージに向けるだけで即時互換',
        'vCPUとメモリ比率を細かく調整可能（AWSのインスタンスタイプに縛られない）',
        '月額上限課金が自動適用されるため、急なアクセススパイクでも上限額を超えない',
      ],
      terraformCode: `# S3互換オブジェクトストレージ
# AWS CLIやTerraformから標準S3プロバイダーでそのまま操作可能
provider "aws" {
  endpoints {
    s3 = "https://b.sakurastorage.jp"
  }
  access_key = "SAKURA_STORAGE_ACCESS_KEY"
  secret_key = "SAKURA_STORAGE_SECRET_KEY"
  region     = "jp-north-1"
}`,
    },
    {
      key: 'hybrid_closed',
      title: 'オンプレミス・AWS 閉域VPNハイブリッド構成',
      badge: 'マルチクラウド',
      diagram: PRESET_DIAGRAMS.hybrid_closed,
      description: '自社拠点やAWS VPCと、さくらクラウドをIPsec Site-to-Site VPNおよびL2ハイブリッド接続で直結。高負荷DBは物理ベアメタル、AIはAWS、Web配信はさくらで最適分担。',
      estimatedMonthlySakura: '約 35,000円 / 月',
      estimatedMonthlyAws: '用途に応じたAWS従量課金',
      keyPoints: [
        'VPCルータのVRRP冗長化により、ルータ障害時も自動フェイルオーバーで通信を継続',
        'さくらの専用サーバ(物理機)とクラウド仮想サーバをL2同一スイッチで混在可能',
        'AWSの高度な機械学習(SageMaker/Bedrock)と、さくらの高コスパ計算機を安全に閉域連携',
      ],
      terraformCode: `# VPCルータ IPsec VPN設定
resource "sakuracloud_vpc_router" "router" {
  name = "hybrid-vpc-router"
  plan = "premium" # VRRP冗長化対応

  site_to_site_vpn {
    peer       = "AWS_VGW_IP_OR_ONPREM_IP"
    remote_id  = "AWS_VGW_IP_OR_ONPREM_IP"
    pre_shared_secret = "YOUR_SHARED_SECRET"
    routes     = ["172.16.0.0/16", "10.0.0.0/16"]
  }
}`,
    },
    {
      key: 'dr_tokyo_ishikari',
      title: '石狩・東京 マルチゾーン広域DR構成',
      badge: 'BCP・広域災害対策',
      diagram: PRESET_DIAGRAMS.dr_tokyo_ishikari,
      description: '北海道・石狩データセンターと東京データセンターを活用した広域災害対策。GSLB（月額550円）により、首都圏大規模災害時も自動で石狩DCへ切り替え。',
      estimatedMonthlySakura: '約 25,000円 / 月 (GSLB 月額550円/FQDN)',
      estimatedMonthlyAws: '約 60,000円〜90,000円 / 月 (Multi-Region Route 53)',
      keyPoints: [
        '地理的に約800km離れた石狩と東京の完全別電源・別データセンター環境',
        '石狩データセンターは外気冷房を活用した国内有数のグリーン施設で停電耐性も屈指',
        'GSLBはHTTP/HTTPS死活監視に基づきDNSレコードを自動切り替え',
      ],
      terraformCode: `# GSLB (Global Server Load Balancing)
resource "sakuracloud_gslb" "gslb" {
  name = "dr-failover-gslb"
  fqdn = "service.example.com"

  health_check {
    protocol = "https"
    path     = "/healthz"
    status   = 200
  }

  server {
    ip_address = "203.0.113.10" # 東京第1ゾーン
    enabled    = true
    weight     = 100
  }

  server {
    ip_address = "198.51.100.20" # 石狩第1ゾーン (スタンバイ)
    enabled    = true
    weight     = 1
  }
}`,
    },
  ];

  const currentBp = blueprints.find(b => b.key === activeBlueprintKey) || blueprints[0];

  return (
    <div className="space-y-6">
      {/* Blueprint Switcher Bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-rose-950/30 border border-slate-800 shadow-xl space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 rounded bg-rose-500/20 text-rose-400">
              <Layers className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">推奨構築例・アーキテクチャギャラリー</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            さくらクラウド 実務アーキテクチャ設計パターン
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            実務で最も採用されている実績あるトポロジー設計。ノードの配置、IPアドレス、接続プロトコル、及びAWSとの費用・構成の対比を確認できます。
          </p>
        </div>

        {/* Blueprint Selection Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
          {blueprints.map(bp => {
            const isSelected = bp.key === activeBlueprintKey;
            return (
              <button
                key={bp.key}
                onClick={() => setActiveBlueprintKey(bp.key)}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-rose-950/40 border-rose-500 text-rose-200 shadow-md ring-1 ring-rose-500/40'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <div>
                  <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border inline-block mb-1.5 ${
                    isSelected ? 'bg-rose-900/60 border-rose-700 text-rose-300' : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}>
                    {bp.badge}
                  </span>
                  <span className="text-xs sm:text-sm font-bold block text-slate-100">{bp.title}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Blueprint Visual & Specs */}
      <div className="space-y-6">
        {/* Interactive Diagram Canvas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Network className="w-4 h-4 text-rose-400" />
              <span>{currentBp.title} のネットワークトポロジー図</span>
            </h3>
            <span className="text-xs text-slate-400">ノードをクリックして詳細スペックを確認</span>
          </div>
          <ArchitectureDiagram diagram={currentBp.diagram} height={380} interactive={true} />
        </div>

        {/* Blueprint Breakdown Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 cols): Design Highlights & Cost Comparison */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                設計の要点と公式ベストプラクティス
              </h4>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {currentBp.description}
              </p>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-200 block">構築時の重要ポイント:</span>
                <ul className="space-y-2 text-xs text-slate-300">
                  {currentBp.keyPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                      <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cost comparison box */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 pt-3">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  月額コスト試算シミュレーション (目安)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/40">
                    <span className="text-[10px] text-rose-300 font-semibold uppercase block">さくらクラウド</span>
                    <span className="text-sm font-bold text-slate-100 block mt-1">{currentBp.estimatedMonthlySakura}</span>
                    <span className="text-[11px] text-rose-300/80 mt-1 block">データ転送量完全無料 / 月額上限付き</span>
                  </div>
                  <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-800/40">
                    <span className="text-[10px] text-sky-300 font-semibold uppercase block">AWS 同等構成</span>
                    <span className="text-sm font-bold text-slate-100 block mt-1">{currentBp.estimatedMonthlyAws}</span>
                    <span className="text-[11px] text-sky-300/80 mt-1 block">転送料($0.09/GB) ＋ NAT GW($32/月+)加算</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (1 col): Terraform IaC Snippet */}
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <FileCode2 className="w-4 h-4 text-rose-400" />
                <span>Terraform コード定義例</span>
              </div>
              <p className="text-xs text-slate-400">
                Terraform Provider SakuraCloud (\`sacloud/sakuracloud\`) によるコード化
              </p>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed">
                <code>{currentBp.terraformCode}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
