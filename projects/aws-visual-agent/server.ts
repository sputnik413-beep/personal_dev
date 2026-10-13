import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { AWS_MENTAL_MODELS } from './src/data/awsKnowledge.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ----------------------------------------------------
// Sakura Cloud Official Reference Data & Presets
// ----------------------------------------------------
export const SAKURA_SERVICES_COMPARISON = [
  {
    category: 'コンピュート (Compute)',
    sakuraName: 'さくらのクラウド サーバ',
    sakuraCode: 'server',
    awsName: 'Amazon EC2',
    awsCode: 'ec2',
    overview: '自由なvCPU/メモリ比率の組み合わせ、高速SSD/標準ディスク、ローカルSSDの選択が可能な仮想サーバ。',
    differences: [
      'さくら: 転送量（インバウンド/アウトバウンド）が原則完全無料。AWSのような従量転送課金がない。',
      'さくら: vCPUとメモリの組み合わせを自由に変更可能（1コア/1GB〜最大128コア/1024GBまで柔軟）。',
      'AWS: 豊富なインスタンスファミリー（c/m/r/g/graviton等）とスポット/リザーブドインスタンス体系。',
      'さくら: 時間単位課金と月額上限課金が自動適用され、上限額を超えて請求されない。',
    ],
    pricingModel: '日額・月額上限付き時間課金（データ転送量無料）',
    officialUrl: 'https://cloud.sakura.ad.jp/specification/server/',
  },
  {
    category: 'ネットワーク (Networking)',
    sakuraName: 'VPCルータ',
    sakuraCode: 'vpc_router',
    awsName: 'NAT Gateway / Virtual Private Gateway / Transit Gateway',
    awsCode: 'vpc_nat_vgw',
    overview: 'ルータ、NAT、ファイアウォール、IPsec VPN、L2TP/IPsec、WireGuard、VRRP冗長化を一台で提供するマネージドルータアプライアンス。',
    differences: [
      'さくら: 1つのアプライアンスでNAT変換、サイト間IPsec VPN、リモートアクセスVPN、DHCP、VRRP冗長化を集約。',
      'AWS: NAT Gateway、Internet Gateway、VGW、Client VPNなどサービスが個別に分離・課金。',
      'さくら: プランはスタンダード、プレミアム、ハイスペック（通信量・VPNセッション数に応じた定額）。',
      'さくら: スイッチと接続して内部プライベートセグメントを構築。',
    ],
    pricingModel: 'プラン別定額（スタンダード: 月額1,320円〜、プレミアム: 月額3,300円〜）',
    officialUrl: 'https://cloud.sakura.ad.jp/specification/appliance/vpc-router/',
  },
  {
    category: 'ネットワーク (Load Balancing)',
    sakuraName: 'エンハンスドロードバランサ (ELB)',
    sakuraCode: 'enhanced_lb',
    awsName: 'Application Load Balancer (ALB) / CloudFront (一部機能)',
    awsCode: 'alb',
    overview: 'Anycast DNS配信、DDoS攻撃緩和、Let\'s Encrypt自動更新、HTTP/HTTPSおよびHTTP/2に対応した高機能プロキシ型L7ロードバランサ。',
    differences: [
      'さくら: Anycast IPによる分散とDDoS防御が標準装備。SSL証明書は無料のLet\'s Encrypt自動発行・更新に対応。',
      'さくら: 複数ゾーン（石狩・東京）にまたがるバックエンドサーバへの分散も可能。',
      'AWS: ALBはターゲットグループ単位の詳細ルーティング、WAF直接連携、パスベース/ホストベースルーティングが高度。',
      'さくら: 従量課金ではなくCPS（1秒あたりの新規コネクション数）プランによる定額制。',
    ],
    pricingModel: 'CPS帯域プラン定額（転送量課金なし）',
    officialUrl: 'https://cloud.sakura.ad.jp/specification/appliance/enhanced-lb/',
  },
  {
    category: 'データベース (Database)',
    sakuraName: 'データベースアプライアンス (RDB)',
    sakuraCode: 'database',
    awsName: 'Amazon RDS (PostgreSQL / MariaDB)',
    awsCode: 'rds',
    overview: 'PostgreSQLおよびMariaDBのマネージドデータベース。日次自動バックアップ、リードレプリカ、Web管理コンソール、自動フェイルオーバー(冗長化プラン)。',
    differences: [
      'さくら: PostgreSQLとMariaDBに対応。スイッチ接続の専用IPで動作。バックアップの世代管理が標準機能。',
      'AWS: RDS/Auroraなど対応エンジンが豊富、Aurora Serverlessや高度なPerformance Insightsが充実。',
      'さくら: シンプルな設計で設定が直感的。固定月額で予期せぬIOPSや転送量課金がない。',
    ],
    pricingModel: 'プラン（メモリ/ディスク容量）別固定月額',
    officialUrl: 'https://cloud.sakura.ad.jp/specification/appliance/database/',
  },
  {
    category: 'ストレージ (Storage)',
    sakuraName: 'オブジェクトストレージ',
    sakuraCode: 'object_storage',
    awsName: 'Amazon S3',
    awsCode: 's3',
    overview: 'Amazon S3互換APIを備えた分散型オブジェクトストレージ。大容量静的コンテンツ、バックアップ、ログ保管に最適。',
    differences: [
      'さくら: AWS S3 SDKやCLIツール（aws cli, s3cmd等）からエンドポイント変更のみでそのまま利用可能。',
      'さくら: アウトバウンド転送量課金が無料（月額保管容量に応じた課金のみで圧倒的に予測しやすい）。',
      'AWS: S3 Lifecycle、Glacier、S3 Select、Object Lockなどエンタープライズ機能が超多層的。',
    ],
    pricingModel: '保存容量に応じた従量課金（転送量無料）',
    officialUrl: 'https://cloud.sakura.ad.jp/specification/storage/object-storage/',
  },
  {
    category: 'コンテンツ配信 (CDN)',
    sakuraName: 'ウェブアクセラレータ',
    sakuraCode: 'web_accelerator',
    awsName: 'Amazon CloudFront',
    awsCode: 'cloudfront',
    overview: '国内配信に特化した超低価格・広帯域CDN。静的・動的ウェブコンテンツのキャッシュ配信、オリジンサーバの負荷分散。',
    differences: [
      'さくら: 業界最安級の配信単価（5円/GiB〜、同一リージョン内オリジン連携はさらに優位）。',
      'さくら: DDoS攻撃防御、自動キャッシュパージAPI、HTTPS証明書設定。',
      'AWS: CloudFront Functions, Lambda@Edge, Shield Advancedなどグローバルエッジコンピューティングが充実。',
      'さくら: 日本国内ユーザー中心のメディア、EC、動画配信において極めて高い費用対効果。',
    ],
    pricingModel: 'アウトバウンド転送量 5円/GiB（初期費用無料）',
    officialUrl: 'https://cloud.sakura.ad.jp/specification/network/web-accelerator/',
  },
  {
    category: '広域負荷分散・DNS',
    sakuraName: 'GSLB (Global Server Load Balancing)',
    sakuraCode: 'gslb',
    awsName: 'Route 53 (DNSフェイルオーバー / レイテンシルーティング)',
    awsCode: 'route53_failover',
    overview: 'DNSを利用した広域負荷分散。ヘルスチェックに基づき正常なサイトのIPアドレスを動的に応答。石狩・東京間のDRに最適。',
    differences: [
      'さくら: 障害時にスタンバイサイトへ自動切り替え、または重み付けによるアクティブ/アクティブ分散。',
      'AWS: Route 53は多様なルーティングポリシー（位置情報、遅延、複数値回答など）とCloudWatch連携。',
      'さくら: 設定項目がシンプルで導入が非常に容易。月額550円/FQDNという低コスト。',
    ],
    pricingModel: '月額550円/FQDN',
    officialUrl: 'https://cloud.sakura.ad.jp/specification/appliance/gslb/',
  },
  {
    category: '閉域網・IoT (IoT & Connectivity)',
    sakuraName: 'さくらのセキュアモバイルSIM',
    sakuraCode: 'secure_mobile_sim',
    awsName: 'AWS IoT Core / AWS Private 5G / 閉域SIM連携',
    awsCode: 'aws_iot_sim',
    overview: 'インターネットを経由せず、ドコモまたはソフトバンクのモバイル回線からさくらのクラウドへ閉域網でダイレクト接続するデータ通信SIM。',
    differences: [
      'さくら: デバイスからさくらのクラウドルータ/サーバまで完全なプライベートIP空間で直結。ネット晒しゼロ。',
      'さくら: 工場IoT、遠隔監視カメラ、POS端末、決済端末に絶大な人気。',
      'AWS: 閉域接続にはSORACOM Canal/Direct ConnectやメガキャリアのAWS接続サービスが必要。',
    ],
    pricingModel: '基本料＋通信量従量課金',
    officialUrl: 'https://cloud.sakura.ad.jp/specification/appliance/secure-mobile/',
  },
  {
    category: '専用線・ハイブリッド接続',
    sakuraName: 'ハイブリッド接続 / プライベートリンク',
    sakuraCode: 'hybrid_connection',
    awsName: 'AWS Direct Connect (DX)',
    awsCode: 'direct_connect',
    overview: 'さくらのクラウドと、さくらの専用サーバ、ハウジング、他社クラウド、オンプレミス拠点をL2で直結するプライベートネットワーク。',
    differences: [
      'さくら: さくらの専用サーバ（物理ベアメタル）とクラウドの仮想サーバを同一L2スイッチで混在可能。',
      'AWS: Direct Connectは主に拠点とAWS VPC間の専用線接続。',
      'さくら: 物理マシンの超高負荷DB + クラウドの柔軟なWebサーバという理想的な構成が容易。',
    ],
    pricingModel: '回線帯域別月額定額',
    officialUrl: 'https://cloud.sakura.ad.jp/specification/network/hybrid/',
  },
  {
    category: 'IaC & 自動化 (Automation)',
    sakuraName: 'Usacloud CLI & Terraform Provider SakuraCloud',
    sakuraCode: 'usacloud_terraform',
    awsName: 'AWS CLI & Terraform Provider AWS',
    awsCode: 'aws_cli_terraform',
    overview: 'さくらクラウド公式のCLIツール「usacloud」およびオフィシャルなTerraformプロバイダー。インフラのコード化（IaC）を完全サポート。',
    differences: [
      'さくら: Go製の高速なCLI「usacloud」はインタラクティブシェルやbash/zsh補完を完備。',
      'さくら: Terraform Provider SakuraCloudは公式メンテナンスされており、サーバからVPCルータ、アプライアンスまでフルコード管理可能。',
      'さくら: クラウドAPIキー（Access Token / Secret）でシンプルに認証。',
    ],
    pricingModel: '無料（API利用料無料）',
    officialUrl: 'https://usacloud.github.io/usacloud/',
  },
];

