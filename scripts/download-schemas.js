#!/usr/bin/env node

/**
 * Script to download all MongoDB collections as JSON files.
 * 
 * Discovers all collections in the database dynamically and downloads
 * each one as a JSON file named after the collection.
 * 
 * Usage: node scripts/download-schemas.js
 * 
 * Output:
 *   - ./eyif-data-collection/  (in project root)
 *   - ~/Downloads/eyif-data-collection/  (in user Downloads folder)
 * 
 * Each file is named exactly after its MongoDB collection name.
 * e.g. contacts.json, contacts_2026.json, buildtrackapplications.json, etc.
 */

const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Load environment variables from project root .env
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Output directories
const PROJECT_OUTPUT_DIR = path.join(__dirname, "..", "eyif-data-collection");
const DOWNLOADS_OUTPUT_DIR = path.join(
  require("os").homedir(),
  "Downloads",
  "eyif-data-collection"
);

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  Created directory: ${dir}`);
  }
}

function cleanRecord(record) {
  const cleaned = {};
  for (const [key, value] of Object.entries(record)) {
    if (value instanceof mongoose.Types.ObjectId) {
      cleaned[key] = value.toString();
    } else if (value instanceof Date) {
      cleaned[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map((item) =>
        item instanceof mongoose.Types.ObjectId ? item.toString() : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

async function downloadCollection(collectionName) {
  try {
    console.log(`\n  Fetching collection: ${collectionName}...`);
    const collection = mongoose.connection.db.collection(collectionName);
    const data = await collection.find({}).sort({ createdAt: -1 }).toArray();
    console.log(`  Found ${data.length} records`);

    const cleanedData = data.map(cleanRecord);
    const jsonContent = JSON.stringify(cleanedData, null, 2);
    const filename = `${collectionName}.json`;

    // Save to project directory
    const projectPath = path.join(PROJECT_OUTPUT_DIR, filename);
    fs.writeFileSync(projectPath, jsonContent, "utf-8");
    console.log(`  ✓ Saved: ${projectPath}`);

    // Save to Downloads directory
    const downloadsPath = path.join(DOWNLOADS_OUTPUT_DIR, filename);
    fs.writeFileSync(downloadsPath, jsonContent, "utf-8");
    console.log(`  ✓ Saved: ${downloadsPath}`);

    return { name: collectionName, count: data.length };
  } catch (error) {
    console.error(`  ✗ Error downloading ${collectionName}: ${error.message}`);
    return { name: collectionName, count: 0, error: error.message };
  }
}

async function main() {
  console.log("===========================================");
  console.log("  MongoDB All Collections Downloader");
  console.log("===========================================\n");

  // Check for MongoDB URI
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("ERROR: MONGODB_URI not found in environment variables.");
    console.error("Make sure you have a .env file in the project root with MONGODB_URI set.");
    process.exit(1);
  }

  // Ensure output directories exist
  console.log("Setting up output directories...");
  ensureDirectory(PROJECT_OUTPUT_DIR);
  ensureDirectory(DOWNLOADS_OUTPUT_DIR);
  console.log("  Done.\n");

  // Connect to MongoDB
  console.log("Connecting to MongoDB...");
  try {
    await mongoose.connect(mongoUri);
    console.log("  Connected successfully.\n");
  } catch (error) {
    console.error(`  Failed to connect: ${error.message}`);
    process.exit(1);
  }

  // Discover all collections in the database
  console.log("Discovering collections...");
  const collections = await mongoose.connection.db.listCollections().toArray();
  const collectionNames = collections
    .map((c) => c.name)
    .filter((name) => !name.startsWith("system."))
    .sort();

  if (collectionNames.length === 0) {
    console.log("  No collections found in the database.");
    await mongoose.disconnect();
    return;
  }

  console.log(`  Found ${collectionNames.length} collections:`);
  collectionNames.forEach((name) => console.log(`    - ${name}`));
  console.log();

  // Download each collection
  console.log("Downloading collections...");
  const results = [];
  for (const collectionName of collectionNames) {
    const result = await downloadCollection(collectionName);
    results.push(result);
  }

  // Generate summary
  console.log("\n===========================================");
  console.log("  Download Summary");
  console.log("===========================================");
  let totalRecords = 0;
  let successCount = 0;
  let failCount = 0;
  for (const result of results) {
    if (result.error) {
      console.log(`  ✗ ${result.name}: FAILED (${result.error})`);
      failCount++;
    } else {
      console.log(`  ✓ ${result.name}: ${result.count} records`);
      totalRecords += result.count;
      successCount++;
    }
  }
  console.log("-------------------------------------------");
  console.log(`  Total collections: ${results.length}`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`  Total records downloaded: ${totalRecords}`);
  console.log("-------------------------------------------");
  console.log(`  Project output: ${PROJECT_OUTPUT_DIR}`);
  console.log(`  Downloads output: ${DOWNLOADS_OUTPUT_DIR}`);
  console.log("===========================================\n");

  // Disconnect from MongoDB
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB. Done!");
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});