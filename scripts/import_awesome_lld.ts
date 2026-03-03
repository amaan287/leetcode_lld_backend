import { connectDatabase, getDatabase, disconnectDatabase } from '../src/config/database';
import type { LLDQuestion } from '../src/models/LLDQuestion';
import type { LLDOfficialSolution } from '../src/models/LLDOfficialSolution';
import { readFile, readdir, stat } from 'fs/promises';
import { join, basename, extname, resolve } from 'path';
import { ObjectId } from 'mongodb';

const REPO_PATH = resolve('./data/awesome-lld');

interface ParsedQuestion {
    title: string;
    slug: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    category: string;
    scenario: string;
    description: string;
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
    return str
        .split(/[-_ ]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

/**
 * Convert string to lowercase no hyphens
 */
function toFlatCase(str: string): string {
    return str.replace(/[-_ ]/g, '').toLowerCase();
}

/**
 * Read all files in a directory recursively
 */
async function getFilesRecursively(dir: string, baseDir: string): Promise<Array<{ name: string; content: string; path: string }>> {
    const results: Array<{ name: string; content: string; path: string }> = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = fullPath.replace(baseDir, '').replace(/^\//, '');

        if (entry.isDirectory()) {
            const subFiles = await getFilesRecursively(fullPath, baseDir);
            results.push(...subFiles);
        } else {
            // Skip binary or unwanted files
            if (entry.name.match(/\.(png|jpg|jpeg|gif|pdf|exe|dll|so|dylib)$/i)) continue;

            try {
                const content = await readFile(fullPath, 'utf-8');
                results.push({
                    name: entry.name,
                    content,
                    path: relativePath
                });
            } catch (err) {
                console.warn(`Could not read file ${fullPath}:`, err);
            }
        }
    }

    return results;
}

/**
 * Find matching solution folder for a slug in a language directory
 */
async function findSolutionFolder(langDir: string, slug: string): Promise<string | null> {
    try {
        const entries = await readdir(langDir, { withFileTypes: true });

        // Exact match (maybe with diff casing)
        const pascal = toPascalCase(slug);
        const flat = toFlatCase(slug);
        const kebab = slug.toLowerCase();

        // Check for src directory (common in Java/TS)
        let searchDir = langDir;
        try {
            const srcStats = await stat(join(langDir, 'src'));
            if (srcStats.isDirectory()) {
                searchDir = join(langDir, 'src');
            }
        } catch { }

        const searchEntries = await readdir(searchDir, { withFileTypes: true });

        for (const entry of searchEntries) {
            if (!entry.isDirectory()) continue;

            const entryName = entry.name;
            const entryFlat = toFlatCase(entryName);

            if (entryFlat === flat || entryName === pascal || entryName === kebab) {
                return join(searchDir, entryName);
            }
        }
    } catch (err) {
        // Language directory might not exist
    }
    return null;
}

async function importAwesomeLLD() {
    await connectDatabase();
    const db = getDatabase();
    const questionsColl = db.collection<LLDQuestion>('lld_questions');
    const solutionsColl = db.collection<LLDOfficialSolution>('lld_official_solutions');

    const problemsDir = join(REPO_PATH, 'problems');
    const solutionsDir = join(REPO_PATH, 'solutions');

    const problemFiles = await readdir(problemsDir);
    console.log(`Found ${problemFiles.length} problem files`);

    for (const file of problemFiles) {
        if (extname(file) !== '.md') continue;

        const slug = basename(file, '.md');
        const filePath = join(problemsDir, file);
        const content = await readFile(filePath, 'utf-8');

        // Basic parsing
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : toPascalCase(slug).replace(/([A-Z])/g, ' $1').trim();

        // Infer difficulty and category
        let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
        if (content.toLowerCase().includes('easy')) difficulty = 'Easy';
        if (content.toLowerCase().includes('hard')) difficulty = 'Hard';

        let category = 'System Design';
        if (content.toLowerCase().includes('parking')) category = 'Transport';
        if (content.toLowerCase().includes('game')) category = 'Games';
        if (content.toLowerCase().includes('booking')) category = 'Booking Systems';

        const questionData: LLDQuestion = {
            title,
            slug,
            scenario: content.split('\n\n').slice(0, 3).join('\n\n'), // Use first few paragraphs as scenario
            description: content, // Full MD as description
            difficulty,
            category,
            createdAt: new Date()
        };

        // Upsert Question
        const existingQuestion = await questionsColl.findOne({ slug });
        let questionId: ObjectId;

        if (existingQuestion) {
            await questionsColl.updateOne({ _id: existingQuestion._id }, { $set: questionData });
            questionId = existingQuestion._id!;
            console.log(`Updated question: ${title}`);
        } else {
            const result = await questionsColl.insertOne(questionData);
            questionId = result.insertedId;
            console.log(`Inserted question: ${title}`);
        }

        // Process Solutions
        const languages = ['typescript', 'python', 'java', 'cpp', 'csharp', 'golang'];
        for (const lang of languages) {
            const langDir = join(solutionsDir, lang);
            const folderPath = await findSolutionFolder(langDir, slug);

            if (folderPath) {
                console.log(`  Found ${lang} solution for ${slug} at ${folderPath}`);
                const files = await getFilesRecursively(folderPath, folderPath);

                const mainFile = files.find(f =>
                    f.name.toLowerCase().includes('main') ||
                    f.name.toLowerCase().includes('runner') ||
                    f.name.toLowerCase().includes('parkinglot') || // heuristic
                    f.name.toLowerCase().includes(toFlatCase(slug))
                ) || files[0];

                const solutionData: LLDOfficialSolution = {
                    questionId,
                    language: lang,
                    content: mainFile ? mainFile.content : 'See files for details',
                    files,
                    createdAt: new Date()
                };

                // Upsert Solution
                await solutionsColl.updateOne(
                    { questionId, language: lang },
                    { $set: solutionData },
                    { upsert: true }
                );
            }
        }
    }

    console.log('Import finished!');
    await disconnectDatabase();
}

importAwesomeLLD().catch(err => {
    console.error(err);
    process.exit(1);
});