// Fallback high-quality research reports
export const RESEARCH_PRESETS = [
  {
    id: 'web3tier_ha',
    title: 'さくらのクラウドにおける高可用性Web3層アーキテクチャ設計書',
    category: 'アーキテクチャ設計',
    tags: ['ELB', 'サーバ', 'DBアプライアンス', 'VPCルータ', 'スイッチ'],
    summary: 'エンハンスドロードバランサ(ELB)によるSSL終端・Anycast負荷分散、Web/APサーバの冗長化、プライベートスイッチ経由のデータベースアプライアンス(Active/Standby)、及び管理用VPCルータを組み合わせた標準的な高信頼構成です。',
    officialCitations: [
      'さくらのクラウド マニュアル: エンハンスドロードバランサ (https://manual.sakura.ad.jp/cloud/appliance/enhanced-lb/)',
      'さくらのクラウド マニュアル: データベース (https://manual.sakura.ad.jp/cloud/appliance/database/)',
      'さくらのクラウド マニュアル: スイッチ・ルータ (https://manual.sakura.ad.jp/cloud/network/switch-router/)',
    ],
    awsComparison: {
      awsArchitecture: 'ALB + EC2 (Multi-AZ) + RDS Multi-AZ + NAT Gateway + Private Subnet',
      keyDifferences: [
        'データ転送量: AWSではアウトバウンド転送が$0.09/GB発生しますが、さくらクラウドはサーバの通信量が完全無料のため、アクセス集中時の転送費高騰リスクがありません。',
        'NAT・管理構成: AWSではNAT Gateway＋踏み台またはSSM Session Managerを用いますが、さくらではVPCルータ(またはパケットフィルタ付き踏み台サーバ)でリモートVPNやNATを集約可能です。',
        'SSL証明書: AWS ACM (ALB無料) と同様、さくらクラウドのELBもLet\'s Encryptによる無料自動発行・自動更新に対応しています。',
      ],
      estimatedCostSavings: '画像・メディア配信が多い場合、月額で30%〜60%のネットワークコスト削減が見込めます。',
    },
    architectureSpecs: {
      zones: ['tk1a (東京第1ゾーン)', 'is1a (石狩第1ゾーン)'],
      components: [
        { name: 'エンハンスドロードバランサ', type: 'ELB', role: 'Anycast DNS / SSL終端 / DDoS緩和 / HTTP2' },
        { name: 'Web/APサーバ #1 & #2', type: 'Server', role: 'Nginx + Node/PHP/Go (2コア/4GB)' },
        { name: 'プライベートスイッチ', type: 'Switch', role: 'L2閉域ネットワーク (192.168.10.0/24)' },
        { name: 'データベースアプライアンス', type: 'RDB', role: 'PostgreSQL 16 / MariaDB 10.11 (冗長化Active/Standby)' },
        { name: 'オブジェクトストレージ', type: 'ObjectStorage', role: '画像・静的アセット保存 (S3互換)' },
        { name: 'VPCルータ (管理・VPN)', type: 'VPCRouter', role: '保守用L2TP/IPsecまたはWireGuard VPN終端' },
      ],
    },
  },
  {
    id: 'hybrid_closed_network',
    title: 'オンプレミス・他社クラウド接続: VPCルータによるIPsec閉域VPNとハイブリッド接続',
    category: 'ネットワーク・ハイブリッド',
    tags: ['VPCルータ', 'IPsec VPN', 'ハイブリッド接続', '閉域網'],
    summary: '社内オフィスや自社データセンター、AWS環境とさくらのクラウドをセキュアに接続するための設計です。VPCルータのIPsec Site-to-Site VPN機能や、L2直結のハイブリッド接続サービスを活用します。',
    officialCitations: [
      'さくらのクラウド マニュアル: VPCルータ Site-to-Site IPsec VPN (https://manual.sakura.ad.jp/cloud/appliance/vpc-router/ipsec-vpn.html)',
      'さくらのクラウド: クラウドハイブリッド接続仕様書 (https://cloud.sakura.ad.jp/specification/network/hybrid/)',
    ],
    awsComparison: {
      awsArchitecture: 'AWS Site-to-Site VPN / AWS Direct Connect + Transit Gateway',
      keyDifferences: [
        'VPCルータのVRRP冗長化: プレミアム以上のプランで標準提供され、ルータ障害時に自動でフェイルオーバー。',
        'ハイブリッド接続の利点: さくらの専用サーバ(物理ベアメタル)とクラウド仮想サーバをL2同一ブロードキャストドメインで接続可能。超高負荷DBを物理機で動かし、Webをクラウドでスケールする構成が容易。',
      ],
      estimatedCostSavings: 'AWS Direct Connectポート利用料およびデータ転送料と比較し、さくらのハイブリッド接続は月額固定で予算計画が立てやすい。',
    },
  },
  {
    id: 'dr_multi_zone',
    title: '石狩・東京 マルチゾーン広域ディザスタリカバリ (DR) 構成',
    category: 'BCP・広域災害対策',
    tags: ['GSLB', '石狩ゾーン', '東京ゾーン', 'ブリッジ接続', 'DBレプリケーション'],
    summary: '地理的に数百km離れた石狩データセンター(北海道)と東京データセンターを活用した広域災害対策構成です。GSLBによるDNSヘルスチェックと自動切り替えを実現します。',
    officialCitations: [
      'さくらのクラウド マニュアル: GSLB (https://manual.sakura.ad.jp/cloud/appliance/gslb/)',
      'さくらのクラウド マニュアル: ブリッジ接続 (https://manual.sakura.ad.jp/cloud/network/bridge/)',
    ],
    awsComparison: {
      awsArchitecture: 'Route 53 DNS Failover + 東京リージョン & 大阪リージョン',
      keyDifferences: [
        'GSLBは月額550円/FQDNという極めて安価な固定費用で利用可能。',
        'リージョン間ブリッジ接続により、石狩と東京のプライベートスイッチ間をL2閉域で接続可能（暗号化カプセル化対応）。',
        '石狩データセンターは広大な敷地と外気冷房を活用した国内有数のグリーンデータセンターで、電力逼迫リスクに強い。',
      ],
      estimatedCostSavings: 'マルチリージョン構成時のトラフィックコスト負担が大幅に軽減。',
    },
  },
];

