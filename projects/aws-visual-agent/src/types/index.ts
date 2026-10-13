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

// ----------------------------------------------------
// AWS Visual Architecture Agent Types
// ----------------------------------------------------
export type AwsNodeType =
  | 'lambda'
  | 'stepfunctions'
  | 'eventbridge'
  | 's3'
  | 'cloudfront'
  | 'opensearch'
  | 'fsx_ontap'
  | 'sqs'
  | 'vpc'
  | 'subnet_public'
  | 'subnet_private'
  | 'nat_gw'
  | 'igw'
  | 'client'
  | 'iam_role'
  | 'vpc_endpoint';

export interface AwsDiagramNode {
  id: string;
  label: string;
  type: AwsNodeType;
  subText?: string;
  tier?: number;
  vpcPlacement?: 'inside_vpc_private' | 'inside_vpc_public' | 'outside_vpc' | 'edge';
  port?: string;
  securityGroup?: string;
}

export interface AwsDiagramLink {
  from: string;
  to: string;
  label?: string;
  protocol?: string;
  linkType?: 'sync' | 'async' | 'event' | 'storage' | 'auth' | 'network';
  highlighted?: boolean;
}

export interface PacketFlowStep {
  step: number;
  title: string;
  description: string;
  from: string;
  to: string;
  protocol?: string;
}

export interface AwsArchitectureDiagram {
  title: string;
  description?: string;
  nodes: AwsDiagramNode[];
  links: AwsDiagramLink[];
  packetFlowSteps?: PacketFlowStep[];
  notes?: string[];
}

export interface InfraKeyPoint {
  category: string;
  title: string;
  explanation: string;
  pitfall?: string;
  configExample?: string;
}

export interface AwsConsultationResponse {
  title: string;
  targetServices: string[];
  devSummary: string;
  mentalModelExplanation: string;
  diagram: AwsArchitectureDiagram;
  packetFlow: PacketFlowStep[];
  infraKeyPoints: InfraKeyPoint[];
  codeSnippet?: {
    language: string;
    title: string;
    code: string;
  };
}

export interface MentalModelTopic {
  id: string;
  title: string;
  service: string;
  tag: string;
  coreQuestion: string;
  summary: string;
  diagram: AwsArchitectureDiagram;
  whyThisWay: string[];
  commonPitfall: string;
  solutionCode?: {
    tool: string;
    code: string;
  };
}

export interface ConsultationTurn {
  id: string;
  question: string;
  timestamp: string;
  response: AwsConsultationResponse;
}
