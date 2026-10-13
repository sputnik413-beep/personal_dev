import React, { useState } from 'react';
import { Header, AwsTabType } from './components/Header';
import { AiConsultant } from './components/AiConsultant';
import { MentalModelsGallery } from './components/MentalModelsGallery';
import { InfraPitfallsStudio } from './components/InfraPitfallsStudio';

export default function App() {
  const [activeTab, setActiveTab] = useState<AwsTabType>('consult');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'consult' && <AiConsultant />}
        {activeTab === 'models' && <MentalModelsGallery />}
        {activeTab === 'pitfalls' && <InfraPitfallsStudio />}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">AWS 実装イメージ・アーキテクチャ視覚支援エージェント</span>
            <span>•</span>
            <span>アプリ開発者のための基盤メンタルモデル ✕ 動的トポロジー</span>
          </div>
          <div className="text-slate-400">
            Step Functions / Lambda / EventBridge / S3 / CloudFront / OpenSearch / FSx ONTAP / SQS
          </div>
        </div>
      </footer>
    </div>
  );
}