// Fallback Curated Quiz Bank
export const CURATED_QUIZ_BANK = [
  {
    id: 'q1',
    category: 'ネットワーク (Network)',
    difficulty: 'intermediate',
    type: 'multiple-choice',
    question: 'さくらのクラウドで複数台のWebサーバを冗長化し、SSL証明書を無料で自動更新しながら、外部からのトラフィックを分散させたい。最も適したサービスと機能の組み合わせはどれか？',
    options: [
      { id: 'A', text: 'ロードバランサ (アプライアンス) ＋ サーバ内Let\'s Encrypt Certbot' },
      { id: 'B', text: 'エンハンスドロードバランサ (ELB) ＋ Let\'s Encrypt自動設定機能' },
      { id: 'C', text: 'VPCルータのポートフォワーディング ＋ DNSレコードラウンドロビン' },
      { id: 'D', text: 'GSLB (広域負荷分散) ＋ パブリックIP共有' },
    ],
    correctOptionId: 'B',
    explanation: 'エンハンスドロードバランサ（ELB）は、Anycastプロキシ型の高機能L7ロードバランサで、Let\'s EncryptによるSSL/TLS証明書の無料自動発行および自動更新に対応しています。また、DDoS攻撃緩和機能やHTTP/2プロトコルサポートも標準で備えています。従来のロードバランサ(アプライアンス)はL4負荷分散中心でLet\'s Encrypt自動連携はありません。',
    awsMappingNote: 'AWSでは「ALB (Application Load Balancer) ＋ AWS Certificate Manager (ACM)」の構成に相当します。さくらクラウドのELBも同様にマネージドで証明書管理の手間をゼロにできます。',
    architectureDiagram: {
      title: 'ELBを用いた冗長Webシステム構築例',
      nodes: [
        { id: 'client', label: 'インターネット (User)', type: 'external' },
        { id: 'elb', label: 'エンハンスドロードバランサ (ELB)\nAnycast VIP / Let\'s Encrypt自動更新', type: 'elb' },
        { id: 'web1', label: 'Webサーバ #1 (192.168.1.11)', type: 'server' },
        { id: 'web2', label: 'Webサーバ #2 (192.168.1.12)', type: 'server' },
        { id: 'switch', label: 'プライベートスイッチ (192.168.1.0/24)', type: 'switch' },
        { id: 'db', label: 'データベースアプライアンス\nActive / Standby', type: 'db' },
      ],
      links: [
        { from: 'client', to: 'elb', label: 'HTTPS (443)' },
        { from: 'elb', to: 'web1', label: 'HTTP (80)' },
        { from: 'elb', to: 'web2', label: 'HTTP (80)' },
        { from: 'web1', to: 'switch', label: 'L2接続' },
        { from: 'web2', to: 'switch', label: 'L2接続' },
        { from: 'switch', to: 'db', label: 'SQL (5432/3306)' },
      ],
    },
    officialDocUrl: 'https://cloud.sakura.ad.jp/specification/appliance/enhanced-lb/',
  },
  {
    id: 'q2',
    category: '課金・スペック設計 (Billing & Specs)',
    difficulty: 'beginner',
    type: 'multiple-choice',
    question: 'さくらのクラウドの仮想サーバにおけるデータ転送量（ネットワーク通信量）課金の仕様として正しいものはどれか？',
    options: [
      { id: 'A', text: 'インバウンド・アウトバウンド共に、データ転送量は原則として完全無料である。' },
      { id: 'B', text: 'インバウンド転送は無料だが、アウトバウンド転送は1GBあたり約10円の従量課金が発生する。' },
      { id: 'C', text: '月間1TBまでは無料だが、超過分に対して段階制の従量課金が発生する。' },
      { id: 'D', text: '同ゾーン内通信のみ無料で、インターネット宛ての通信は全て従量課金である。' },
    ],
    correctOptionId: 'A',
    explanation: 'さくらのクラウドの最大の特徴の一つとして、仮想サーバのデータ転送量（インバウンド・アウトバウンド通信）は原則として「完全無料」です。回線帯域に応じたベストエフォート（共有100Mbps〜1Gbpsなど）で提供され、AWSやGCPのようなアウトバウンド転送料金（Egress fee）が発生しないため、メディア配信や大容量データ送受信を伴うシステムで大幅なコスト削減が可能です。',
    awsMappingNote: 'AWSではインターネット向けデータ転送（Data Transfer Out）に$0.09/GB（100GB超過後）等の従量課金が発生するため、月間数十TB以上の通信があるWebサービスでは、さくらクラウドへの移行またはハイブリッド構成で莫大なコスト圧縮が実現できます。',
    architectureDiagram: {
      title: '転送量課金ゼロのメリットを活かしたWeb配信構成',
      nodes: [
        { id: 'users', label: '不特定多数のユーザー', type: 'external' },
        { id: 'sakura_server', label: 'さくらのクラウド サーバ群\nデータ転送量: 0円 / 月', type: 'server' },
        { id: 'aws_comparison', label: '【参考】AWS EC2\n10TB転送時: 約$900(約13万円)/月', type: 'notice' },
      ],
      links: [
        { from: 'sakura_server', to: 'users', label: '大容量アウトバウンド通信 (無料)' },
      ],
    },
    officialDocUrl: 'https://cloud.sakura.ad.jp/payment/',
  },
  {
    id: 'q3',
    category: 'ネットワーク・VPCルータ (Networking)',
    difficulty: 'advanced',
    type: 'multiple-choice',
    question: 'さくらのクラウドでVPCルータを導入し、プライベートセグメント内のサーバ群からインターネットへ外部アクセス（yum updateや外部API呼び出し）を行いつつ、外部からの直接アクセスを遮断したい。適切な設計はどれか？',
    options: [
      { id: 'A', text: 'サーバにパブリックIPを直接割り当て、OSのiptablesですべてのポートをDROPする。' },
      { id: 'B', text: 'VPCルータにパブリックIPとスイッチを接続し、IPマスカレード(SNAT)を設定し、サーバのデフォルトゲートウェイをVPCルータの内部IPに指定する。' },
      { id: 'C', text: 'エンハンスドロードバランサをリバースプロキシとしてサーバの手前に配置し、双方向NATを有効化する。' },
      { id: 'D', text: 'データベースアプライアンスを踏み台ルータとして設定する。' },
    ],
    correctOptionId: 'B',
    explanation: 'VPCルータはルータアプライアンスとして、インターネット側のインターフェース（パブリックIP）とプライベートスイッチ側のインターフェース（プライベートIP）を接続します。「IPマスカレード(SNAT)」機能を有効化し、内部サーバのデフォルトゲートウェイにVPCルータの内部側IPを設定することで、AWSのNAT Gatewayと同様に「外へのアウトバウンド通信のみを許可し、外からのインバウンド通信を遮断」できます。',
    awsMappingNote: 'AWSにおける「Private Subnet内のEC2 ＋ NAT Gateway ＋ Route Tableの0.0.0.0/0向け設定」と同一の役割を果たします。',
    architectureDiagram: {
      title: 'VPCルータによるNAT(IPマスカレード)構成',
      nodes: [
        { id: 'internet', label: 'インターネット (yumリポジトリ等)', type: 'external' },
        { id: 'vpc_router', label: 'VPCルータ (NAT/IPマスカレード)\nPublic IP: 203.0.113.10\nPrivate IP: 192.168.100.1', type: 'vpc_router' },
        { id: 'switch', label: 'プライベートスイッチ\n(192.168.100.0/24)', type: 'switch' },
        { id: 'app1', label: '内部サーバ (192.168.100.10)\nGW: 192.168.100.1', type: 'server' },
        { id: 'db1', label: 'DBアプライアンス (192.168.100.20)', type: 'db' },
      ],
      links: [
        { from: 'internet', to: 'vpc_router', label: 'WAN' },
        { from: 'vpc_router', to: 'switch', label: 'LAN (NIC 1)' },
        { from: 'switch', to: 'app1', label: 'アウトバウンド通信のみNAT変換' },
        { from: 'switch', to: 'db1', label: '内部通信のみ' },
      ],
    },
    officialDocUrl: 'https://cloud.sakura.ad.jp/specification/appliance/vpc-router/',
  },
  {
    id: 'q4',
    category: 'トラブルシューティング・実務 (Troubleshooting)',
    difficulty: 'architect',
    type: 'multiple-choice',
    question: 'VPCルータの「プレミアム」プランでVRRPによる冗長化（マスター/バックアップ）を有効にしている環境で、ネットワーク接続に関する注意点として正しいものはどれか？',
    options: [
      { id: 'A', text: 'プライベート側スイッチにはVIP（仮想IP）1つのみ割り当てればよく、実IPは不要である。' },
      { id: 'B', text: 'インターフェースごとに、VRRP仮想IP(VIP)に加えて、マスター用・バックアップ用の実IPアドレスの合計3つのIPアドレスが必要である。' },
      { id: 'C', text: 'VRRPは石狩ゾーンと東京ゾーンをまたいで動作させることができる。' },
      { id: 'D', text: 'フェイルオーバー時にはDNSのTTL満了を待つ必要がある。' },
    ],
    correctOptionId: 'B',
    explanation: 'さくらのクラウドのVPCルータ冗長化構成（VRRP）では、マスター機器とバックアップ機器がそれぞれハートビート通信および死活監視を行うため、WAN側および各LAN側の双方において「仮想IPアドレス(VIP) 1個」＋「実IPアドレス 2個」の合計3個のIPアドレスが必要です。プライベートスイッチ側でも3個のアドレス範囲をあらかじめ確保して設計する必要があります。',
    awsMappingNote: 'AWSではマネージドのNAT Gateway自体がAWSインフラ側で冗長化されているため実IPを複数意識することはありませんが、さくらクラウドのVPCルータは標準的なLinux/VyOS/VRRPプロトコルに準拠した挙動を把握して設計します。',
    architectureDiagram: {
      title: 'VPCルータ VRRP冗長化のIP割り当てモデル',
      nodes: [
        { id: 'wan_vip', label: 'WAN側 VIP (グローバルIP)\n+ 実IP #1 (Master) / 実IP #2 (Backup)', type: 'vpc_router' },
        { id: 'switch', label: 'LAN側 スイッチ (192.168.1.0/24)', type: 'switch' },
        { id: 'lan_ips', label: 'LAN側 VIP: 192.168.1.1 (GW)\nMaster実IP: 192.168.1.2\nBackup実IP: 192.168.1.3', type: 'notice' },
      ],
      links: [
        { from: 'wan_vip', to: 'switch', label: 'VRRP ハートビート' },
        { from: 'switch', to: 'lan_ips', label: '合計3つのIPを消費' },
      ],
    },
    officialDocUrl: 'https://manual.sakura.ad.jp/cloud/appliance/vpc-router/redundancy.html',
  },
];

