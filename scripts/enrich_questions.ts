import OpenAI from 'openai';
import { connectDatabase, getDatabase, disconnectDatabase } from '../src/config/database';
import { ObjectId } from 'mongodb';
import { ENV } from '../src/config/env';

const openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

async function enrichQuestions() {
    try {
        await connectDatabase();
        const db = getDatabase();
        const collection = db.collection('lld_questions');

        const questions = await collection.find({}).toArray();
        console.log(`Found ${questions.length} questions to enrich.`);

        for (const q of questions) {
            console.log(`Enriching: ${q.title}...`);

            const prompt = `You are an expert LLD interviewer. I have an LLD question that is currently poorly detailed. 
Please expand it into a professional, detailed machine coding round question suitable for platforms like LeetCode or a real technical interview.

Current Data:
Title: ${q.title}
Current Description: ${q.description}
Current Scenario: ${q.scenario}

Please provide:
1. A detailed "description" (2-3 paragraphs explaining the context and the problem).
2. A comprehensive "scenario" (detailed requirements, specific use cases, system constraints like thread safety or scalability, and 2-3 bonus/advanced features).
3. Suggested "difficulty" (MUST be one of: "Easy", "Medium", "Hard").
4. Appropriate "category" (e.g., "System Design", "E-commerce", "Transportation", "Utilities", etc.).

Format your response STRICTLY as a JSON object:
{
  "description": "...",
  "scenario": "...",
  "difficulty": "...",
  "category": "..."
}`;

            try {
                const response = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                });

                const content = response.choices[0]?.message?.content;
                if (!content) continue;

                const enriched = JSON.parse(content);

                await collection.updateOne(
                    { _id: q._id },
                    {
                        $set: {
                            description: enriched.description,
                            scenario: enriched.scenario,
                            difficulty: enriched.difficulty,
                            category: enriched.category,
                            updatedAt: new Date()
                        }
                    }
                );
                console.log(`Successfully enriched: ${q.title}`);
            } catch (err) {
                console.error(`Failed to enrich ${q.title}:`, err);
            }
        }

        console.log('All questions enriched successfully!');
    } catch (error) {
        console.error('Enrichment process failed:', error);
    } finally {
        await disconnectDatabase();
    }
}

enrichQuestions();
