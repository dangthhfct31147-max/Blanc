
import { connectToDatabase, getCollection, disconnectFromDatabase } from './lib/db.js';
import { ObjectId } from './lib/objectId.js';

async function runBenchmark() {
  console.log('🚀 Starting DB Benchmark...');
  console.time('Total Time');

  await connectToDatabase();
  const testColl = getCollection('benchmark_test');

  // Cleanup
  await testColl.deleteMany({});

  // 1. Insert Data
  console.log('\n📝 inserting 1000 docs...');
  const docs = [];
  for (let i = 0; i < 1000; i++) {
    docs.push({
      index: i,
      category: i % 5 === 0 ? 'A' : 'B',
      tags: i % 2 === 0 ? ['even', 'num'] : ['odd', 'num'],
      meta: {
        active: i % 10 !== 0,
        score: Math.floor(Math.random() * 100)
      }
    });
  }
  const startInsert = Date.now();
  await testColl.insertMany(docs);
  console.log(`   Insert took: ${Date.now() - startInsert}ms`);

  // 2. Simple Find
  console.log('\n🔍 Simple Find (category="A")...');
  const startFind = Date.now();
  const catA = await testColl.find({ category: 'A' }).toArray();
  console.log(`   Found ${catA.length} docs. Took: ${Date.now() - startFind}ms`);

  // 3. Complex Find (Nested + Array + Comparison)
  console.log('\n🔍 Complex Find (active=true, score > 50, tags contains "even")...');
  const startComplex = Date.now();
  const complex = await testColl.find({
    'meta.active': true,
    'meta.score': { $gt: 50 },
    tags: 'even'
  }).toArray();
  console.log(`   Found ${complex.length} docs. Took: ${Date.now() - startComplex}ms`);

  // 4. Update
  console.log('\n✏️ Update Many (set newField="updated" for category="B")...');
  const startUpdate = Date.now();
  const updateRes = await testColl.updateMany(
    { category: 'B' },
    { $set: { newField: 'updated' } }
  );
  console.log(`   Modified ${updateRes.modifiedCount} docs. Took: ${Date.now() - startUpdate}ms`);

  // 5. Count
  console.log('\n🔢 Count (newField="updated")...');
  const startCount = Date.now();
  const count = await testColl.countDocuments({ newField: 'updated' });
  console.log(`   Count: ${count}. Took: ${Date.now() - startCount}ms`);

  // Cleanup
  // await testColl.deleteMany({});
  await disconnectFromDatabase();
  console.timeEnd('Total Time');
}

runBenchmark().catch(console.error);
