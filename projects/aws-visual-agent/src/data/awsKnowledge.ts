import { MentalModelTopic } from '../types';

export const AWS_MENTAL_MODELS: MentalModelTopic[] = [
  {
    id: 'sfn_sqs_lambda',
    service: 'Step Functions / SQS / Lambda',
    tag: '非同期パイプライン & リトライ設計',
    title: 'Step Functions ✕ SQS ✕ Lambda による堅牢な非同期バッチ・ワークフロー',
    coreQuestion: 'なぜAPIから直接Lambdaを呼ばず、SQSとStep Functionsを組み合わせるのか？',
    summary: 'アプリ開発者がやりがちな「重い処理をAPIから同期的に呼ぶ」「Lambdaの15分制限に引っかかる」問題を完全解決する標準パターン。SQSで急なトラフィックを平滑化（バッファリング）し、Step Functionsが複数ステップの順序制御・自動リトライ・失敗時ロールバック（Sagaパターン）を視覚的に担保します。',
    diagram: {
      title: 'Step Functions ✕ SQS ✕ Lambda 非同期耐障害アーキテクチャ',
      nodes: [
        { id: 'client', label: 'クライアント / Web API', type: 'client', tier: 0, subText: 'HTTP POST (即時202 Accepted返却)' },
        { id: 'sqs_in', label: 'SQS キュー (バッファ)\nStandard / FIFO', type: 'sqs', tier: 1, subText: '急激なアクセス集中を吸収' },
        { id: 'sfn', label: 'Step Functions\nState Machine (ワークフロー)', type: 'stepfunctions', tier: 2, subText: '分岐・並列・リトライ・待機制御' },
        { id: 'lambda_1', label: 'Lambda 1: データ検証\n(Node.js / Python)', type: 'lambda', tier: 3, subText: 'メモリ・実行時間最小化' },
        { id: 'lambda_2', label: 'Lambda 2: 外部API実行\n(Exponential Backoff)', type: 'lambda', tier: 3, subText: '一時エラー時の自動再試行' },
        { id: 's3_out', label: 'S3 バケット\n処理結果・アーティファクト', type: 's3', tier: 4, subText: '大容量ペイロードの保管' },
        { id: 'sqs_dlq', label: 'SQS デッドレターキュー (DLQ)\n失敗メッセージ退避', type: 'sqs', tier: 4, subText: '3回リトライ失敗時の安全弁' }
      ],
      links: [
        { from: 'client', to: 'sqs_in', label: '1. SendMessage', linkType: 'async' },
        { from: 'sqs_in', to: 'sfn', label: '2. StartExecution', linkType: 'async' },
        { from: 'sfn', to: 'lambda_1', label: 'Step 1: Validate', linkType: 'sync' },
        { from: 'lambda_1', to: 'lambda_2', label: 'Step 2: Process', linkType: 'sync' },
        { from: 'lambda_2', to: 's3_out', label: '3. PutObject', linkType: 'storage' },
        { from: 'sfn', to: 'sqs_dlq', label: 'Catch: エラー通知', linkType: 'async' }
      ],
      packetFlowSteps: [
        { step: 1, title: '受付・バッファリング', description: 'クライアントは重い処理の完了を待たず、SQSにメッセージを投入してHTTP 202を受け取ります。これで画面がフリーズしません。', from: 'client', to: 'sqs_in' },
        { step: 2, title: 'ステートマシン起動', description: 'Step FunctionsがSQSをポーリングまたはトリガーし、ワークフローを開始します。', from: 'sqs_in', to: 'sfn' },
        { step: 3, title: 'ステップ単位の実行と自動リトライ', description: '各タスクは小さな責務を持つLambdaに分割。外部APIが503を返しても、Step Functions設定で指数バックオフ（Exponential Backoff）リトライがコードレスで動きます。', from: 'sfn', to: 'lambda_2' },
        { step: 4, title: 'DLQによるメッセージ損失ゼロ', description: '最大リトライ回数を超えた異常データは、DLQに退避されアラート発砲。本番データが失われません。', from: 'sfn', to: 'sqs_dlq' }
      ]
    },
    whyThisWay: [
      'Lambda単体で長時間ループを回すと、タイムアウト（15分）制限や課金高騰（待機時間中もメモリ課金）が発生する',
      'Step Functionsの待機（Waitステート）やコールバック待機はLambdaの実行時間を消費しないため、コストが劇的に下がる',
      'AWSマネジメントコンソール上で「どのデータがどこで失敗したか」が一目でグラフィカルに追跡できる'
    ],
    commonPitfall: 'SQSの可視性タイムアウト（Visibility Timeout）がLambdaのタイムアウトより短いと、処理中に別のLambdaが同じメッセージを重複取得して二重実行される！',
    solutionCode: {
      tool: 'Step Functions JSON (Amazon States Language)',
      code: `{
  "Comment": "Robust Workflow with Retry and Catch to DLQ",
  "StartAt": "ValidateData",
  "States": {
    "ValidateData": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": { "FunctionName": "arn:aws:lambda:...:function:Validate" },
      "Next": "CallExternalAPI"
    },
    "CallExternalAPI": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Retry": [
        {
          "ErrorEquals": ["States.TaskFailed", "Lambda.ServiceException"],
          "IntervalSeconds": 2,
          "MaxAttempts": 3,
          "BackoffRate": 2.0
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "SendToDLQ"
        }
      ],
      "End": true
    },
    "SendToDLQ": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sqs:sendMessage",
      "Parameters": {
        "QueueUrl": "https://sqs.ap-northeast-1.amazonaws.com/.../my-dlq",
        "MessageBody.$": "$"
      },
      "End": true
    }
  }
}`
    }
  },
  {
    id: 'eventbridge_pubsub',
    service: 'EventBridge / SQS / Lambda',
    tag: 'イベント駆動・マイクロサービス連携',
    title: 'EventBridge によるスキーマ主導型イベントルーティングと疎結合設計',
    coreQuestion: 'なぜサービス間で直接REST APIを呼び合わず、EventBridgeを挟むべきなのか？',
    summary: 'アプリが増えるにつれ「AサービスがBサービスのURLやIPを知らなければならない（密結合）」状態になり、Bが落ちるとAも巻き込まれます。EventBridgeを使うと、送信側は「注文が確定した(OrderCreated)」とイベントバスに投げるだけ。受信側は必要なルールだけを設定して自前のSQSやLambdaで受け取れます。',
    diagram: {
      title: 'EventBridge イベントバスによる1対多 Pub/Sub パターン',
      nodes: [
        { id: 'order_service', label: '注文サービス (Producer)\nLambda / ECS', type: 'lambda', tier: 0, subText: 'PutEventsでイベント発行' },
        { id: 'event_bus', label: 'EventBridge\nCustom Event Bus', type: 'eventbridge', tier: 1, subText: 'JSONパターンフィルタリング' },
        { id: 'rule_billing', label: 'Rule: 決済処理\n{"detail-type": ["OrderCreated"]}', type: 'iam_role', tier: 2, subText: 'フィルタ条件マッチ' },
        { id: 'rule_analytics', label: 'Rule: 分析・監査\n{"source": ["ecommerce.order"]}', type: 'iam_role', tier: 2, subText: '全イベントをS3へ' },
        { id: 'sqs_billing', label: '決済用 SQS キュー', type: 'sqs', tier: 3, subText: '決済基盤への安全なキューイング' },
        { id: 'lambda_billing', label: '決済処理 Lambda', type: 'lambda', tier: 4, subText: '決済実行' },
        { id: 's3_analytics', label: 'S3 データレイク\n(Firehose経由)', type: 's3', tier: 4, subText: '長期分析ログ保存' }
      ],
      links: [
        { from: 'order_service', to: 'event_bus', label: 'PutEvents', linkType: 'event' },
        { from: 'event_bus', to: 'rule_billing', label: 'マッチ判定', linkType: 'sync' },
        { from: 'event_bus', to: 'rule_analytics', label: 'マッチ判定', linkType: 'sync' },
        { from: 'rule_billing', to: 'sqs_billing', label: 'Enqueue', linkType: 'async' },
        { from: 'sqs_billing', to: 'lambda_billing', label: 'EventSource', linkType: 'sync' },
        { from: 'rule_analytics', to: 's3_analytics', label: 'Archive', linkType: 'storage' }
      ],
      packetFlowSteps: [
        { step: 1, title: 'イベント発行', description: '注文サービスは決済や通知の存在を知る必要がなく、EventBridgeにJSONイベントを発行して処理完了。', from: 'order_service', to: 'event_bus' },
        { step: 2, title: 'ルールによるフィルタ', description: 'EventBridgeがペイロードのJSONキー（金額やステータス）を評価し、該当する宛先にのみルーティング。', from: 'event_bus', to: 'rule_billing' },
        { step: 3, title: '耐障害性の確保', description: 'ターゲットに直接Lambdaを指定せず、SQSを挟むことで、万一決済システムに障害が起きてもメッセージが失われません。', from: 'rule_billing', to: 'sqs_billing' }
      ]
    },
    whyThisWay: [
      '新しい受信者（例: マーケティング通知サービス）を追加する際、送信側アプリのコード変更が一切不要',
      'EventBridgeのアーカイブ＆リプレイ機能により、障害発生時の過去イベントをワンクリックで再送可能',
      'サードパーティSaaS（Datadog, Stripe, Shopify, GitHub）のWebhookも直接EventBridgeで受けられる'
    ],
    commonPitfall: 'EventBridgeのターゲットに直接Lambdaを指定すると、大量イベント発生時にLambdaの同時実行数上限（1000）を枯渇させることがある。必ずSQSをクッションに挟むのが実務ベストプラクティス！'
  },
  {
    id: 'cloudfront_s3_oac',
    service: 'CloudFront / S3',
    tag: 'Web配信 & セキュリティ',
    title: 'CloudFront ✕ S3 OAC (Origin Access Control) による完全閉塞・高速Web配信',
    coreQuestion: 'S3の静的ファイルを世界中に高速配信しつつ、S3への直接アクセスを100%遮断するには？',
    summary: 'Webアプリ開発者が最もハマりやすい「S3のパブリックアクセスを許可して情報漏洩する」リスクを完全排除する構成。S3バケットは完全非公開（Block Public Access有効）のまま、CloudFrontのOAC（Origin Access Control）にのみ読み取り権限を与えるバケットポリシーを設定します。',
    diagram: {
      title: 'CloudFront OAC ✕ 完全非公開 S3 アーキテクチャ',
      nodes: [
        { id: 'user', label: '世界中のユーザー / ブラウザ', type: 'client', tier: 0, subText: 'HTTPS (Anycast DNS)' },
        { id: 'cf', label: 'CloudFront エッジ配信\n(Distribution)', type: 'cloudfront', tier: 1, subText: 'キャッシュ・TLS終端・WAF連携' },
        { id: 'oac', label: 'OAC (Origin Access Control)\nAWS SigV4 署名ヘッダー付与', type: 'iam_role', tier: 2, subText: 'AWSサービスプリンシパル認証' },
        { id: 's3', label: 'S3 バケット (非公開)\nBlock Public Access: ON', type: 's3', tier: 3, subText: 'バケットポリシーでOACのみ許可' }
      ],
      links: [
        { from: 'user', to: 'cf', label: '1. HTTPS GET /index.html', linkType: 'sync' },
        { from: 'cf', to: 'oac', label: '2. SigV4署名作成', linkType: 'auth' },
        { from: 'oac', to: 's3', label: '3. s3:GetObject (非公開取得)', linkType: 'storage' },
        { from: 's3', to: 'cf', label: '4. キャッシュ & レスポンス', linkType: 'sync' },
        { from: 'cf', to: 'user', label: '5. 超高速エッジ返却', linkType: 'sync' }
      ],
      packetFlowSteps: [
        { step: 1, title: 'ユーザーからのアクセス', description: '最寄りのエッジロケーション（東京・大阪など）にアクセス。キャッシュがあればS3に行かず即座にミリ秒応答。', from: 'user', to: 'cf' },
        { step: 2, title: 'キャッシュミス時の安全なオリジン取得', description: 'キャッシュがない場合、CloudFrontはOACを通じてAWS SigV4署名を付与し、非公開S3バケットへ内部通信。', from: 'cf', to: 's3' },
        { step: 3, title: '直接アクセスの完全遮断', description: 'ユーザーがS3のURL（https://bucket.s3.amazonaws.com/...）を直接叩いても「403 Forbidden」で強固に拒絶されます。', from: 'user', to: 's3' }
      ]
    },
    whyThisWay: [
      '古いOAI (Origin Access Identity) はSSE-KMS暗号化や全リージョンで非対応だったが、現在の標準「OAC」は暗号化も完全サポート',
      '署名付きURL（Signed URLs）を使えば、「有料会員だけに特定の動画・PDFの閲覧を10分間だけ許可する」機能が簡単に作れる',
      'CloudFront Functionsを使うと、リダイレクトやBasic認証、URLの拡張子補完（/about -> /about.html）がサブミリ秒で動く'
    ],
    commonPitfall: 'S3バケットポリシーの `Condition: StringEquals: AWS:SourceArn` にCloudFrontディストリビューションのARNを正確に指定し忘れると、他人のCloudFrontからバケットが読まれる危険がある！',
    solutionCode: {
      tool: 'S3 Bucket Policy (OAC用設定例)',
      code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-secure-app-bucket/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE"
        }
      }
    }
  ]
}`
    }
  },
  {
    id: 'opensearch_vpc_lambda',
    service: 'OpenSearch / Lambda / VPC',
    tag: '全文検索 & セキュアネットワーク',
    title: 'VPC内 OpenSearch Service へのセキュア接続と SigV4 IAM 署名認証',
    coreQuestion: 'OpenSearchをセキュアに運用するためVPC内に置いた時、アプリはどう接続・認証するのか？',
    summary: 'OpenSearch（Elasticsearch後継）をインターネットに晒さずプライベートサブネット内に隔離。Lambda関数もVPC内にアタッチし、Hyperplane ENI経由でセキュアに接続します。Basic認証（ID/パスワード）を使わず、IAMロール（SigV4署名）で安全にアクセス制御する実務標準構成です。',
    diagram: {
      title: 'VPC内 OpenSearch ✕ Lambda IAM SigV4 認証トポロジー',
      nodes: [
        { id: 'client_api', label: 'API Gateway\n(公開エンドポイント)', type: 'client', tier: 0, subText: 'HTTPS REST API' },
        { id: 'vpc', label: 'VPC (10.0.0.0/16)', type: 'vpc', tier: 1, subText: '社内・サービス境界ネットワーク' },
        { id: 'lambda_search', label: '検索API Lambda\n(Hyperplane ENI)', type: 'lambda', tier: 2, vpcPlacement: 'inside_vpc_private', subText: 'Security Group: sg-lambda' },
        { id: 'opensearch', label: 'OpenSearch Service\n(VPC Domain)', type: 'opensearch', tier: 3, vpcPlacement: 'inside_vpc_private', subText: 'Security Group: sg-opensearch (Port 443)' },
        { id: 'nat_gw', label: 'NAT Gateway\n(Public Subnet)', type: 'nat_gw', tier: 2, vpcPlacement: 'inside_vpc_public', subText: 'Lambdaが外部APIを呼ぶ場合のみ必要' }
      ],
      links: [
        { from: 'client_api', to: 'lambda_search', label: '1. Invoke (GET /search)', linkType: 'sync' },
        { from: 'lambda_search', to: 'opensearch', label: '2. HTTPS (Port 443) + SigV4', linkType: 'auth' },
        { from: 'lambda_search', to: 'nat_gw', label: '外部通信時 (Optional)', linkType: 'network' }
      ],
      packetFlowSteps: [
        { step: 1, title: 'VPC内Lambdaの起動', description: 'Lambdaはプライベートサブネット内にENIを持ち、sg-lambdaをまとって起動します。', from: 'client_api', to: 'lambda_search' },
        { step: 2, title: 'セキュリティグループの検証', description: 'sg-opensearchは「sg-lambdaからのインバウンドPort 443（HTTPS）のみ許可」と設定されているため、不正パケットは瞬時に遮断。', from: 'lambda_search', to: 'opensearch' },
        { step: 3, title: 'IAM SigV4 による署名認証', description: 'Lambda実行ロールのIAM認証情報を元にHTTPヘッダーにAWS署名を付与。OpenSearchのFGAC（Fine-Grained Access Control）がインデックス権限を認可。', from: 'lambda_search', to: 'opensearch' }
      ]
    },
    whyThisWay: [
      'データベースや検索エンジンをパブリックIPに晒すのはセキュリティインシデントの最大原因。VPC内配置が鉄則',
      'ハードコードされたマスターユーザーのパスワード管理が不要になり、IAMの一元権限管理（最小権限の原則）ができる',
      'OpenSearch Serverlessを使う選択肢もあるが、既存VPCリソースとの低レイテンシ接続ではVPCドメイン配置が今なお強力'
    ],
    commonPitfall: 'LambdaをVPCに入れた途端、Stripeや外部APIを呼ぶコードがタイムアウトする！なぜならVPCプライベートサブネットには直接インターネットへの出口がないため、NAT GatewayかVPCエンドポイントが必須になる。'
  },
  {
    id: 'fsx_ontap_network',
    service: 'FSx for NetApp ONTAP / VPC',
    tag: 'エンタープライズ共有ストレージ',
    title: 'FSx for NetApp ONTAP の Multi-AZ ネットワーク構成とマウントの仕組み',
    coreQuestion: 'S3やEFSではなく、なぜ「FSx for NetApp ONTAP」を使い、どうネットワークを組むのか？',
    summary: 'オンプレミスのNetApp資産のクラウド移行や、マルチプロトコル（NFS・SMB・iSCSI同時利用）、超高スループット＆ミリ秒未満の低レイテンシ、Snapshot高速バックアップ、重複排除・自動圧縮、S3への自動階層化（Tiering）を求める企業基盤の中核。Multi-AZ配置ではフローティングIPとルートテーブルの理解が必須です。',
    diagram: {
      title: 'FSx for NetApp ONTAP Multi-AZ 冗長化トポロジー',
      nodes: [
        { id: 'vpc', label: 'VPC (10.0.0.0/16)', type: 'vpc', tier: 0, subText: '複数AZをまたぐ仮想ネットワーク' },
        { id: 'client_az1', label: 'アプリコンテナ / EC2\n(AZ 1: 10.0.1.0/24)', type: 'lambda', tier: 1, vpcPlacement: 'inside_vpc_private', subText: 'NFSクライアント' },
        { id: 'client_az2', label: 'アプリコンテナ / EC2\n(AZ 2: 10.0.2.0/24)', type: 'lambda', tier: 1, vpcPlacement: 'inside_vpc_private', subText: 'スタンバイ / スケール先' },
        { id: 'fsx_primary', label: 'FSx ONTAP Primary Node\n(AZ 1 Storage Controller)', type: 'fsx_ontap', tier: 2, vpcPlacement: 'inside_vpc_private', subText: 'SSD Activeコントローラー' },
        { id: 'fsx_standby', label: 'FSx ONTAP Standby Node\n(AZ 2 Storage Controller)', type: 'fsx_ontap', tier: 2, vpcPlacement: 'inside_vpc_private', subText: '同期レプリケーション待機' },
        { id: 's3_tiering', label: '容量プール (S3)\n自動データ階層化', type: 's3', tier: 3, subText: 'アクセス頻度の低いデータを自動退避' }
      ],
      links: [
        { from: 'client_az1', to: 'fsx_primary', label: 'NFS Mount (Port 2049)', linkType: 'storage' },
        { from: 'client_az2', to: 'fsx_primary', label: 'NFS Mount (フローティングIP)', linkType: 'storage' },
        { from: 'fsx_primary', to: 'fsx_standby', label: '同期NVRAM同期', linkType: 'sync' },
        { from: 'fsx_primary', to: 's3_tiering', label: '自動階層化 (Tiering)', linkType: 'storage' }
      ],
      packetFlowSteps: [
        { step: 1, title: 'SVM (Storage Virtual Machine) エンドポイント解決', description: 'クライアントはSVMの管理IPまたはNFSマウント用フローティングIPへ名前解決します。', from: 'client_az1', to: 'fsx_primary' },
        { step: 2, title: 'NFS/SMBプロトコル通信', description: 'セキュリティグループでPort 2049 (NFS) / 445 (SMB) を許可し、高速マウント。', from: 'client_az1', to: 'fsx_primary' },
        { step: 3, title: 'Multi-AZ自動フェイルオーバー', description: 'AZ 1のコントローラー障害時、数秒〜数十秒でルートテーブルのフローティングIPが自動でAZ 2のスタンバイノードへ付け替えられ、アプリはIPを変更せず通信継続。', from: 'fsx_primary', to: 'fsx_standby' }
      ]
    },
    whyThisWay: [
      'EFSに比べて圧倒的にIOPSが高く、ファイルシステムレベルのSnapshot（差分瞬時バックアップ）やクローンが秒速で完了',
      'アクセス頻度の低いデータを透過的にS3キャパシティプールへ逃がすため、SSDコストを最大70〜80%削減できる',
      'WindowsのActive Directoryドメイン参加やKerberos認証、LinuxのNFS v3/v4/v4.1に完全対応'
    ],
    commonPitfall: 'Multi-AZ FSx ONTAPでは「エンドポイントIP（フローティングIP）」がVPCのCIDR範囲外に割り当てられるため、ルートテーブルのルート設定を更新しないと他VPCやオンプレミスから繋がらない！'
  },
  {
    id: 'vpc_fundamentals',
    service: 'VPC / Subnet / NAT GW / VPC Endpoints',
    tag: 'アプリ開発者の基盤メンタルモデル',
    title: 'パブリック vs プライベートサブネット、NAT GW、VPCエンドポイントの仕組み',
    coreQuestion: 'なぜ「インターネットに出られない問題」が起き、どうネットワークを分けるのか？',
    summary: 'アプリ開発者が最も混乱しやすいインフラの骨格。「パブリックサブネット」とは単に「ルートテーブルの0.0.0.0/0がInternet Gateway(IGW)に向いている」サブネットのこと。「プライベートサブネット」から外に出るにはNAT Gatewayが必要。S3やDynamoDBへの通信はGateway型VPCエンドポイントを使えばNAT GWを通さず通信料が無料になります。',
    diagram: {
      title: 'VPC 標準ネットワーク境界・出口設計モデル',
      nodes: [
        { id: 'internet', label: '外部インターネット\n(SaaS, Stripe, GitHub)', type: 'client', tier: 0, subText: 'グローバルインターネット' },
        { id: 'igw', label: 'Internet Gateway (IGW)\nVPCの正面玄関', type: 'igw', tier: 1, subText: '双方向パブリックルーティング' },
        { id: 'pub_subnet', label: 'パブリックサブネット\nRoute: 0.0.0.0/0 -> igw', type: 'subnet_public', tier: 2, subText: 'ALBやNAT Gatewayを配置' },
        { id: 'nat', label: 'NAT Gateway\n(アウトバウンドSNAT専用)', type: 'nat_gw', tier: 2, subText: 'プライベート側の出口' },
        { id: 'priv_subnet', label: 'プライベートサブネット\nRoute: 0.0.0.0/0 -> nat', type: 'subnet_private', tier: 3, subText: 'Lambda, ECS, RDSを配置' },
        { id: 'app_service', label: 'バックエンドアプリ\n(Lambda / ECS)', type: 'lambda', tier: 3, subText: '直接外部からは見えない安全な領域' },
        { id: 's3_endpoint', label: 'S3 Gateway エンドポイント\n(Route Table直結・無料)', type: 'vpc_endpoint', tier: 4, subText: 'NATを通さずプライベート接続' }
      ],
      links: [
        { from: 'internet', to: 'igw', label: 'WAN通信', linkType: 'network' },
        { from: 'igw', to: 'pub_subnet', label: 'L3 Route', linkType: 'network' },
        { from: 'pub_subnet', to: 'nat', label: 'NAT収容', linkType: 'network' },
        { from: 'app_service', to: 'nat', label: '外向き通信 (SNAT)', linkType: 'network' },
        { from: 'nat', to: 'igw', label: 'インターネットへ', linkType: 'network' },
        { from: 'app_service', to: 's3_endpoint', label: 'S3通信 (無料ルート)', linkType: 'storage' }
      ],
      packetFlowSteps: [
        { step: 1, title: 'プライベートサブネットからの外部アクセス', description: 'アプリが外部APIを呼ぶパケットは、ルートテーブルに従ってNAT Gatewayへ送られます。', from: 'app_service', to: 'nat' },
        { step: 2, title: 'NAT GatewayによるIP変換', description: 'NAT Gatewayが自身のElastic IP（パブリックIP）に送信元を変換し、IGW経由でインターネットへ送り出します。外からの不正インバウンドは通しません。', from: 'nat', to: 'igw' },
        { step: 3, title: 'VPCエンドポイントによるショートカット', description: 'S3宛てのパケットはNAT GWを通らず、VPCエンドポイント経由でAWS内部ネットワークを直行。転送費がゼロになり超高速。', from: 'app_service', to: 's3_endpoint' }
      ]
    },
    whyThisWay: [
      'データベースや内部ロジックをインターネットから不可視にする（ゼロトラストの第1歩）',
      'NAT Gatewayは1台あたり月額約$32＋データ転送料金がかかるため、S3/DynamoDBには無料のGatewayエンドポイントを使うのがコスト削減の鉄則',
      'セキュリティグループ（ステートフル）とネットワークACL（ステートレス）の二重防御ができる'
    ],
    commonPitfall: 'NAT Gatewayをプライベートサブネットの中に置いてしまうミス！NAT Gateway自身がインターネットと通信するために、必ず「ルートテーブルがIGWに向いているパブリックサブネット」に配置しなければ動かない。'
  }
];
