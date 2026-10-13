# AWS 実装イメージ・アーキテクチャ視覚支援エージェント
### (AWS Visual Architecture Agent for Application Developers)

アプリ開発者の視点に立ち、苦手になりがちな**AWSのインフラ基盤（VPC、サブネット、ルーティング、セキュリティグループ、NAT Gateway、VPCエンドポイント、IAMロール）**と、**イベント駆動・データ処理サービス群**の連携を徹底的に「動的トポロジー図」と「直感的メンタルモデル」で視覚支援する対話型フルスタックWebアプリケーションです。

---

## 🎯 ターゲット＆対象テクノロジー

### 対象ユーザー
- アプリケーション開発（フロントエンド/バックエンド/API）のバックグラウンドを持つエンジニア
- 「AWSのサービス名は知っているが、基盤の通信経路やセキュリティ設定に自信がない」方
- 「なぜ動かないのか」「なぜタイムアウトするのか」のインフラ原因を直感的に掴みたい方

### 重点フォーカスサービス
1. **Step Functions**: 複数タスクの分散オーケストレーション、指数バックオフリートライ、DLQ退避、Sagaパターン
2. **Lambda**: 実行環境、タイムアウト、VPC内アタッチ時のHyperplane ENIとNAT Gatewayの必要性
3. **EventBridge**: カスタムイベントバス、JSONスキーマ主導のパターンフィルタリング、マイクロサービス疎結合化
4. **S3**: 非公開バケット保護、KMS暗号化、バケットポリシー、CORS
5. **CloudFront**: OAC (Origin Access Control) による完全閉塞配信、キャッシュポリシー、署名付きURL
6. **OpenSearch Service**: VPC内ドメイン配置、セキュリティグループ連携、IAM SigV4署名リクエスト認証
7. **FSx for NetApp ONTAP**: Multi-AZ冗長化、SVMマウントターゲット、フローティングIPルートテーブル、NFS/SMB
8. **SQS**: Standard/FIFOキューイング、Visibility TimeoutとLambda Timeoutの整合性、デッドレターキュー (DLQ)
9. **VPC基礎**: パブリック/プライベートサブネット、ルートテーブル、NAT Gateway、Gateway型/Interface型VPCエンドポイント

---

## 🌟 主な機能

### 1. 💡 AI技術相談 & 動的アーキテクチャ図解生成 (`/api/consult`)
- 自由入力またはアプリ開発者向け頻出プリセットから技術相談を投稿。
- Gemini 3.8 Flashがアプリ開発者のメンタルモデルに沿って「なぜこの基盤が必要か」を解説。
- **動的SVGトポロジー図**を自動描画し、パケット/イベント通信の順序（Step 1, Step 2...）をインタラクティブにハイライト。
- セキュリティグループ、IAM、Terraform/CDK実装コードをセットで出力。

### 2. 📐 8大基盤メンタルモデル図解ギャラリー
- 現場で最も多用される6つのベストプラクティス構成を常設展示。
- ワンクリックで構成を切り替え、パケットフローをステップ追跡可能。

### 3. ⚠️ 基盤の落とし穴 ＆ アンチパターン診断スタジオ
- 「VPC内Lambdaが外部Stripe APIに繋がらない（NAT GW不足）」
- 「CloudFront経由のS3画像が403 AccessDeniedになる（OAC Condition漏れ）」
- 「SQSメッセージが重複二重実行される（Visibility Timeout設定ミス）」
- 「OpenSearchへのSigV4署名エラー」
- 「FSx ONTAPのNFSマウントタイムアウト」
などの原因と修正コードを即座に診断。

---

## 🚀 クイックスタート

### 前提条件
- Node.js 18+ または 20+
- npm または bun

### 起動手順
```bash
# 1. ディレクトリへ移動
cd projects/aws-visual-agent

# 2. 依存パッケージのインストール
npm install

# 3. 開発サーバーの起動 (Express + Vite)
npm run dev
# -> http://localhost:3000 で起動
```

### 環境変数 (`.env`)
```bash
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
PORT=3000
```
