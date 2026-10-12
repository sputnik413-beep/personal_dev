import React, { useState } from 'react';
import { Header, TabType } from './components/Header';
import { ResearchAgent } from './components/ResearchAgent';
import { QuizStudio } from './components/QuizStudio';
import { AwsCrossComparator } from './components/AwsCrossComparator';
import { ArchitectureViewer } from './components/ArchitectureViewer';
import { ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('research');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Global Header */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'research' && <ResearchAgent />}
        {activeTab === 'quiz' && <QuizStudio />}
        {activeTab === 'aws_cross' && <AwsCrossComparator />}
        {activeTab === 'architecture' && <ArchitectureViewer />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">さくらクラウド 調査・学習サポートエージェント</span>
            <span>•</span>
            <span>さくらインターネット公式仕様 ＆ AWS相互補完ナレッジベース</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="https://cloud.sakura.ad.jp/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-rose-400 transition flex items-center gap-1"
            >
              <span>さくらのクラウド 公式サイト</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://manual.sakura.ad.jp/cloud/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-rose-400 transition flex items-center gap-1"
            >
              <span>公式マニュアル</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
