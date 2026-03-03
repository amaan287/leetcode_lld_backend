import { connectDatabase, getDatabase, disconnectDatabase } from '../src/config/database';

async function sanitizeLLDQuestions() {
    await connectDatabase();
    const db = getDatabase();
    const collection = db.collection('lld_questions');

    const questions = await collection.find({ slug: { $exists: true } }).toArray();
    const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/ashishps1/awesome-low-level-design/main';

    for (const q of questions) {
        let content = q.description;

        // 1. Fix image URLs first
        const imageRegex = /!\[.*?\]\(\.\.\/(.*?)\)/g;
        content = content.replace(imageRegex, (match, path) => {
            return `![](${GITHUB_RAW_BASE}/${path})`;
        });

        // 2. Remove the main title (e.g., "# Designing a Vending Machine")
        content = content.replace(/^#\s+.+$/m, '').trim();

        // 3. Remove "Implementations" or "Solutions" sections
        const implementationPatterns = [
            /##\s*Implementations[\s\S]*$/i,
            /##\s*Solutions[\s\S]*$/i,
            /###\s*Java Implementation[\s\S]*$/i,
            /###\s*Python Implementation[\s\S]*$/i
        ];
        for (const pattern of implementationPatterns) {
            content = content.replace(pattern, '').trim();
        }

        // 4. Remove relative links that are NOT images (i.e. [Up](../README.md))
        content = content.split('\n')
            .filter(line => {
                // If the line has a link but no "!", it is probably a text link
                if (line.includes('](../') && !line.includes('![')) {
                    return false;
                }
                return true;
            })
            .join('\n')
            .trim();

        // 5. Clean up consecutive blank lines
        content = content.replace(/\n{3,}/g, '\n\n');

        // 6. Sanitize scenario
        let scenario = q.scenario;
        scenario = scenario.replace(/^#\s+.+$/m, '').trim();
        if (scenario.includes('## Requirements')) {
            const parts = scenario.split('## Requirements');
            if (parts[0].trim()) {
                scenario = parts[0].trim();
            }
        }

        await collection.updateOne(
            { _id: q._id },
            {
                $set: {
                    description: content,
                    scenario: scenario || q.title,
                    updatedAt: new Date()
                }
            }
        );

        console.log(`Sanitized: ${q.title}`);
    }

    console.log('Sanitization complete!');
    await disconnectDatabase();
}

sanitizeLLDQuestions().catch(console.error);
