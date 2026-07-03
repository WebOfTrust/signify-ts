import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import openapiTS, { astToString } from 'openapi-typescript';
import { isInterfaceDeclaration, isEnumDeclaration } from 'typescript';
import { parseYaml } from '@redocly/openapi-core';

const specUrl = process.env.SPEC_URL || 'http://localhost:3902/spec.yaml';
const outputFile = path.resolve('src/types/keria-api-schema.ts');

console.log(`📦 Generating types from ${specUrl}`);
const response = await fetch(specUrl);
const schema = parseYaml(await response.text());

// discriminator not required for TS unions (and causes other issues)
for (const s of Object.values(schema.components.schemas)) {
    if (s.oneOf && s.discriminator) {
        delete s.properties;
    }
}

const ast = await openapiTS(schema, {
    enum: true,
    rootTypes: false,
});

// Filter to keep components interface, enums
const content = ast.filter((s) => {
    // Keep enum declarations
    if (isEnumDeclaration(s)) {
        return true;
    }

    // Keep components interface
    if (isInterfaceDeclaration(s) && s.name.text === 'components') {
        return true;
    }

    return false;
});

const header = `// AUTO-GENERATED: Only components and enums retained from OpenAPI schema\n\n`;
await writeFile(outputFile, `${header}${astToString(content)}`);

console.log(`🚀 ${specUrl} → ${outputFile}`);
