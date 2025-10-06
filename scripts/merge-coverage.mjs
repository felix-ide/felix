#!/usr/bin/env node
import covPkg from 'istanbul-lib-coverage';
import repLib from 'istanbul-lib-report';
import reports from 'istanbul-reports';
import { glob } from 'glob';
import fs from 'fs';
import path from 'path';

async function main() {
  const patterns = [
    'apps/**/coverage*/coverage-final.json',
    'packages/**/coverage*/coverage-final.json',
  ];
  const files = (
    await Promise.all(patterns.map((p) => glob(p, { absolute: true })))
  ).flat();

  if (files.length === 0) {
    console.error('No coverage-final.json files found. Did you run coverage in each workspace?');
    process.exit(1);
  }

  const { createCoverageMap } = covPkg;
  const { createContext } = repLib;
  const map = createCoverageMap({});
  for (const f of files) {
    try {
      const json = JSON.parse(fs.readFileSync(f, 'utf8'));
      map.merge(json);
      console.log(`✓ merged ${path.relative(process.cwd(), f)}`);
    } catch (e) {
      console.warn(`⚠️  skipped ${f}: ${e.message}`);
    }
  }

  const outDir = path.resolve('coverage/combined');
  fs.mkdirSync(outDir, { recursive: true });

  const context = createContext({ dir: outDir, coverageMap: map });
  // Reports: html, text-summary, and lcov for CI/codecov
  reports.create('html').execute(context);
  reports.create('text-summary').execute(context);
  reports.create('lcovonly', { file: 'lcov.info' }).execute(context);

  console.log(`\nCombined coverage written to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
