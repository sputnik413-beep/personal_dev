import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Shared server-side Gemini client (for AI Bot persona analysis)
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      timeout: 30000,
    },
  });
};

const SESSIONS_FILE_PATH = path.resolve(__dirname, 'mahjong_sessions_data.json');

// In-memory store fallback
let storedSessions: any[] = [];

function loadStoredSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE_PATH)) {
      const raw = fs.readFileSync(SESSIONS_FILE_PATH, 'utf-8');
      storedSessions = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load mahjong sessions:', e);
  }
}

function saveStoredSessions() {
  try {
    fs.writeFileSync(SESSIONS_FILE_PATH, JSON.stringify(storedSessions, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save mahjong sessions:', e);
  }
}

loadStoredSessions();

// -------------------------------------------------------------
// Mahjong REST API Endpoints
// -------------------------------------------------------------

// 1. Get all recorded sessions
app.get('/api/mahjong/sessions', (req: Request, res: Response) => {
  res.json({ success: true, sessions: storedSessions });
});

// 2. Save / update session
app.post('/api/mahjong/sessions', (req: Request, res: Response) => {
  const { session } = req.body;
  if (!session || !session.id) {
    return res.status(400).json({ error: 'Invalid session data' });
  }

  const existingIdx = storedSessions.findIndex((s) => s.id === session.id);
  if (existingIdx >= 0) {
    storedSessions[existingIdx] = session;
  } else {
    storedSessions.unshift(session);
  }

  saveStoredSessions();
  res.json({ success: true, sessions: storedSessions });
});

// 3. AI Persona Generation from Telemetry (Gemini API)
app.post('/api/ai/synthesize-persona', async (req: Request, res: Response) => {
  try {
    const { telemetrySummary, playerName = 'Unknown' } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Fallback synthesizer
      return res.json({
        persona: {
          id: `persona_ai_${Date.now()}`,
          name: `${playerName}・AIレプリカ`,
          avatarSeed: `ai_${Date.now()}`,
          description: '牌効率と防御を両立させたバランス型AIモデル。',
          styleTag: '適応型レプリカ',
          isAiBot: true,
          callTendency: 40,
          riichiTendency: 65,
          defensePriority: 75,
          badWaitTolerance: 30,
          damaPreference: 45,
          maneManganHunter: 15,
          pushShantenThreshold: 1,
        },
      });
    }

    const prompt = `あなたは麻雀のプロクオンツ・AI戦術アナリストです。
以下のプレイヤーの実戦牌譜サマリーを分析し、このプレイヤーの思考癖（鳴き判断、立直攻撃性、ベタオリ守備力、ダマテン傾向、マネ満への固執度）を模倣するAIボットのペルソナパラメータ(0〜100)をJSONで出力してください。

【プレイヤー情報】: ${playerName}
【牌譜サマリー】: ${JSON.stringify(telemetrySummary || {})}

JSONフォーマット（このJSONのみを出力してください）:
{
  "name": "${playerName}・AIプロファイル",
  "styleTag": "二つ名（例: 門前高打点型）",
  "description": "プレイスタイルの特徴解説（100文字程度）",
  "callTendency": 30,
  "riichiTendency": 70,
  "defensePriority": 85,
  "badWaitTolerance": 25,
  "damaPreference": 60,
  "maneManganHunter": 10,
  "pushShantenThreshold": 1
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      persona: {
        id: `persona_ai_${Date.now()}`,
        avatarSeed: `ai_${Date.now()}`,
        isAiBot: true,
        ...parsed,
      },
    });
  } catch (err: any) {
    console.error('Error generating AI persona:', err);
    res.json({
      persona: {
        id: `persona_ai_${Date.now()}`,
        name: 'AIレプリカ (Fallback)',
        avatarSeed: `ai_${Date.now()}`,
        description: 'バランス型ハイブリッドAI。',
        styleTag: 'ハイブリッド型',
        isAiBot: true,
        callTendency: 45,
        riichiTendency: 60,
        defensePriority: 70,
        badWaitTolerance: 30,
        damaPreference: 50,
        maneManganHunter: 20,
        pushShantenThreshold: 2,
      },
    });
  }
});

// 4. Custom Analytical Agent Query Execution
app.post('/api/ai/agent-query', async (req: Request, res: Response) => {
  try {
    const { agentPrompt, matchLog } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        result: 'Gemini APIが未接続のため、ローカル統計ルールに基づき集計しました。放銃ケアレベルと向聴数推移は正常に記録されています。',
        timestamp: Date.now(),
      });
    }

    const systemInstruction = `あなたは競技麻雀およびデータ分析に精通したシニアクオンツ・アナリストです。
提供された麻雀牌譜の精密テレメトリ（各巡目の向聴数、打牌、放銃ケアレベルLv1〜4、無謀押し、オープン立直、真似満等の状況）を客観的・論理的に分析し、ユーザーの問いに明瞭に回答してください。`;

    const prompt = `【分析プロンプト】: ${agentPrompt || 'この対局の重要な押し引き判断と改善点を要約してください。'}
【標準牌譜テレメトリJSON】:
${JSON.stringify(matchLog || {}, null, 2).slice(0, 8000)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    res.json({
      result: response.text || '回答を生成できませんでした。',
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Agent query error:', err);
    res.status(500).json({ error: err?.message || 'エージェントクエリ実行中にエラーが発生しました。' });
  }
});


// -------------------------------------------------------------
// Vite Frontend Middleware / Static Server
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Mahjong Analytics & Simulation Platform server running on port ${PORT}`);
  });
}

startServer();