// ----------------------------------------------------
// Express API Routes
// ----------------------------------------------------

// 1. Service Comparison List
app.get('/api/comparison-matrix', (req: Request, res: Response) => {
  res.json({
    services: SAKURA_SERVICES_COMPARISON,
    presets: RESEARCH_PRESETS,
    quickSummary: {
      totalMappedServices: SAKURA_SERVICES_COMPARISON.length,
      primaryAdvantages: [
        'データ転送量（インバウンド/アウトバウンド）原則完全無料によるコスト削減',
        '月額上限課金システムによる予算オーバーの完全防止',
        '国内データセンター（石狩・東京）による低レイテンシとデータ主権（Sovereign Cloud）確保',
        'S3互換オブジェクトストレージやLet\'s Encrypt標準ELBなどオープン規格との親和性',
      ],
    },
  });
});

// 2. Generate or fetch official research report
app.post('/api/research', async (req: Request, res: Response) => {
  try {
    const { topic, category, depth } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'トピック(topic)の指定が必要です。' });
    }

    // Check if preset matches
    const preset = RESEARCH_PRESETS.find(p =>
      p.id === topic || p.title.toLowerCase().includes(topic.toLowerCase())
    );

    // If Gemini is available, generate a comprehensive official-grounded report
    if (ai) {
      const prompt = `あなたは「さくらクラウド（さくらインターネット）の公式技術スペシャリスト」兼「AWS/クラウドアーキテクト」です。
以下の調査テーマについて、さくらクラウドの公式ドキュメント（仕様、マニュアル、ベストプラクティス、料金体系）に基づき、徹底的かつ実践的な調査レポートを作成してください。
また、ユーザーは仕事でAWSを日常的に使用しているため、AWSの同等機能・アーキテクチャとの比較、AWSから移行・連携する場合の勘所や相違点を必ず明記してください。

【調査テーマ】: ${topic}
【カテゴリ/観点】: ${category || '全般'}
【深さ】: ${depth || 'deep'}

【レポートに含めるべき必須項目】:
1. 概要と背景（さくらクラウドの公式機能と提供価値）
2. 主な仕様と公式制限事項（Quota、スループット、対応ゾーン（石狩/東京）、注意すべき制約）
3. AWSとの詳細比較マトリクス（AWSでの同等サービス、アーキテクチャ設計の違い、コスト比較、データ転送量無料の恩恵）
4. 具体的な構築例とアーキテクチャ（推奨構成図の解説、コンポーネント配置、IPアドレス設計）
5. 設定手順・IaCコード例（Usacloud CLI または Terraform Provider SakuraCloud のサンプルコード）
6. トラブルシューティングと運用の落とし穴（VRRP、パケットフィルタ、セッション維持などの注意点）
7. 公式ドキュメントの参照先（manual.sakura.ad.jp や cloud.sakura.ad.jp のURL）

出力はマークダウン形式で、見出し、箇条書き、表、コードブロックを活用して美しく構造化してください。`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: 'あなたはさくらインターネットの公式エバンジェリストおよびマルチクラウド（AWS/さくらクラウド）のシニアソリューションアーキテクトです。正確な公式仕様、実務に即した具体的なコマンド、AWSとの比較を論理的かつ分かりやすく解説します。',
          },
        });

        const reportText = response.text || '';
        return res.json({
          success: true,
          topic,
          report: reportText,
          source: 'gemini-3.8-flash',
          relatedPresets: RESEARCH_PRESETS,
        });
      } catch (geminiError: any) {
        console.error('Gemini API error during research report generation:', geminiError);
        // Fall back to preset or curated report
      }
    }

    // Fallback response if Gemini is not configured or throws error
    if (preset) {
      const zonesList = preset.architectureSpecs ? preset.architectureSpecs.zones.join(', ') : '石狩第1ゾーン / 東京第1ゾーン';
      const componentsList = preset.architectureSpecs
        ? preset.architectureSpecs.components.map(c => `- **${c.name}** (${c.type}): ${c.role}`).join('\n')
        : '- エンハンスドロードバランサ / サーバ / プライベートスイッチ / VPCルータ';

      return res.json({
        success: true,
        topic: preset.title,
        report: `# ${preset.title}

## 1. 概要
${preset.summary}

## 2. AWSとの比較・相互補完ポイント
- **AWS相当構成**: ${preset.awsComparison.awsArchitecture}
- **主な相違点**:
${preset.awsComparison.keyDifferences.map(d => `  - ${d}`).join('\n')}
- **コストメリット**: ${preset.awsComparison.estimatedCostSavings}

## 3. 推奨アーキテクチャ構成
対応ゾーン: ${zonesList}

### 構成コンポーネント:
${componentsList}

## 4. 公式ドキュメント
${preset.officialCitations.map(c => `- ${c}`).join('\n')}
`,
        source: 'preset-knowledge-base',
        presetData: preset,
      });
    }

    // Generic curated fallback report
    return res.json({
      success: true,
      topic,
      report: `# さくらクラウド調査レポート: ${topic}

## 1. 概要
さくらのクラウドは、日本のさくらインターネットが提供する国産パブリッククラウドサービスです。石狩データセンターおよび東京データセンターを拠点とし、国内法・セキュリティ基準に完全準拠したインフラを提供します。

## 2. 最大の特徴とAWSとの違い
1. **データ転送量が原則完全無料**:
   - AWSではアウトバウンド通信にGB単位の転送量課金が発生しますが、さくらクラウドの仮想サーバは転送量課金がゼロです。
2. **日額・月額上限付き時間課金**:
   - 従量課金でありながら月額上限が設定されており、突発的な高額請求を防ぐ安心設計です。
3. **vCPU・メモリの自由な組み合わせ**:
   - AWSの固定インスタンスタイプに対し、vCPUとメモリを要件に合わせて柔軟に指定可能です。
4. **アプライアンス機能の充実**:
   - エンハンスドロードバランサ(ELB)、VPCルータ、データベースアプライアンスなど、構築済みのマネージド製品が豊富です。

## 3. IaCサポート
- **Usacloud**: Go製の公式CLIツール。直感的なサブコマンドで操作可能。
- **Terraform Provider SakuraCloud**: \`sacloud/sakuracloud\` プロバイダーにより、インフラのコード管理が完全に対応。

## 4. 公式ドキュメントリンク
- さくらのクラウド公式マニュアル: https://manual.sakura.ad.jp/cloud/
- さくらのクラウド 仕様一覧: https://cloud.sakura.ad.jp/specification/`,
      source: 'curated-fallback',
    });
  } catch (error: any) {
    console.error('Research route error:', error);
    res.status(500).json({ error: '調査レポートの生成中にエラーが発生しました。' });
  }
});

