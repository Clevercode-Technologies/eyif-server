const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'eyif-data-collection');

/**
 * Escape a value for CSV: wrap in quotes if it contains comma, newline, or quote,
 * and escape internal quotes by doubling them.
 */
function escapeCsv(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Convert a JSON array of objects to CSV string.
 */
function jsonToCsv(jsonArray) {
  if (!Array.isArray(jsonArray) || jsonArray.length === 0) {
    return '';
  }

  const headers = Object.keys(jsonArray[0]);
  const headerLine = headers.map(escapeCsv).join(',');

  const rows = jsonArray.map((item) => {
    return headers.map((h) => escapeCsv(item[h])).join(',');
  });

  return [headerLine, ...rows].join('\n');
}

/**
 * Process a single JSON file: convert to CSV and delete the original.
 */
function convertFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.json') {
    console.log(`Skipping non-JSON file: ${filePath}`);
    return;
  }

  console.log(`Processing: ${filePath}`);

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      console.log(`  Skipping (not an array): ${filePath}`);
      return;
    }

    const csvContent = jsonToCsv(data);
    if (!csvContent) {
      console.log(`  Skipping (empty array): ${filePath}`);
      return;
    }

    const csvPath = filePath.replace(/\.json$/i, '.csv');
    fs.writeFileSync(csvPath, csvContent, 'utf-8');
    console.log(`  Created: ${csvPath}`);

    fs.unlinkSync(filePath);
    console.log(`  Deleted: ${filePath}`);
  } catch (err) {
    console.error(`  Error processing ${filePath}: ${err.message}`);
  }
}

/**
 * Main: process all JSON files in the data directory.
 */
function main() {
  if (!fs.existsSync(dataDir)) {
    console.error(`Directory not found: ${dataDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(dataDir).sort();
  const jsonFiles = files.filter((f) => f.toLowerCase().endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.log('No JSON files found.');
    return;
  }

  console.log(`Found ${jsonFiles.length} JSON file(s) in ${dataDir}\n`);

  for (const file of jsonFiles) {
    convertFile(path.join(dataDir, file));
  }

  console.log('\nDone.');
}

main();