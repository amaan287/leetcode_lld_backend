import { connectDatabase, getDatabase, disconnectDatabase } from '../src/config/database';

async function countRemainingProblems() {
    try {
        await connectDatabase();
        const db = getDatabase();
        const collection = db.collection('dsa_problems');

        const total = await collection.countDocuments();

        const remaining = await collection.countDocuments({
            $or: [
                { description: { $exists: false } },
                { description: '' },
                { examples: { $exists: false } }
            ]
        });

        const enriched = total - remaining;
        const percentage = ((enriched / total) * 100).toFixed(2);

        console.log(`\n--- DSA Problem Statistics ---`);
        console.log(`Total Problems: ${total}`);
        console.log(`Already Enriched: ${enriched} (${percentage}%)`);
        console.log(`Remaining to Enrich: ${remaining}`);
        console.log(`------------------------------\n`);

    } catch (error) {
        console.error('Failed to count problems:', error);
    } finally {
        await disconnectDatabase();
    }
}

countRemainingProblems();
