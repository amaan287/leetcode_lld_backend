import { ObjectId } from 'mongodb';

export interface DSASolution {
    _id?: ObjectId;
    userId: ObjectId;
    problemId: ObjectId;
    solution: string;
    language: string;
    rating?: number;
    feedback?: string;
    submittedAt: Date;
}
