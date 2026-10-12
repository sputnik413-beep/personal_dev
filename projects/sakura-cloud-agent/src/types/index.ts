export interface ServiceComparison {
  category: string;
  sakuraName: string;
  sakuraCode: string;
  awsName: string;
  awsCode: string;
  overview: string;
  differences: string[];
  pricingModel: string;
  officialUrl: string;
}

export interface DiagramNode {
  id: string;
  label: string;
  type: 'server' | 'elb' | 'db' | 'vpc_router' | 'switch' | 'external' | 'storage' | 'notice' | 'router';
  subText?: string;
  ip?: string;
  zone?: string;
}

export interface DiagramLink {
  from: string;
  to: string;
  label?: string;
  bidirectional?: boolean;
}

export interface ArchitectureDiagramData {
  title: string;
  nodes: DiagramNode[];
  links: DiagramLink[];
  notes?: string[];
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'architect';
  type: 'multiple-choice' | 'scenario-design' | 'troubleshooting';
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
  awsMappingNote?: string;
  officialDocUrl?: string;
  architectureDiagram?: ArchitectureDiagramData;
  examLevel?: 'Associate' | 'Professional' | 'Architect';
  syllabusDomain?: string;
}

export interface ExamCheatSheet {
  title: string;
  domain: string;
  keyPoints: {
    label: string;
    sakuraRule: string;
    awsComparison: string;
    examTrap: string;
  }[];
}

export interface ResearchPreset {
  id: string;
  title: string;
  category: string;
  tags: string[];
  summary: string;
  officialCitations: string[];
  awsComparison: {
    awsArchitecture: string;
    keyDifferences: string[];
    estimatedCostSavings: string;
  };
  architectureSpecs?: {
    zones: string[];
    components: { name: string; type: string; role: string }[];
  };
  diagram?: ArchitectureDiagramData;
}

export interface ArchitectureTranslation {
  title: string;
  summary: string;
  mappingTable: {
    awsService: string;
    sakuraService: string;
    role: string;
    considerations: string;
  }[];
  costAndPerformanceComparison: {
    trafficAdvantage: string;
    computeAdvantage: string;
    tradeOffs: string;
  };
  hybridBlueprint: {
    title: string;
    description: string;
  };
  architectureDiagram?: ArchitectureDiagramData;
  iacSnippet?: {
    tool: string;
    code: string;
  };
}