// 3. Quiz / Drill Engine (Curated & AI Generation with Diagrams)
app.post('/api/quiz/generate', async (req: Request, res: Response) => {
  try {
    const { category, difficulty, type, customTopic } = req.body;

    // Filter from curated bank first
    let curatedMatches = CURATED_QUIZ_BANK;
    if (category && category !== 'all') {
      curatedMatches = curatedMatches.filter(q => q.category.includes(category));
    }
    if (difficulty && difficulty !== 'all') {
      curatedMatches = curatedMatches.filter(q => q.difficulty === difficulty);
    }

    // If customTopic or request fresh questions with Gemini
    if (ai && (customTopic || req.body.generateFresh)) {
      const prompt = `あなたは「さくらクラウド（さくらインターネット）」の公式認定資格および実務設計の試験問題作成官です。
ユーザーは現在AWSを実務で使用しており、さくらクラウドの学習と設計力の習得を進めています。

以下の条件で、高品質な学習問題・解説を1問作成してください。

【対象カテゴリ】: ${category || 'ネットワーク・インフラ設計'}
【難易度】: ${difficulty || 'intermediate'} (beginner / intermediate / advanced / architect から指定)
【出題形式】: ${type || 'multiple-choice'} (4択問題)
${customTopic ? `【指定トピック】: ${customTopic}` : ''}

【必須要件】:
1. 実務に即した具体的なシナリオ（例: Web冗長化、VPCルータ、DBアプライアンス、セキュアモバイルSIM、AWSからの移行、DR設計など）。
2. 4つの選択肢（A, B, C, D）を作成し、1つを正解とする。
3. なぜそれが正解なのか、他の選択肢がなぜ誤りなのかを【公式仕様】に基づいて完結・明確に解説する。
4. 【AWSとの対比解説】: AWSで同等のことを行う場合のサービス（ALB, EC2, RDS, VPC NAT GW等）との違いや注意点を記載する。
5. 【構築例イメージ図のデータ】: この問題の正解となる構成を可視化するためのノードとリンクのJSONデータを含める。

以下のJSONフォーマットのみを返してください（Markdown不要）:
{
  "id": "gen_${Date.now()}",
  "category": "カテゴリ名",
  "difficulty": "${difficulty || 'intermediate'}",
  "type": "multiple-choice",
  "question": "問題文（シナリオ・背景を含む）",
  "options": [
    {"id": "A", "text": "選択肢A"},
    {"id": "B", "text": "選択肢B"},
    {"id": "C", "text": "選択肢C"},
    {"id": "D", "text": "選択肢D"}
  ],
  "correctOptionId": "正解のID (A/B/C/D)",
  "explanation": "詳細でわかりやすい解説（ポイント・公式仕様の裏付け）",
  "awsMappingNote": "AWSでの同等サービス・実装方法との対比ポイント",
  "officialDocUrl": "公式ドキュメントURL (https://manual.sakura.ad.jp/...)",
  "examLevel": "${difficulty === 'beginner' ? 'Associate' : difficulty === 'architect' ? 'Architect' : 'Professional'}",
  "syllabusDomain": "${category || '第2分野: ネットワーク・VPCルータ・ELB'}",
  "architectureDiagram": {
    "title": "構築例イメージ図タイトル",
    "nodes": [
      {"id": "n1", "label": "ノード名・スペック", "type": "server | elb | db | vpc_router | switch | external | storage"}
    ],
    "links": [
      {"from": "n1", "to": "n2", "label": "プロトコル・接続関係"}
    ]
  }
}`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text?.trim() || '{}';
        const parsedQuestion = JSON.parse(text);
        return res.json({
          success: true,
          question: parsedQuestion,
          source: 'gemini-generated',
        });
      } catch (geminiErr) {
        console.error('Gemini error generating quiz:', geminiErr);
      }
    }

    // Pick from curated bank
    const selected = curatedMatches.length > 0
      ? curatedMatches[Math.floor(Math.random() * curatedMatches.length)]
      : CURATED_QUIZ_BANK[0];

    return res.json({
      success: true,
      question: selected,
      source: 'curated-bank',
      bankTotal: CURATED_QUIZ_BANK.length,
    });
  } catch (error: any) {
    console.error('Quiz route error:', error);
    res.status(500).json({ error: '問題作成中にエラーが発生しました。' });
  }
});

