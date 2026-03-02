import OpenAI from 'openai';
import { connectDatabase, getDatabase, disconnectDatabase } from '../src/config/database';
import { ObjectId } from 'mongodb';
import { ENV } from '../src/config/env';

const openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

async function enrichDSAProblems() {
    try {
        await connectDatabase();
        const db = getDatabase();
        const collection = db.collection('dsa_problems');

        // Process in batches for better stability, but loop until everything is done
        const batchSize = 50;

        while (true) {
            // Find problems that don't have descriptions yet
            const problems = await collection.find({
                $or: [
                    { description: { $exists: false } },
                    { description: '' },
                    { examples: { $exists: false } }
                ]
            }).limit(batchSize).toArray();

            if (problems.length === 0) {
                console.log('No more problems to enrich. DSA enrichment complete!');
                break;
            }

            console.log(`Processing next batch of ${problems.length} DSA problems...`);

            for (const p of problems) {
                console.log(`Enriching DSA problem: ${p.title} (${p.titleSlug})...`);

                const prompt = `You are a technical content creator for an algorithmic coding platform.
Expand the following DSA problem title into a full problem statement, similar to LeetCode format.

Title: ${p.title}

Please provide:
1. "description": A clear problem statement explaining the goal and context.
2. "examples": An array of objects, each containing:
   - "input": A sample input.
   - "output": The corresponding expected output.
   - "explanation": (Optional) A brief explanation of the result.
3. "constraints": An array of constraints (e.g., "1 <= nums.length <= 10^4", "0 <= nums[i] <= 100").
4. "difficulty": Ensure it is correct ("Easy", "Medium", "Hard") based on your expert opinion.

Format your response STRICTLY as a JSON object:
{
  "description": "...",
  "examples": [
    { "input": "...", "output": "...", "explanation": "..." }
  ],
  "constraints": ["...", "..."],
  "difficulty": "..."
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
                        { _id: p._id },
                        {
                            $set: {
                                description: enriched.description,
                                examples: enriched.examples,
                                constraints: enriched.constraints,
                                difficulty: enriched.difficulty,
                                updatedAt: new Date()
                            }
                        }
                    );
                    console.log(`Successfully enriched: ${p.title}`);
                } catch (err: any) {
                    console.error(`Failed to enrich dsa problem ${p.title}:`, err.message);
                    if (err.status === 429) {
                        console.log('Rate limit hit, waiting 30 seconds...');
                        await new Promise(resolve => setTimeout(resolve, 30000));
                    }
                }
            }

            console.log(`Batch of ${problems.length} completed. Continuing to next batch...`);
        }

        console.log('Full DSA enrichment process finished successfully!');
    } catch (error) {
        console.error('DSA Enrichment process failed:', error);
    } finally {
        await disconnectDatabase();
    }
}

enrichDSAProblems();
