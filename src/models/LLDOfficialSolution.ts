import { ObjectId } from 'mongodb';

export interface LLDOfficialSolution {
    _id?: ObjectId;
    questionId: ObjectId;
    language: string; // 'java', 'typescript', 'python', 'cpp', etc.
    content: string; // Primary solution code or overview
    files: Array<{
        name: string;
        content: string;
        path: string;
    }>;
    explanation?: string;
    createdAt: Date;
}