// 4. AWS ↔ Sakura Cloud Architecture Translator & Cross-Reference
app.post('/api/translate-architecture', async (req: Request, res: Response) => {
  try {
    const { awsArchitecture, useCase, budgetOrTraffic } = req.body;

    if (!awsArchitecture) {
      return res.status(400).json({ error: 'AWS構成の記述が必要です。' });
    }

    if (ai) {
      const prompt = `あなたは「AWS」と「さくらクラウド」の双方に精通したチーフクラウドアーキテクトです。
現在ユーザーがAWSで構築している（またはAWSで設計検討している）以下のアーキテクチャを、さくらクラウドの構成へと変換・相互マッピングしてください。

【ユーザーのAWS構成 / 要件】:
${awsArchitecture}

【用途 / ユースケース】: ${useCase || '一般的なWeb・APIサービス'}
【トラフィックや予算の前提】: ${budgetOrTraffic || '未指定'}

【出力要件】:
1. サービス対応マッピング表（AWSサービス名 → さくらクラウドサービス名と設定指針）
2. さくらクラウドで実装する際のベストプラクティス構成と構築手順
3. AWSとさくらクラウドのメリット・デメリット比較（特に転送量課金、固定月額、マネージドの度合い）
4. AWSとさくらクラウドを併用する「ハイブリッドマルチクラウド構成案」（例: フロント/高トラフィックをさくらクラウド、AI/分析をAWSなど）
5. 構築例のトポロジーデータ（ノード・リンク）
6. TerraformまたはUsacloud CLIのコードスニペット

以下のJSONフォーマットのみを出力してください:
{
  "title": "アーキテクチャ変換レポートタイトル",
  "summary": "概要と変換方針",
  "mappingTable": [
    {
      "awsService": "AWSサービス名",
      "sakuraService": "さくらクラウドサービス名",
      "role": "役割",
      "considerations": "設計・運用の注意点"
    }
  ],
  "costAndPerformanceComparison": {
    "trafficAdvantage": "データ転送量に関するメリット解説",
    "computeAdvantage": "コンピュート・リソース配分に関するメリット解説",
    "tradeOffs": "AWS側が優れている点・さくらクラウドでの代替アプローチ"
  },
  "hybridBlueprint": {
    "title": "AWS ✕ さくらクラウド ハイブリッド併用案",
    "description": "2つのクラウドを組み合わせる場合の推奨設計"
  },
  "architectureDiagram": {
    "title": "さくらクラウド変換後の推奨構築例",
    "nodes": [
      {"id": "n1", "label": "コンポーネント名", "type": "server | elb | db | vpc_router | switch | external | storage"}
    ],
    "links": [
      {"from": "n1", "to": "n2", "label": "通信内容"}
    ]
  },
  "iacSnippet": {
    "tool": "Terraform (sacloud/sakuracloud)",
    "code": "resource \"sakuracloud_server\" \"web\" {\\n  name = \"web-01\"\\n  core = 2\\n  memory = 4\\n  ...\\n}"
  }
}`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text?.trim() || '{}';
        const parsed = JSON.parse(text);
        return res.json({
          success: true,
          translation: parsed,
          source: 'gemini-3.8-flash',
        });
      } catch (geminiErr) {
        console.error('Gemini translation error:', geminiErr);
      }
    }

    // Fallback translation response
    return res.json({
      success: true,
      translation: {
        title: 'AWSからさくらクラウドへの基本構成マッピング',
        summary: 'AWSの典型的な3層構成（ALB + EC2 + RDS + S3 + NAT Gateway）をさくらクラウドの標準アプライアンス群へ置き換える設計です。',
        mappingTable: [
          {
            awsService: 'Application Load Balancer (ALB)',
            sakuraService: 'エンハンスドロードバランサ (ELB)',
            role: 'SSL終端・Anycast負荷分散',
            considerations: 'Let\'s Encryptによる無料証明書自動発行・更新が可能。DDoS防御が標準装備。',
          },
          {
            awsService: 'EC2 Instances (AutoScaling)',
            sakuraService: 'さくらのクラウド サーバ群',
            role: 'Web / APIアプリケーション実行基盤',
            considerations: '転送量が無料。vCPU/メモリの組み合わせを自由に変更可能。',
          },
          {
            awsService: 'Amazon RDS (PostgreSQL/MySQL)',
            sakuraService: 'データベースアプライアンス',
            role: 'マネージドRDB',
            considerations: 'Active/Standbyの冗長化プランあり。固定月額で予期せぬIOPS課金なし。',
          },
          {
            awsService: 'Amazon S3',
            sakuraService: 'オブジェクトストレージ',
            role: '静的アセット・バックアップ保管',
            considerations: 'S3互換API提供のため、既存のAWS SDKやCLIのエンドポイントを変更するだけで移行可能。',
          },
          {
            awsService: 'NAT Gateway / VPC Route Table',
            sakuraService: 'VPCルータ ＋ プライベートスイッチ',
            role: '閉域セグメントからの外部通信(SNAT)・リモートVPN',
            considerations: 'IPマスカレード機能でNAT集約。VRRP冗長化プランあり。',
          },
        ],
        costAndPerformanceComparison: {
          trafficAdvantage: '特にアウトバウンド転送が数十TB規模になる場合、AWSでは数十万円〜数百万円の通信費が発生しますが、さくらクラウドでは完全無料となります。',
          computeAdvantage: '月額上限課金が自動適用され、突発的なスパイクや長期間稼働でも予算予測が極めて容易です。',
          tradeOffs: 'AWS特有のフルマネージドサーバーレス（Lambda, DynamoDB, Aurora Serverless）はネイティブには存在しないため、コンテナや仮想サーバ上でのセルフホストまたはハイブリッド連携を検討します。',
        },
        hybridBlueprint: {
          title: 'AWS AI/分析 ✕ さくらクラウド高トラフィック配信ハイブリッド構成',
          description: '重い静的ファイル配信やWebフロントエンド・バッチ処理をさくらクラウドで行い、BedrockやSageMakerなどのAI/機械学習APIをAWS側で呼び出すハイブリッド構成がコスト・機能面で最も優れています。',
        },
        architectureDiagram: {
          title: 'さくらクラウド標準Web冗長化トポロジー',
          nodes: [
            { id: 'client', label: 'インターネット (User)', type: 'external' },
            { id: 'elb', label: 'エンハンスドロードバランサ (ELB)', type: 'elb' },
            { id: 'web1', label: 'Webサーバ #1 (2コア/4GB)', type: 'server' },
            { id: 'web2', label: 'Webサーバ #2 (2コア/4GB)', type: 'server' },
            { id: 'switch', label: 'プライベートスイッチ', type: 'switch' },
            { id: 'db', label: 'データベースアプライアンス (PostgreSQL)', type: 'db' },
            { id: 'storage', label: 'オブジェクトストレージ (S3互換)', type: 'storage' },
          ],
          links: [
            { from: 'client', to: 'elb', label: 'HTTPS' },
            { from: 'elb', to: 'web1', label: 'HTTP' },
            { from: 'elb', to: 'web2', label: 'HTTP' },
            { from: 'web1', to: 'switch', label: 'L2' },
            { from: 'web2', to: 'switch', label: 'L2' },
            { from: 'switch', to: 'db', label: 'DB接続' },
            { from: 'web1', to: 'storage', label: 'S3 API' },
          ],
        },
        iacSnippet: {
          tool: 'Terraform (sacloud/sakuracloud)',
          code: `# さくらクラウド プロバイダー設定
terraform {
  required_providers {
    sakuracloud = {
      source  = "sacloud/sakuracloud"
      version = "~> 2.25.0"
    }
  }
}

# プライベートスイッチ
resource "sakuracloud_switch" "app_switch" {
  name = "internal-app-switch"
}

# Webサーバ
resource "sakuracloud_server" "web" {
  count = 2
  name  = "web-server-\${count.index + 1}"
  core   = 2
  memory = 4

  network_interface {
    upstream = sakuracloud_switch.app_switch.id
  }
}`,
        },
      },
      source: 'curated-baseline',
    });
  } catch (error: any) {
    console.error('Translate route error:', error);
    res.status(500).json({ error: 'アーキテクチャ変換処理中にエラーが発生しました。' });
  }
});

