
import { getCollection, disconnectFromDatabase } from './lib/db.js';

async function runTests() {
    console.log('🚀 Starting DB Optimization Verification...');
    const collectionName = 'test_optimization_' + Date.now();
    const collection = getCollection(collectionName);

    try {
        console.log(`\n1. Testing insertMany (Batch Insert)...`);
        const numDocs = 1000;
        const docs = Array.from({ length: numDocs }).map((_, i) => ({
            name: `User ${i}`,
            age: 20 + (i % 50),
            role: i % 10 === 0 ? 'admin' : 'user',
            tags: i % 2 === 0 ? ['active', 'new'] : ['inactive'],
            meta: { loginCount: i }
        }));

        const startInsert = Date.now();
        await collection.insertMany(docs);
        console.log(`✅ Inserted ${numDocs} docs in ${Date.now() - startInsert}ms`);

        // Test Find (SQL Optimized)
        console.log(`\n2. Testing find (SQL Optimized)...`);
        const startFind = Date.now();
        const admins = await collection.find({ role: 'admin' }).toArray();
        console.log(`Found ${admins.length} admins (Expected: ${numDocs / 10})`);
        if (admins.length !== numDocs / 10) throw new Error('Query count mismatch');
        if (admins[0].role !== 'admin') throw new Error('Query content mismatch');
        console.log(`✅ Find completed in ${Date.now() - startFind}ms`);

        // Test Complex Query (JSONB Operators)
        console.log(`\n3. Testing Complex Query ($gt, $in)...`);
        const startComplex = Date.now();
        const complexRes = await collection.find({
            age: { $gt: 60 },
            tags: { $in: ['active'] }
        }).toArray();
        console.log(`Found ${complexRes.length} matches`);
        console.log(`✅ Complex Query completed in ${Date.now() - startComplex}ms`);

        // Test UpdateMany
        console.log(`\n4. Testing updateMany...`);
        const startUpdate = Date.now();
        const updateRes = await collection.updateMany(
            { role: 'admin' },
            { $set: { verified: true }, $inc: { 'meta.loginCount': 1 } }
        );
        console.log(`Updated ${updateRes.modifiedCount} docs`);
        if (updateRes.modifiedCount !== numDocs / 10) throw new Error('Update count mismatch');
        console.log(`✅ updateMany completed in ${Date.now() - startUpdate}ms`);

        // Verify Update
        const admin = await collection.findOne({ role: 'admin' });
        if (!admin.verified || admin.meta.loginCount % 10 !== 1) throw new Error('Update verification failed');
        console.log('✅ Update content verified');

        // Test Count
        console.log(`\n5. Testing countDocuments (Count(*))...`);
        const startCount = Date.now();
        const count = await collection.countDocuments({ role: 'user' });
        console.log(`Counted ${count} users (Expected: ${numDocs - numDocs / 10})`);
        if (count !== numDocs - numDocs / 10) throw new Error('Count mismatch');
        console.log(`✅ Count completed in ${Date.now() - startCount}ms`);

        // Test Aggregation (SQL Optimization for $match)
        console.log(`\n6. Testing aggregate (Pipeline Optimization)...`);
        const startAgg = Date.now();
        const aggRes = await collection.aggregate([
            { $match: { role: 'admin' } },
            { $project: { name: 1, age: 1 } },
            { $limit: 5 }
        ]).toArray();
        console.log(`Aggregated ${aggRes.length} docs`);
        if (aggRes.length !== 5) throw new Error('Aggregate limit failed');
        if (aggRes[0].tags) throw new Error('Aggregate projection failed');
        console.log(`✅ Aggregate completed in ${Date.now() - startAgg}ms`);

    } catch (err) {
        console.error('❌ Test Failed:', err);
    } finally {
        console.log('\n🧹 Cleaning up...');
        await collection.deleteMany({});
        await disconnectFromDatabase();
    }
}

runTests();
