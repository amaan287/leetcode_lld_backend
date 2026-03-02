import { connectDatabase, getDatabase, disconnectDatabase } from './src/config/database';

async function listQuestions() {
    await connectDatabase();
    const db = getDatabase();
    const questions = await db.collection('lld_questions').find({}).toArray();
    console.log(JSON.stringify(questions, null, 2));
    await disconnectDatabase();
}

listQuestions();
