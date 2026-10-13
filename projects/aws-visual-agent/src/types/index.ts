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
  tier?: number; // 0: client/edge, 1: router/api, 2: app/compute, 3: bus/queue, 4: storage/db
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
  devSummary: string; // アプリ開発者向けまとめ
  mentalModelExplanation: string; // なぜこの基盤構成が必要かの直感的解説
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