// ----------------------------------------------------
// AWS Visual Architecture & Developer Consultation Endpoints
// ----------------------------------------------------
app.get('/api/mental-models', (req: Request, res: Response) => {
  res.json({ models: AWS_MENTAL_MODELS });
});

app.post('/api/consult', async (req: Request, res: Response) => {
  try {
    const { question, history } = req.body;
    if (!question) {
      return res.status(400).json({ error: '質問内容を入力してください。' });
    }

    // Try finding matching preset first (only if no history)
    const isFollowUp = Array.isArray(history) && history.length > 0;
    const matchedPreset = !isFollowUp ? AWS_MENTAL_MODELS.find(m =>
      question.toLowerCase().includes(m.service.toLowerCase()) ||
      m.coreQuestion.includes(question) ||
      m.title.includes(question)
    ) : null;

    if (ai) {
      const historyContext = isFollowUp ? `
【これまでの対話コンテキスト（前回の相談・回答内容）】:
${history.map((h: any, idx: number) => `[Turn ${idx + 1}]
- ユーザーの質問: ${h.question}
- 回答タイトル: ${h.title || ''}
- 対象サービス: ${(h.targetServices || []).join(', ')}
- 要約: ${h.devSummary || h.summary || ''}
`).join('\n')}

※今回の質問は上記の対話に続く「追加質問（フォローアップ・深掘り）」です。前回の構成や文脈を踏まえ、差分や変更点、さらに深掘りしたインフラ設計・落とし穴・通信シーケンスを反映した回答とアーキテクチャ図を作成してください。
` : '';

      const prompt = `あなたは「アプリ開発者の目線に徹底的に寄り添うAWSチーフソリューションアーキテクト」です。
ユーザーは「アプリ開発経験はあるが、AWSのインフラ基盤（VPC、サブネット、ルーティング、セキュリティグループ、NAT Gateway、VPCエンドポイント、IAMロール）に苦手意識があるエンジニア」です。

ユーザーからの以下のAWS技術相談に対して、抽象的な説明ではなく「なぜこの基盤が必要なのか」「通信パケットやイベントがどう流れるのか」が直感的にイメージできる詳細な解説と、可視化用のアーキテクチャ図データを作成してください。
対象技術: Step Functions, Lambda, EventBridge, S3, CloudFront, OpenSearch, FSx for NetApp ONTAP, SQS, VPC。
${historyContext}
【ユーザーからの質問】:
${question}

【必須要件】:
1. アプリ開発者向け要約（結論と要点を簡潔に）
2. メンタルモデル解説（なぜこの基盤設計が必要なのか。アプリ目線での例えや理由）
3. パケット/イベント通信フロー（Step 1, Step 2, Step 3... で順序立てて解説）
4. 基盤設計の急所（セキュリティグループのポート、VPC配置、IAM、およびアプリ開発者が最もハマりやすい落とし穴）
5. 動的アーキテクチャ図のノード＆リンクデータ（JSON）
6. 実装コード（Terraform, CDK, または Node.js AWS SDK v3）

必ず以下のJSONフォーマットのみで回答してください（Markdownコードブロック不要）:
{
  "title": "相談タイトル",
  "targetServices": ["Step Functions", "SQS"],
  "devSummary": "アプリ開発者目線での結論・要約",
  "mentalModelExplanation": "直感的なメンタルモデル解説（なぜこの設計なのか）",
  "diagram": {
    "title": "推奨アーキテクチャ構成図",
    "nodes": [
      {
        "id": "node_id",
        "label": "サービス名\\nスペックや役割",
        "type": "lambda",
        "tier": 2,
        "subText": "役割・説明",
        "vpcPlacement": "inside_vpc_private",
        "securityGroup": "sg-name",
        "port": "443"
      }
    ],
    "links": [
      {
        "from": "from_id",
        "to": "to_id",
        "label": "通信プロトコル / 内容",
        "linkType": "sync"
      }
    ],
    "packetFlowSteps": [
      {
        "step": 1,
        "title": "ステップ名",
        "description": "パケットやデータがどう流れるかの平易な解説",
        "from": "from_id",
        "to": "to_id"
      }
    ]
  },
  "packetFlow": [
    {
      "step": 1,
      "title": "ステップ名",
      "description": "パケットやデータがどう流れるかの平易な解説",
      "from": "from_id",
      "to": "to_id"
    }
  ],
  "infraKeyPoints": [
    {
      "category": "カテゴリ名",
      "title": "設計ポイント",
      "explanation": "詳細説明",
      "pitfall": "アプリ開発者がハマりやすい落とし穴"
    }
  ],
  "codeSnippet": {
    "language": "terraform",
    "title": "コードのタイトル",
    "code": "設定または実装コード"
  }
}`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
        const text = response.text?.trim() || '{}';
        const parsed = JSON.parse(text);
        return res.json({
          success: true,
          consultation: parsed,
          source: 'gemini-3.8-flash',
        });
      } catch (geminiErr) {
        console.error('Gemini consult error:', geminiErr);
      }
    }

    // Fallback to matched preset
    const fallback = matchedPreset || AWS_MENTAL_MODELS[0];
    return res.json({
      success: true,
      consultation: {
        title: fallback.title,
        targetServices: [fallback.service],
        devSummary: fallback.summary,
        mentalModelExplanation: fallback.whyThisWay.join('\n\n'),
        diagram: fallback.diagram,
        packetFlow: fallback.diagram.packetFlowSteps || [],
        infraKeyPoints: [
          {
            category: '基盤設計の急所',
            title: `${fallback.service} の運用ポイント`,
            explanation: fallback.summary,
            pitfall: fallback.commonPitfall,
          },
        ],
        codeSnippet: fallback.solutionCode
          ? {
              language: 'json',
              title: fallback.solutionCode.tool,
              code: fallback.solutionCode.code,
            }
          : undefined,
      },
      source: 'preset-fallback',
    });
  } catch (error: any) {
    console.error('Consult route error:', error);
    res.status(500).json({ error: '相談処理中にエラーが発生しました。' });
  }
});

// Vite Middleware mounting in development or static serving in production
async function setupViteOrStatic() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }
}

setupViteOrStatic().then(() => {
  app.listen(port, () => {
    console.log(`Sakura Cloud Support Agent Server running on http://localhost:${port}`);
  });
});
