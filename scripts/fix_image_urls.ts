import { connectDatabase, getDatabase, disconnectDatabase } from '../src/config/database';

async function fixImageUrls() {
    await connectDatabase();
    const db = getDatabase();
    const collection = db.collection('lld_questions');

    const questions = await collection.find({ slug: { $exists: true } }).toArray();
    const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/ashishps1/awesome-low-level-design/main';

    for (const q of questions) {
        let content = q.description;

        // Find markdown images with relative paths: ![](../path/to/img.png)
        // Match group 1 is the path
        const imageRegex = /!\[.*?\]\(\.\.\/(.*?)\)/g;

        let hasChanges = false;
        content = content.replace(imageRegex, (match, path) => {
            hasChanges = true;
            return `![](${GITHUB_RAW_BASE}/${path})`;
        });

        if (hasChanges) {
            await collection.updateOne(
                { _id: q._id },
                { $set: { description: content } }
            );
            console.log(`Updated images for: ${q.title}`);
        }
    }

    console.log('Image URL fix complete!');
    await disconnectDatabase();
}

fixImageUrls().catch(console.error);
