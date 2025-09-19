import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const specUrl = process.env.SPEC_URL || 'http://localhost:3902/spec.yaml';
const outputFile = path.resolve('src/types/keria-api-schema.ts');

console.log(`📦 Generating types from ${specUrl}`);
execSync(`npx openapi-typescript "${specUrl}" --output ${outputFile}`, {
    stdio: 'inherit',
});

// Read the full file
const fullContent = fs.readFileSync(outputFile, 'utf8');

// Extract only the `export interface components { ... }` block
const match = fullContent.match(/export interface components \{[\s\S]+?\n\}/);

if (!match) {
    console.error("❌ Could not find 'export interface components' block.");
    process.exit(1);
}

// Add comment header
const cleaned = `// AUTO-GENERATED: Only components retained from OpenAPI schema\n\n${match[0]}\n`;

fs.writeFileSync(outputFile, cleaned, 'utf8');
