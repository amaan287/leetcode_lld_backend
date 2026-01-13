import { ObjectId } from 'mongodb';

export interface DSAProblem {
  _id?: ObjectId;
  frontendQuestionId: string;
  acRate?: number;
  createdAt?: Date;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  freqBar?: number | null;
  hasSolution?: boolean;
  hasVideoSolution?: boolean;
  isFavor?: boolean;
  paidOnly?: boolean;
  status?: string;
  title: string;
  titleSlug: string;
  topicTags?: Array<{ name?: string; slug?: string; [key: string]: any }>;
  updatedAt?: Date;
  title_embeddings_OAI?: number[];
}

