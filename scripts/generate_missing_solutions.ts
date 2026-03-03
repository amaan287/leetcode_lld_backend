import OpenAI from 'openai';
import { connectDatabase, getDatabase, disconnectDatabase } from '../src/config/database';
import { ObjectId } from 'mongodb';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function translateToPython(questionTitle: string, existingFiles: any[], sourceLang: string) {
    console.log(`Translating ${sourceLang} to Python for: ${questionTitle}`);
    const prompt = `
    You are an expert software architect. Translate the following ${sourceLang} Low Level Design (LLD) solution into high-quality, idiomatic Python.
    
    TITLE: ${questionTitle}
    
    ${sourceLang.toUpperCase()} FILES:
    ${existingFiles.map(f => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n')}
    
    Requirements:
    1. STRICTLY follow SOLID principles and Pythonic best practices (PEP 8).
    2. Use appropriate Python features (e.g., ABC for abstract classes, @property, @staticmethod, type hints, etc.).
    3. Maintain the same logic and architectural design as the ${sourceLang} version.
    4. Provide clear docstrings.
    
    The response must be a JSON object with a "files" array. Each file object must have "name", "content", and "path" properties (using .py extension).
    
    Return ONLY the JSON.
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "You are a senior software engineer specialized in Python and architectural translation." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty response from OpenAI");
    return JSON.parse(content);
}

async function generateSolution(question: any) {
    console.log(`Generating Python from scratch for: ${question.title}`);
    const prompt = `
    You are an expert software architect. Generate a high-quality, production-grade Low Level Design (LLD) solution in Python for the following problem:
    
    TITLE: ${question.title}
    DESCRIPTION: ${question.description}
    SCENARIO: ${question.scenario}
    
    The solution should be comprehensive and follow industry best practices:
    1. STRICTLY follow SOLID principles and PEP 8.
    2. Use appropriate design patterns.
    3. Include all necessary classes and a main Demo block.
    4. Use type hints and docstrings.
    
    The response must be a JSON object with a "files" array. Each file object must have "name", "content", and "path" properties.
    Return ONLY the JSON.
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "You are a senior software engineer specialized in Python LLD." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty response from OpenAI");
    return JSON.parse(content);
}

async function start() {
    try {
        await connectDatabase();
        const db = getDatabase();

        // Find all questions with descriptions
        const qs = await db.collection("lld_questions").find({
            description: { $exists: true, $ne: "" }
        }).toArray();

        // Find existing python solutions
        const pythonSolutions = await db.collection("lld_official_solutions").find({ language: "python" }).toArray();
        const pythonSolvedIds = new Set(pythonSolutions.map(s => s.questionId.toString()));

        const missingPython = qs.filter(q => !pythonSolvedIds.has(q._id.toString()));

        console.log(`Total questions missing Python solutions: ${missingPython.length}`);

        const limit = 10;
        const toProcess = missingPython.slice(0, limit);

        console.log(`Starting processing for ${toProcess.length} questions...`);

        for (const q of toProcess) {
            try {
                // Check if any solution exists (prefer Java for translation)
                const existingSolution = await db.collection("lld_official_solutions").findOne({
                    questionId: q._id,
                    language: { $in: ["java", "typescript", "golang"] }
                }, { sort: { language: 1 } }); // Java usually alphabetically first among these

                let solutionJson;
                if (existingSolution) {
                    solutionJson = await translateToPython(q.title, existingSolution.files, existingSolution.language);
                } else {
                    solutionJson = await generateSolution(q);
                }

                if (solutionJson.files && solutionJson.files.length > 0) {
                    await db.collection("lld_official_solutions").insertOne({
                        questionId: q._id,
                        language: "python",
                        files: solutionJson.files,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    console.log(`DONE: ${q.title}`);
                } else {
                    console.log(`No files generated for: ${q.title}`);
                }
            } catch (err) {
                console.error(`Error processing ${q.title}:`, err);
            }
        }
    } catch (err) {
        console.error("Script failed:", err);
    } finally {
        await disconnectDatabase();
    }
}

start();
