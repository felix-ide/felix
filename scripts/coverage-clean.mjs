#!/usr/bin/env node
import { mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';

const coverageDir = resolve(process.cwd(), 'coverage');

rmSync(coverageDir, { recursive: true, force: true });
mkdirSync(coverageDir, { recursive: true });
