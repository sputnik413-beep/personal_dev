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

// 1. Get Mental Models
app.get('/api/mental-models', (req: Request, res: Response) => {
  res.json({ models: AWS_MENTAL_MODELS });
});

// 2. Interactive AI Consultation & Dynamic Diagram Generation
app.post('/api/consult', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: '質問内容を入力してください。' });
    }

    // Try finding matching preset first
    const matchedPreset = AWS_MENTAL_MODELS.find(m =>
      question.toLowerCase().includes(m.service.toLowerCase()) ||
      m.coreQuestion.includes(question) ||
      m.title.includes(question)
    );

    if (ai) {
      const prompt = `あなたは「アプリ開発者の目線に徹底的に寄り添うAWSチーフソリューションアーキテクト」です。
ユーザーは「アプリ開発経験はあるが、AWSのインフラ基盤（VPC、サブネット、ルーティング、セキュリティグループ、NAT Gateway、VPCエンドポイント、IAMロール）に苦手意識があるエンジニア」です。

ユーザーからの以下のAWS技術相談に対して、抽象的な説明ではなく「なぜこの基盤が必要なのか」「通信パケットやイベントがどう流れるのか」が直感的にイメージできる詳細な解説と、可視化用のアーキテクチャ図データを作成してください。
対象技術: Step Functions, Lambda, EventBridge, S3, CloudFront, OpenSearch, FSx for NetApp ONTAP, SQS, VPC。

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
  "targetServices": ["Step Functions", "SQS", ...],
  "devSummary": "アプリ開発者目線での結論・要約",
  "mentalModelExplanation": "直感的なメンタルモデル解説（なぜこの設計なのか）",
  "diagram": {
    "title": "推奨アーキテクチャ構成図",
    "nodes": [
      {
        "id": "node_id",
        "label": "サービス名\\nスペックや役割",
        "type": "lambda | stepfunctions | eventbridge | s3 | cloudfront | opensearch | fsx_ontap | sqs | vpc | nat_gw | igw | client | iam_role | vpc_endpoint",
        "tier": 0, // 0: client/edge, 1: ingress/bus, 2: compute, 3: queue/middle, 4: backend/db
        "subText": "役割・説明",
        "vpcPlacement": "inside_vpc_private | inside_vpc_public | outside_vpc | edge",
        "securityGroup": "sg-name (任意)",
        "port": "443 (任意)"
      }
    ],
    "links": [
      {
        "from": "from_id",
        "to": "to_id",
        "label": "通信プロトコル / 内容",
        "linkType": "sync | async | event | storage | auth"
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
    "language": "terraform | typescript | json",
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
            pitfall: fallback.commonPitfall
          }
        ],
        codeSnippet: fallback.solutionCode ? {
          language: 'json',
          title: fallback.solutionCode.tool,
          code: fallback.solutionCode.code
        } : undefined
      },
      source: 'preset-fallback'
    });
  } catch (error: any) {
    console.error('Consult route error:', error);
    res.status(500).json({ error: '相談処理中にエラーが発生しました。' });
  }
});

// Setup Vite middleware or static
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
    console.log(`AWS Visual Architecture Agent Server running on http://localhost:${port}`);
  });
});
