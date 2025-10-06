#!/usr/bin/env node

/**
 * Download ONNX models for GPU-accelerated embedding generation
 */

import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modelsDir = join(__dirname, '..', 'models');

const models = [
  {
    name: 'all-MiniLM-L6-v2',
    files: [
      {
        url: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx',
        filename: 'all-MiniLM-L6-v2.onnx'
      },
      {
        url: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/tokenizer.json',
        filename: 'all-MiniLM-L6-v2-tokenizer.json'
      },
      {
        url: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/tokenizer_config.json',
        filename: 'all-MiniLM-L6-v2-tokenizer_config.json'
      }
    ]
  }
];

async function downloadFile(url, filepath) {
  console.log(`📥 Downloading: ${url}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    await pipeline(response.body, createWriteStream(filepath));
    console.log(`✅ Downloaded: ${filepath}`);
  } catch (error) {
    console.error(`❌ Failed to download ${url}:`, error.message);
    throw error;
  }
}

async function downloadModels() {
  // Create models directory if it doesn't exist
  if (!existsSync(modelsDir)) {
    mkdirSync(modelsDir, { recursive: true });
    console.log(`📁 Created models directory: ${modelsDir}`);
  }

  console.log('🧠 Downloading ONNX models for GPU acceleration...');
  
  for (const model of models) {
    console.log(`\n📦 Downloading model: ${model.name}`);
    
    for (const file of model.files) {
      const filepath = join(modelsDir, file.filename);
      
      // Skip if file already exists
      if (existsSync(filepath)) {
        console.log(`⏭️  Skipping existing file: ${file.filename}`);
        continue;
      }
      
      await downloadFile(file.url, filepath);
    }
  }
  
  console.log('\n✅ All models downloaded successfully!');
  console.log('🚀 GPU acceleration ready!');
}

async function main() {
  try {
    await downloadModels();
  } catch (error) {
    console.error('\n❌ Model download failed:', error.message);
    console.error('⚠️  Falling back to CPU-only mode');
    // Don't exit with error - allow installation to continue
    process.exit(0);
  }
}

main();