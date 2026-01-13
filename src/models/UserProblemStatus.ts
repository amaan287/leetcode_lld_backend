import { ObjectId } from 'mongodb';

export interface UserProblemStatus {
  _id?: ObjectId;
  userId: ObjectId;
  problemId: ObjectId;
  listId: ObjectId;
  isCompleted: boolean;
  checkedAt?: Date;
}

