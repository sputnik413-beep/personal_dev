import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { CURATED_QUIZZES, EXAM_SYLLABUS_DOMAINS, EXAM_CHEATSHEETS } from '../data/sakuraKnowledge';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  BookOpen,
  ExternalLink,
  Flame,
  Award,
  Layers,
  HelpCircle,
  Clock,
  RotateCcw,
  CheckSquare,
  AlertTriangle,
  FileCheck2,
  Bookmark,
  BookMarked,
  Sliders,
} from 'lucide-react';

type ExamMode = 'drill' | 'mock' | 'cheatsheet';

export const QuizStudio: React.FC = () => {
  const [examMode, setExamMode] = useState<ExamMode>('drill');
  const [selectedDomain, setSelectedDomain] = useState<string>('domain_all');

  // Drill Mode state
  const [drillQuestions, setDrillQuestions] = useState<QuizQuestion[]>(CURATED_QUIZZES);
  const [drillIndex, setDrillIndex] = useState(0);
  const [drillSelectedOption, setDrillSelectedOption] = useState<string | null>(null);
  const [drillIsAnswered, setDrillIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [streak, setStreak] = useState(0);

  // Mock Exam Mode state
  const [mockQuestions, setMockQuestions] = useState<QuizQuestion[]>([]);
  const [mockIndex, setMockIndex] = useState(0);
  const [mockAnswers, setMockAnswers] = useState<Record<string, string>>({});
  const [mockFlags, setMockFlags] = useState<Record<string, boolean>>({});
  const [mockSubmitted, setMockSubmitted] = useState(false);
  const [mockTimeLeft, setMockTimeLeft] = useState(15 * 60); // 15 mins
  const [mockTimerActive, setMockTimerActive] = useState(false);

  // AI Generation state
  const [loadingAi, setLoadingAi] = useState(false);
  const [customTopic, setCustomTopic] = useState('');

  // Start or reset mock exam
  const startMockExam = () => {
    // Pick 8-10 questions shuffled
    const shuffled = [...CURATED_QUIZZES].sort(() => 0.5 - Math.random());
    setMockQuestions(shuffled);
    setMockIndex(0);
    setMockAnswers({});
    setMockFlags({});
    setMockSubmitted(false);
    setMockTimeLeft(15 * 60);
    setMockTimerActive(true);
    setExamMode('mock');
  };

  // Timer effect for mock exam
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mockTimerActive && mockTimeLeft > 0 && !mockSubmitted) {
      timer = setInterval(() => {
        setMockTimeLeft(prev => {
          if (prev <= 1) {
            setMockSubmitted(true);
            setMockTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mockTimerActive, mockTimeLeft, mockSubmitted]);

  // Filter drill questions by selected domain
  const filteredDrillQuestions = selectedDomain === 'domain_all'
    ? drillQuestions
    : drillQuestions.filter(q => {
        const domainObj = EXAM_SYLLABUS_DOMAINS.find(d => d.id === selectedDomain);
        return domainObj ? q.syllabusDomain?.includes(domainObj.name.split(':')[0]) : true;
      });

  const activeDrillQ = filteredDrillQuestions[drillIndex] || drillQuestions[0];

  const handleSelectDrillOption = (id: string) => {
    if (drillIsAnswered) return;
    setDrillSelectedOption(id);
  };

  const handleSubmitDrillAnswer = () => {
    if (!drillSelectedOption || drillIsAnswered) return;
    setDrillIsAnswered(true);
    setTotalAttempts(prev => prev + 1);

    const isCorrect = drillSelectedOption === activeDrillQ.correctOptionId;
    if (isCorrect) {
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }
  };

  const handleNextDrillQuestion = () => {
    setDrillSelectedOption(null);
    setDrillIsAnswered(false);
    if (drillIndex < filteredDrillQuestions.length - 1) {
      setDrillIndex(prev => prev + 1);
    } else {
      setDrillIndex(0);
    }
  };

  const handleGenerateAiQuestion = async () => {
    setLoadingAi(true);
    const domainObj = EXAM_SYLLABUS_DOMAINS.find(d => d.id === selectedDomain);
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: domainObj ? domainObj.name : 'さくらのクラウド認定試験',
          difficulty: 'intermediate',
          customTopic: customTopic || 'さくらのクラウド資格試験 頻出シナリオ',
          generateFresh: true,
        }),
      });

      const data = await res.json();
      if (data.question) {
        setDrillQuestions(prev => [data.question, ...prev]);
        setDrillIndex(0);
        setDrillSelectedOption(null);
        setDrillIsAnswered(false);
      }
    } catch (err) {
      console.error('Failed to generate AI question:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  // Mock exam calculation
  const mockCorrectCount = mockQuestions.filter(q => mockAnswers[q.id] === q.correctOptionId).length;
  const mockScorePercent = mockQuestions.length > 0 ? Math.round((mockCorrectCount / mockQuestions.length) * 100) : 0;
  const isMockPassed = mockScorePercent >= 70;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getLevelBadge = (level?: string) => {
    switch (level) {
      case 'Associate':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">アソシエイト級</span>;
      case 'Professional':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-950 text-sky-300 border border-sky-800">プロフェッショナル級</span>;
      case 'Architect':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">アーキテクト級</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">認定レベル</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Certification Syllabus & Exam Hub */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-rose-950/30 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1 rounded bg-rose-500/20 text-rose-400">
                <GraduationCap className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                さくらのクラウド 認定技術者試験対策スタジオ
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              さくらクラウド 資格試験・模擬試験＆図解特訓
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              AWSを実務で扱うエンジニア向けに、さくらのクラウド公式認定資格（アソシエイト／プロフェッショナル）のシラバスに準拠した出題・解説・イメージ図・模擬試験を提供します。
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto gap-1">
            <button
              onClick={() => setExamMode('drill')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                examMode === 'drill'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>分野別ドリル</span>
            </button>
            <button
              onClick={() => {
                if (mockQuestions.length === 0) startMockExam();
                else setExamMode('mock');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                examMode === 'mock'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>本番形式模擬試験</span>
            </button>
            <button
              onClick={() => setExamMode('cheatsheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                examMode === 'cheatsheet'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>出題急所チートシート</span>
            </button>
          </div>
        </div>

        {/* Exam Syllabus Domain Pills */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <span className="text-xs text-slate-400 block mb-2 font-medium">出題シラバス分野を選択:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {EXAM_SYLLABUS_DOMAINS.map(domain => {
              const isSelected = selectedDomain === domain.id;
              return (
                <button
                  key={domain.id}
                  onClick={() => {
                    setSelectedDomain(domain.id);
                    setDrillIndex(0);
                    setDrillSelectedOption(null);
                    setDrillIsAnswered(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-rose-950/70 text-rose-300 border-rose-600/80 font-semibold'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  <span>{domain.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. DRILL MODE */}
      {/* ======================================================== */}
      {examMode === 'drill' && (
        <div className="space-y-6">
          {/* Stats & AI generator */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Award className="w-4 h-4 text-rose-400" />
                <span>正答率:</span>
                <span className="font-bold text-slate-100 font-mono">
                  {totalAttempts > 0 ? `${Math.round((score / totalAttempts) * 100)}%` : '0%'}
                </span>
                <span className="text-slate-500">({score}/{totalAttempts})</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>連続正解:</span>
                <span className="font-bold font-mono">{streak} 問</span>
              </div>
            </div>

            {/* AI Generator Bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="AI出題テーマ (例: VPCルータVRRP、S3移行、GSLB)"
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 w-48 sm:w-64"
              />
              <button
                onClick={handleGenerateAiQuestion}
                disabled={loadingAi}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer border border-slate-700"
              >
                {loadingAi ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    <span>AI問題生成</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Question Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  第 {drillIndex + 1} 問
                </span>
                <span className="text-xs text-slate-300 font-semibold">{activeDrillQ.syllabusDomain || activeDrillQ.category}</span>
              </div>
              <div className="flex items-center gap-2">
                {getLevelBadge(activeDrillQ.examLevel)}
                <span className="text-xs text-slate-500 font-mono">
                  {drillIndex + 1} / {filteredDrillQuestions.length}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div className="py-5">
              <p className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed">
                {activeDrillQ.question}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3 pt-2">
              {activeDrillQ.options.map((opt) => {
                const isSelected = drillSelectedOption === opt.id;
                let optionStyle = 'bg-slate-950/80 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-900';

                if (isSelected) {
                  optionStyle = 'bg-rose-950/40 border-rose-500 text-rose-200 shadow-md ring-1 ring-rose-500/50';
                }

                if (drillIsAnswered) {
                  if (opt.id === activeDrillQ.correctOptionId) {
                    optionStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500 font-medium';
                  } else if (isSelected && opt.id !== activeDrillQ.correctOptionId) {
                    optionStyle = 'bg-rose-950/60 border-rose-500 text-rose-200 line-through opacity-80';
                  } else {
                    optionStyle = 'bg-slate-950/50 border-slate-900 text-slate-500 opacity-60';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectDrillOption(opt.id)}
                    disabled={drillIsAnswered}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${optionStyle}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0 transition-colors ${
                        drillIsAnswered && opt.id === activeDrillQ.correctOptionId
                          ? 'bg-emerald-500 text-slate-950'
                          : isSelected
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {opt.id}
                    </div>
                    <div className="flex-1 text-sm leading-relaxed pt-0.5">
                      {opt.text}
                    </div>
                    {drillIsAnswered && opt.id === activeDrillQ.correctOptionId && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    {drillIsAnswered && isSelected && opt.id !== activeDrillQ.correctOptionId && (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                {!drillIsAnswered ? '正解と思う選択肢をクリックして回答を確定してください' : '公式仕様と解説・構築図を確認してください'}
              </div>

              <div className="flex items-center gap-2">
                {!drillIsAnswered ? (
                  <button
                    onClick={handleSubmitDrillAnswer}
                    disabled={!drillSelectedOption}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-sm font-semibold transition shadow-lg shadow-rose-950/40 cursor-pointer"
                  >
                    回答を確定する
                  </button>
                ) : (
                  <button
                    onClick={handleNextDrillQuestion}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold transition cursor-pointer border border-slate-700"
                  >
                    <span>次の問題へ進む</span>
                    <ArrowRight className="w-4 h-4 text-rose-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Explanation with Diagram & AWS Note */}
            {drillIsAnswered && (
              <div className="mt-6 p-5 sm:p-6 rounded-xl bg-slate-950 border border-slate-800 space-y-5 animate-in fade-in duration-300">
                {/* Result banner */}
                <div className={`p-3.5 rounded-lg border flex items-center gap-3 ${
                  drillSelectedOption === activeDrillQ.correctOptionId
                    ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-600/50 text-rose-200'
                }`}>
                  {drillSelectedOption === activeDrillQ.correctOptionId ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div className="text-sm font-medium">
                        <span className="font-bold">正解です！</span> 認定試験で確実に得点できる重要知識です。
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      <div className="text-sm font-medium">
                        <span className="font-bold">不正解です。</span> 正解は <span className="font-bold underline">{activeDrillQ.correctOptionId}</span> です。公式仕様を復習しましょう。
                      </div>
                    </>
                  )}
                </div>

                {/* Explanation */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-rose-400" />
                    公式仕様と解説（試験対策ポイント）
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                    {activeDrillQ.explanation}
                  </p>
                </div>

                {/* AWS Cross note */}
                {activeDrillQ.awsMappingNote && (
                  <div className="p-4 rounded-lg bg-sky-950/30 border border-sky-800/40 space-y-1.5">
                    <div className="flex items-center gap-2 text-sky-300 font-semibold text-xs">
                      <span className="px-1.5 py-0.5 rounded bg-sky-900 border border-sky-700 text-[10px] font-mono">
                        AWS比較
                      </span>
                      <span>AWSで同等の設計を行う場合の違い（相互知識補完）</span>
                    </div>
                    <p className="text-xs text-sky-200/90 leading-relaxed">
                      {activeDrillQ.awsMappingNote}
                    </p>
                  </div>
                )}

                {/* Inline Architecture Diagram */}
                {activeDrillQ.architectureDiagram && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <Layers className="w-3.5 h-3.5 text-rose-400" />
                        構築例イメージ図（トポロジー）
                      </h4>
                      <span className="text-[11px] text-slate-400">ノードをクリックして詳細スペックを確認</span>
                    </div>
                    <ArchitectureDiagram diagram={activeDrillQ.architectureDiagram} height={320} interactive={true} />
                  </div>
                )}

                {/* Official documentation link */}
                {activeDrillQ.officialDocUrl && (
                  <div className="pt-2 flex justify-end">
                    <a
                      href={activeDrillQ.officialDocUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>公式マニュアルで仕様を確認</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MOCK EXAM MODE */}
      {/* ======================================================== */}
      {examMode === 'mock' && (
        <div className="space-y-6">
          {/* Mock Exam Top Bar */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                <FileCheck2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-100">さくらのクラウド 認定試験 模擬試験 (全{mockQuestions.length}問)</h3>
                <p className="text-xs text-slate-400">合格ライン: 70%以上 (7問以上正解で合格)</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Timer */}
              {!mockSubmitted && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-rose-400">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span>残り時間: {formatTime(mockTimeLeft)}</span>
                </div>
              )}

              {!mockSubmitted ? (
                <button
                  onClick={() => setMockSubmitted(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
                >
                  試験終了・採点する
                </button>
              ) : (
                <button
                  onClick={startMockExam}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold transition border border-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>もう一度受験する</span>
                </button>
              )}
            </div>
          </div>

          {/* If Mock submitted: Display Result Card */}
          {mockSubmitted ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
              <div className="text-center py-4 border-b border-slate-800">
                <div className={`inline-flex p-3 rounded-2xl mb-3 ${
                  isMockPassed ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}>
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-100">
                  {isMockPassed ? '合格 (PASS) おめでとうございます！' : '不合格 (FAIL) もう一歩です！'}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  得点率: <span className="font-bold text-xl text-slate-100 font-mono">{mockScorePercent}%</span> ({mockCorrectCount} / {mockQuestions.length} 問正解)
                </p>
                <p className="text-xs text-slate-400 mt-2 max-w-lg mx-auto">
                  {isMockPassed
                    ? 'さくらのクラウドの主要仕様、ネットワーク冗長化、AWSとの設計差異について十分な理解があります。'
                    : '不正解だった問題の公式仕様とイメージ図を復習し、特にVRRP冗長化や転送量課金モデルの要点を再確認しましょう。'}
                </p>
              </div>

              {/* Review All Questions */}
              <div className="space-y-4">
                <h4 className="text-base font-bold text-slate-100">模擬試験 レビューと全問解説</h4>
                {mockQuestions.map((q, idx) => {
                  const userAnswer = mockAnswers[q.id];
                  const isQCorrect = userAnswer === q.correctOptionId;

                  return (
                    <div
                      key={q.id}
                      className={`p-5 rounded-xl border space-y-3 ${
                        isQCorrect ? 'bg-slate-950/70 border-emerald-900/60' : 'bg-slate-950/70 border-rose-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            isQCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                          }`}>
                            Q{idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-300">{q.syllabusDomain || q.category}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isQCorrect ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                        }`}>
                          {isQCorrect ? '正解' : '不正解'} (あなたの回答: {userAnswer || '未回答'} / 正解: {q.correctOptionId})
                        </span>
                      </div>

                      <p className="text-sm text-slate-200">{q.question}</p>

                      <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                        <span className="font-bold text-rose-300 block">解説:</span>
                        <p>{q.explanation}</p>
                        {q.awsMappingNote && (
                          <p className="text-sky-300 pt-1">
                            <strong>AWS比較:</strong> {q.awsMappingNote}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* During Mock Exam: Question view with question nav grid */
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Question area (3 cols) */}
              <div className="lg:col-span-3 p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
                {mockQuestions[mockIndex] && (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
                          問 {mockIndex + 1} / {mockQuestions.length}
                        </span>
                        <span className="text-xs text-slate-400">{mockQuestions[mockIndex].syllabusDomain}</span>
                      </div>
                      <button
                        onClick={() => {
                          const qId = mockQuestions[mockIndex].id;
                          setMockFlags(prev => ({ ...prev, [qId]: !prev[qId] }));
                        }}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition ${
                          mockFlags[mockQuestions[mockIndex].id]
                            ? 'bg-amber-950/60 text-amber-300 border-amber-600'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>後で見直す</span>
                      </button>
                    </div>

                    <p className="text-base text-slate-100 leading-relaxed font-medium">
                      {mockQuestions[mockIndex].question}
                    </p>

                    <div className="space-y-2.5 pt-2">
                      {mockQuestions[mockIndex].options.map(opt => {
                        const isSelected = mockAnswers[mockQuestions[mockIndex].id] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => {
                              const qId = mockQuestions[mockIndex].id;
                              setMockAnswers(prev => ({ ...prev, [qId]: opt.id }));
                            }}
                            className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                              isSelected
                                ? 'bg-rose-950/40 border-rose-500 text-rose-200 shadow-sm'
                                : 'bg-slate-950/80 border-slate-800 text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center text-xs font-mono font-bold ${
                              isSelected ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {opt.id}
                            </div>
                            <div className="text-xs sm:text-sm flex-1 pt-0.5">{opt.text}</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Navigation buttons */}
                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                      <button
                        disabled={mockIndex === 0}
                        onClick={() => setMockIndex(prev => Math.max(prev - 1, 0))}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-300 transition"
                      >
                        前へ
                      </button>
                      <button
                        disabled={mockIndex === mockQuestions.length - 1}
                        onClick={() => setMockIndex(prev => Math.min(prev + 1, mockQuestions.length - 1))}
                        className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-xs font-semibold text-white transition"
                      >
                        次へ
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Question Navigation Drawer (1 col) */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 h-fit">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">問題一覧ナビ</h4>
                <div className="grid grid-cols-4 gap-2">
                  {mockQuestions.map((q, idx) => {
                    const isAnswered = !!mockAnswers[q.id];
                    const isFlagged = !!mockFlags[q.id];
                    const isCurrent = mockIndex === idx;

                    return (
                      <button
                        key={q.id}
                        onClick={() => setMockIndex(idx)}
                        className={`p-2 rounded-lg text-xs font-mono font-bold transition relative border ${
                          isCurrent
                            ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-500/30'
                            : isAnswered
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <span>{idx + 1}</span>
                        {isFlagged && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="pt-2 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-800 inline-block" />
                    <span>回答済み ({Object.keys(mockAnswers).length}/{mockQuestions.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-amber-400 inline-block" />
                    <span>見直しフラグあり</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. CHEAT SHEET MODE */}
      {/* ======================================================== */}
      {examMode === 'cheatsheet' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {EXAM_CHEATSHEETS.map((cs, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-[11px] font-mono uppercase text-rose-400 font-semibold">{cs.domain}</span>
                  <h3 className="text-base font-bold text-slate-100">{cs.title}</h3>
                </div>

                <div className="space-y-4">
                  {cs.keyPoints.map((kp, kIdx) => (
                    <div key={kIdx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">{kp.label}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                          試験頻出
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 space-y-1">
                        <div>
                          <strong className="text-rose-400 font-medium">さくら公式ルール:</strong> {kp.sakuraRule}
                        </div>
                        <div className="text-sky-300">
                          <strong className="font-medium">AWSとの違い:</strong> {kp.awsComparison}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-200 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span><strong>引っかけ注意:</strong> {kp.examTrap}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
