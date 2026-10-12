# さくらクラウド 資格試験・調査サポートエージェント
### (Sakura Cloud Certification & Architecture Research Support Agent)

さくらのクラウド（さくらインターネット）の公式ドキュメント・仕様に準拠した技術調査レポートの作成、公式認定資格（アソシエイト／プロフェッショナル）試験対策ドリル＆模擬試験、およびAWSエンジニア向けのサービス対比・アーキテクチャ相互補完スタジオを提供するフルスタックWebアプリケーションです。

---

## 🌟 主な機能と特徴

### 1. 🎓 資格試験対策・模擬テストスタジオ (Certification Exam Studio)
- **シラバス5大分野の集中演習**:
  - **第1分野**: 基本アーキテクチャ・課金・ゾーン特性 (vCPU/メモリ自由比率、日額・月額上限、データ転送量完全無料)
  - **第2分野**: ネットワーク・VPCルータ・ELB (Anycast L7、Let's Encrypt自動更新、VRRP冗長化、プライベートスイッチ)
  - **第3分野**: データベース・ストレージ・アプライアンス (PostgreSQL/MariaDB HA、S3互換オブジェクトストレージ)
  - **第4分野**: 高可用性設計・マルチゾーンDR・閉域網 (GSLB広域DNSフェイルオーバー、ゾーン間ブリッジ、さくらのセキュアモバイルSIM)
  - **第5分野**: IaC自動化・AWS移行・トラブルシューティング (Terraform Provider SakuraCloud、Usacloud CLI)
- **本番形式 模擬試験モード (Mock Exam)**:
  - 15分カウントダウンタイマー付きで本番レベルのプレッシャーを体験。
  - 合格基準ライン（得点率70%以上でPASS判定）。
  - 「後で見直す」フラグ機能付き問題一覧ナビ。
  - 採点後は正誤一覧、公式仕様の根拠解説、**構築例イメージ図（トポロジー）**、AWS比較ノートで総復習。
- **出題急所チートシート＆試験の落とし穴**:
  - 試験によく出る重要数値（VRRPの所要IP数=3個、GSLB月額550円/FQDNなど）。
  - AWSエンジニアが直感で解いて間違えやすい「引っかけ選択肢」を重点解説。
- **AI認定問題生成 (Gemini 3.8 Flash)**:
  - 任意の弱点キーワード（例: `VPCルータ VRRP`、`Let's Encrypt ELB`、`S3移行`）から試験レベルのオリジナル問題を無制限生成。

### 2. 📋 公式調査レポート作成エージェント (Official Research Explorer)
- さくらのクラウド公式マニュアル・仕様・制限事項を元に、実践的な技術調査レポートを自動作成。
- クイックプリセット:
  - Web3層冗長構成とELB
  - VPCルータとIPsec閉域VPN
  - 石狩・東京 マルチゾーンDR
  - オブジェクトストレージ (S3互換)
  - データ転送量無料のコスト削減試算
  - Terraform & Usacloud IaCベストプラクティス
- マークダウン表示、ワンクリックコピー、`.md`ファイル保存機能完備。

### 3. 🔄 AWS ↔ さくらクラウド 相互比較・変換スタジオ (AWS Cross-Study)
- **サービス対比マトリクス**:
  - EC2 ↔ サーバ、ALB ↔ エンハンスドロードバランサ、RDS ↔ データベースアプライアンス、S3 ↔ オブジェクトストレージ、NAT GW/VGW ↔ VPCルータ、Route 53 ↔ GSLB、CloudFront ↔ ウェブアクセラレータなどの仕様・課金比較。
- **アーキテクチャ相互変換**:
  - 普段使っているAWS構成（例: `ALB + EC2 + RDS Multi-AZ + S3 + NAT Gateway`）を入力すると、さくらクラウドの等価構成、転送量無料によるコスト削減試算、ハイブリッド併用案、Terraformサンプルコードを自動生成。

### 4. 📐 構築例・アーキテクチャギャラリー (Architecture Topology Viewer)
- 実務で多用される4大トポロジー（標準Web 3層HA、AWS移行構成、オンプレ/AWS閉域VPNハイブリッド、広域DR）をインタラクティブに拡大・縮小・ノード検証可能。

---

## 🚀 クイックスタート

### 前提条件
- Node.js 18+ または 20+
- npm または bun

### インストール & 起動
```bash
# 依存関係のインストール
npm install

# 開発サーバー起動（Express + Vite フルスタック）
npm run dev
# -> http://localhost:3000
```

### 環境変数設定 (`.env`)
```bash
# Gemini API Key (AI問題生成・調査レポート生成に使用)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

### ビルド & 本番実行
```bash
npm run build
npm start
```

---

## 📁 ディレクトリ構成

```
.
├── server.ts                    # Express + Gemini API バックエンドプロキシ & Viteミドルウェア
├── index.html                   # HTMLエントリポイント
├── package.json                 # 依存関係定義
├── tsconfig.json                # TypeScript設定
├── vite.config.ts               # Viteバンドラ設定
└── src/
    ├── main.tsx                 # Reactマウントポイント
    ├── App.tsx                  # メイン画面・タブ切替
    ├── index.css                # Tailwind CSSスタイル定義
    ├── types/
    │   └── index.ts             # 資格試験問題、レポート、トポロジー型定義
    ├── data/
    │   └── sakuraKnowledge.ts   # 公式仕様ナレッジベース、シラバス、チートシート
    └── components/
        ├── Header.tsx           # ヘッダー・資格試験ブランディング
        ├── QuizStudio.tsx       # 資格試験対策・模擬テスト・チートシート
        ├── ResearchAgent.tsx    # 公式調査レポート作成エージェント
        ├── AwsCrossComparator.tsx # AWS ↔ さくら比較・アーキテクチャ変換
        ├── ArchitectureViewer.tsx # 構築例・構成図ギャラリー
        └── ArchitectureDiagram.tsx # インタラクティブSVGトポロジー可視化
```
