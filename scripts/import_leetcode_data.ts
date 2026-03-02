import { connectDatabase, getDatabase, disconnectDatabase } from '../src/config/database';
import fs from 'fs';
import path from 'path';

interface LeetCodeJsonProblem {
    title: string;
    frontend_id: string;
    difficulty: string;
    problem_slug: string;
    description: string;
    examples: Array<{
        example_num: number;
        example_text: string;
        images?: string[];
    }>;
    constraints: string[];
}

function parseExampleText(text: string) {
    // Regex for Input, Output, Explanation
    // Handle cases where Output might be the last line
    const inputMatch = text.match(/Input:\s*([\s\S]*?)(?=Output:|$)/i);
    const outputMatch = text.match(/Output:\s*([\s\S]*?)(?=Explanation:|$)/i);
    const explanationMatch = text.match(/Explanation:\s*([\s\S]*?)$/i);

    return {
        input: inputMatch ? inputMatch[1].trim() : '',
        output: outputMatch ? outputMatch[1].trim() : '',
        explanation: explanationMatch ? explanationMatch[1].trim() : undefined
    };
}

async function importLeetCodeData() {
    try {
        const filePath = path.join(__dirname, '../data/leetcode_data.json');
        if (!fs.existsSync(filePath)) {
            console.error('Data file not found at:', filePath);
            return;
        }

        console.log('Reading data file...');
        const rawData = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(rawData);
        const problems: LeetCodeJsonProblem[] = data.questions;
        console.log(`Loaded ${problems.length} problems from JSON.`);

        await connectDatabase();
        const db = getDatabase();
        const collection = db.collection('dsa_problems');

        let updatedCount = 0;
        let batchSize = 100;

        console.log('Starting database update...');

        for (let i = 0; i < problems.length; i++) {
            const p = problems[i];

            // Map the JSON structure to our DB structure
            const formattedExamples = p.examples.map(ex => {
                const parsed = parseExampleText(ex.example_text);
                return {
                    input: parsed.input,
                    output: parsed.output,
                    explanation: parsed.explanation
                };
            });

            // We use frontend_id as the key
            const result = await collection.updateOne(
                { frontendQuestionId: p.frontend_id.toString() },
                {
                    $set: {
                        description: p.description,
                        examples: formattedExamples,
                        constraints: p.constraints,
                        updatedAt: new Date()
                    }
                }
            );

            if (result.modifiedCount > 0) {
                updatedCount++;
            }

            if ((i + 1) % batchSize === 0) {
                console.log(`Processed ${i + 1}/${problems.length} problems. Updated ${updatedCount} so far.`);
            }
        }

        console.log(`\n--- Import Complete ---`);
        console.log(`Total Problems Processed: ${problems.length}`);
        console.log(`Database Documents Updated: ${updatedCount}`);
        console.log(`------------------------\n`);

    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        await disconnectDatabase();
    }
}

importLeetCodeData();
