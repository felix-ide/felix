/**
 * EmbeddingService - Adaptive embedding generation with WebGPU → Optimized CPU → Basic CPU fallback
 * 
 * Hierarchy: WebGPU (fastest) → Optimized CPU (multi-threaded + SIMD) → Basic CPU (compatibility)
 */

import type { Searchable, EmbeddingResult, EmbeddingServiceOptions, TextConverter } from './types.js';

// Re-export types for convenience
export type { EmbeddingServiceOptions, EmbeddingResult } from './types.js';

/**
 * Abstract base for embedding adapters
 */
abstract class EmbeddingAdapter {
  protected modelName: string;
  protected maxTextLength: number;

  constructor(modelName: string, maxTextLength: number) {
    this.modelName = modelName;
    this.maxTextLength = maxTextLength;
  }

  abstract initialize(): Promise<void>;
  abstract getEmbedding(text: string): Promise<EmbeddingResult>;
  abstract close(): Promise<void>;
  abstract getAdapterName(): string;
}

/**
 * WebGPU adapter for GPU acceleration using Dawn WebGPU
 */
class WebGPUAdapter extends EmbeddingAdapter {
  private model: any = null;
  private modelLoaded: boolean = false;
  private gpuDevice: any = null;

  async initialize(): Promise<void> {
    if (this.modelLoaded) return;

    try {
      // Import webgpu for Node.js with timeout
      const webgpu = await Promise.race([
        // @ts-ignore - optional dependency
        import('webgpu'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('WebGPU import timeout')), 5000)
        )
      ]) as any;
      
      const { create, globals } = webgpu;
      
      // Set up WebGPU globals - need all WebGPU constants like GPUBufferUsage
      Object.assign(globalThis, globals);
      
      const gpu = create([]);
      
      // Request adapter with timeout
      const adapter = await Promise.race([
        gpu.requestAdapter(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('WebGPU adapter request timeout')), 3000)
        )
      ]) as any;
      
      if (!adapter) {
        throw new Error('No WebGPU adapter available');
      }
      
      // Log basic adapter info safely
      console.error('🎮 WebGPU adapter found');
      try {
        console.error(`   Features: ${adapter.features ? Array.from(adapter.features).join(', ') : 'Unknown'}`);
        console.error(`   Limits available: ${adapter.limits ? 'Yes' : 'No'}`);
      } catch {
        console.error('   Could not read adapter details');
      }
      
      // Request device with timeout
      this.gpuDevice = await Promise.race([
        adapter.requestDevice(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('WebGPU device request timeout')), 3000)
        )
      ]) as any;
      
      console.error('✅ WebGPU device initialized');
      
      // Test WebGPU functionality with timeout and proper error handling
      await Promise.race([
        this.testWebGPUCapability(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('WebGPU capability test timeout')), 5000)
        )
      ]);

      const { pipeline, env } = await import('@xenova/transformers');

      // Configure Transformers.js for WebGPU
      env.backends.onnx.wasm.proxy = false;
      
      console.error(`🚀 Loading WebGPU Transformers.js model: ${this.modelName}`);
      const startTime = Date.now();

      // Load model with timeout
      this.model = await Promise.race([
        pipeline('feature-extraction', this.modelName, {
          quantized: false // Use full precision for GPU
        } as any),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Model loading timeout')), 30000)
        )
      ]) as any;

      const loadTime = Date.now() - startTime;
      console.error(`✅ WebGPU model loaded in ${loadTime}ms`);
      console.error('💡 To verify GPU usage:');
      console.error('   - Mac: Run "sudo powermetrics --samplers gpu_power -n 1 -i 1000" in another terminal');
      console.error('   - Or: Activity Monitor → GPU tab during indexing');
      
      this.modelLoaded = true;
    } catch (error) {
      // Clean up any partial WebGPU state
      if (this.gpuDevice) {
        try {
          this.gpuDevice.destroy?.();
        } catch {}
        this.gpuDevice = null;
      }
      
      console.error('❌ WebGPU adapter initialization failed:', error);
      throw error;
    }
  }

  async getEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.modelLoaded || !this.model) {
      throw new Error('WebGPU adapter not initialized');
    }

    const result = await this.model(text, {
      pooling: 'mean',
      normalize: true
    });

    let embedding: number[];
    if (Array.isArray(result)) {
      embedding = result[0];
    } else if (result.data) {
      embedding = Array.from(result.data);
    } else {
      throw new Error('Unexpected model output format');
    }

    return {
      embedding,
      dimensions: embedding.length,
      model: `webgpu-${this.modelName}`,
      version: 1
    };
  }

  async close(): Promise<void> {
    this.model = null;
    this.modelLoaded = false;
  }

  /**
   * Test WebGPU capability by running a simple compute operation
   */
  private async testWebGPUCapability(): Promise<void> {
    if (!this.gpuDevice) {
      throw new Error('WebGPU device not available');
    }

    let shaderModule = null;
    let buffer = null;
    let resultBuffer = null;
    let computePipeline = null;

    try {
      // Simple compute shader that adds 1 to each element
      const shaderCode = `
        @group(0) @binding(0) var<storage, read_write> data: array<f32>;
        
        @compute @workgroup_size(1)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let index = global_id.x;
          if (index >= arrayLength(&data)) { return; }
          data[index] = data[index] + 1.0;
        }
      `;

      // Create shader module with error handling
      try {
        shaderModule = this.gpuDevice.createShaderModule({ code: shaderCode });
      } catch (error) {
        throw new Error(`Shader compilation failed: ${error}`);
      }
      
      // Create test data (smaller for safety)
      const testData = new Float32Array([1.0, 2.0]);
      
      // Create buffers with error handling
      try {
        // @ts-ignore - GPUBufferUsage is from globals
        buffer = this.gpuDevice.createBuffer({
          size: testData.byteLength,
          usage: (globalThis as any).GPUBufferUsage.STORAGE | (globalThis as any).GPUBufferUsage.COPY_SRC | (globalThis as any).GPUBufferUsage.COPY_DST,
        });

        // @ts-ignore - GPUBufferUsage is from globals
        resultBuffer = this.gpuDevice.createBuffer({
          size: testData.byteLength,
          usage: (globalThis as any).GPUBufferUsage.COPY_DST | (globalThis as any).GPUBufferUsage.MAP_READ,
        });
      } catch (error) {
        throw new Error(`Buffer creation failed: ${error}`);
      }

      // Write test data with error handling
      try {
        this.gpuDevice.queue.writeBuffer(buffer, 0, testData);
      } catch (error) {
        throw new Error(`Buffer write failed: ${error}`);
      }

      // Create compute pipeline with error handling
      try {
        computePipeline = this.gpuDevice.createComputePipeline({
          layout: 'auto',
          compute: {
            module: shaderModule,
            entryPoint: 'main',
          },
        });
      } catch (error) {
        throw new Error(`Compute pipeline creation failed: ${error}`);
      }

      // Create bind group with error handling
      let bindGroup;
      try {
        bindGroup = this.gpuDevice.createBindGroup({
          layout: computePipeline.getBindGroupLayout(0),
          entries: [{ binding: 0, resource: { buffer } }],
        });
      } catch (error) {
        throw new Error(`Bind group creation failed: ${error}`);
      }

      // Submit compute pass with error handling
      try {
        const commandEncoder = this.gpuDevice.createCommandEncoder();
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(computePipeline);
        computePass.setBindGroup(0, bindGroup);
        computePass.dispatchWorkgroups(testData.length); // One workgroup per element
        computePass.end();

        // Copy result and submit
        commandEncoder.copyBufferToBuffer(buffer, 0, resultBuffer, 0, testData.byteLength);
        this.gpuDevice.queue.submit([commandEncoder.finish()]);
      } catch (error) {
        throw new Error(`Command submission failed: ${error}`);
      }

      // Wait for completion with proper synchronization
      try {
        // Wait for submitted work to complete
        await this.gpuDevice.queue.onSubmittedWorkDone();
        
        // Map buffer for reading
        // @ts-ignore - GPUMapMode is from globals
        await resultBuffer.mapAsync((globalThis as any).GPUMapMode.READ);
        const result = new Float32Array(resultBuffer.getMappedRange());
        
        // Verify computation worked (each element should be incremented by 1)
        const expected = [2.0, 3.0];
        const isCorrect = result.length === expected.length && 
                         result.every((val, i) => Math.abs(val - (expected[i] || 0)) < 0.001);
        
        // Unmap before checking result
        resultBuffer.unmap();
        
        if (isCorrect) {
          console.error('🎯 WebGPU compute test PASSED - GPU is functional');
        } else {
          throw new Error(`WebGPU compute test failed - expected [${expected}], got [${Array.from(result)}]`);
        }
      } catch (error) {
        throw new Error(`Result verification failed: ${error}`);
      }
      
    } catch (error) {
      console.error('❌ WebGPU capability test failed:', error);
      throw new Error(`WebGPU not functional: ${error}`);
    } finally {
      // Clean up resources in correct order
      try {
        if (buffer) {
          buffer.destroy();
        }
        if (resultBuffer) {
          resultBuffer.destroy();
        }
      } catch (cleanupError) {
        console.warn('Warning: Resource cleanup failed:', cleanupError);
      }
    }
  }

  getAdapterName(): string {
    return 'Transformers.js (WebGPU)';
  }
}

/**
 * Optimized CPU adapter (multi-threaded + SIMD + quantized)
 */
class OptimizedCPUAdapter extends EmbeddingAdapter {
  private model: any = null;
  private modelLoaded: boolean = false;

  async initialize(): Promise<void> {
    if (this.modelLoaded) return;

    try {
      const { pipeline, env } = await import('@xenova/transformers');

      // Configure Transformers.js for maximum CPU performance
      env.backends.onnx.wasm.proxy = false;
      env.backends.onnx.wasm.numThreads = 8; // Use more threads
      env.backends.onnx.wasm.simd = true;    // Enable SIMD instructions
      
      console.error(`🚀 Loading optimized CPU model: ${this.modelName}`);
      const startTime = Date.now();

      this.model = await pipeline('feature-extraction', this.modelName, {
        quantized: true // Quantized for speed + size
      });

      const loadTime = Date.now() - startTime;
      console.error(`✅ Optimized CPU model loaded in ${loadTime}ms (8 threads + SIMD + quantized)`);
      
      this.modelLoaded = true;
    } catch (error) {
      console.error('❌ Optimized CPU adapter initialization failed:', error);
      throw error;
    }
  }

  async getEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.modelLoaded || !this.model) {
      throw new Error('Optimized CPU adapter not initialized');
    }

    const result = await this.model(text, {
      pooling: 'mean',
      normalize: true
    });

    let embedding: number[];
    if (Array.isArray(result)) {
      embedding = result[0];
    } else if (result.data) {
      embedding = Array.from(result.data);
    } else {
      throw new Error('Unexpected model output format');
    }

    return {
      embedding,
      dimensions: embedding.length,
      model: `optimized-cpu-${this.modelName}`,
      version: 1
    };
  }

  async close(): Promise<void> {
    this.model = null;
    this.modelLoaded = false;
  }

  getAdapterName(): string {
    return 'Transformers.js (Optimized CPU)';
  }
}

/**
 * Basic CPU adapter (fallback)
 */
class BasicCPUAdapter extends EmbeddingAdapter {
  private model: any = null;
  private modelLoaded: boolean = false;

  async initialize(): Promise<void> {
    if (this.modelLoaded) return;

    try {
      const { pipeline } = await import('@xenova/transformers');

      console.error(`🧠 Loading basic CPU model: ${this.modelName}`);
      const startTime = Date.now();

      this.model = await pipeline('feature-extraction', this.modelName, {
        quantized: true // Use quantized for compatibility
      });

      const loadTime = Date.now() - startTime;
      console.error(`✅ Basic CPU model loaded in ${loadTime}ms (single-threaded + quantized)`);
      
      this.modelLoaded = true;
    } catch (error) {
      console.error('❌ Basic CPU adapter initialization failed:', error);
      throw error;
    }
  }

  async getEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.modelLoaded || !this.model) {
      throw new Error('Basic CPU adapter not initialized');
    }

    const result = await this.model(text, {
      pooling: 'mean',
      normalize: true
    });

    let embedding: number[];
    if (Array.isArray(result)) {
      embedding = result[0];
    } else if (result.data) {
      embedding = Array.from(result.data);
    } else {
      throw new Error('Unexpected model output format');
    }

    return {
      embedding,
      dimensions: embedding.length,
      model: `basic-cpu-${this.modelName}`,
      version: 1
    };
  }

  async close(): Promise<void> {
    this.model = null;
    this.modelLoaded = false;
  }

  getAdapterName(): string {
    return 'Transformers.js (Basic CPU)';
  }
}

/**
 * Main embedding service with adaptive backend selection
 */
export class EmbeddingService {
  private adapter: EmbeddingAdapter | null = null;
  private modelName: string;
  private maxTextLength: number;
  private embeddingCache: Map<string, EmbeddingResult>;
  private batchSize: number;
  private useWebGPU: boolean;
  private useOptimized: boolean;
  private cacheCleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(options: EmbeddingServiceOptions = {}) {
    this.modelName = options.model || 'sentence-transformers/all-MiniLM-L6-v2';
    this.maxTextLength = options.maxTextLength || 512;
    this.batchSize = options.batchSize || 32;
    this.useWebGPU = false; // Temporarily disable WebGPU to isolate CPU segfault
    this.useOptimized = options.useOptimized !== false; // Default to true
    this.embeddingCache = new Map();
    
    // Set cache size limit
    const cacheSize = options.cacheSize || 1000;
    this.cacheCleanupInterval = setInterval(() => {
      if (this.embeddingCache.size > cacheSize) {
        const keys = Array.from(this.embeddingCache.keys());
        const keysToDelete = keys.slice(0, keys.length - cacheSize);
        keysToDelete.forEach(key => this.embeddingCache.delete(key));
      }
    }, 60000);
  }

  /**
   * Initialize the best available adapter with proper fallback hierarchy
   */
  async initialize(): Promise<void> {
    if (this.adapter) return;

    const modelPath = `Xenova/${this.modelName.split('/').pop()}`;

    // Try WebGPU first (if enabled)
    if (this.useWebGPU) {
      try {
        this.adapter = new WebGPUAdapter(modelPath, this.maxTextLength);
        await this.adapter.initialize();
        console.error(`🎯 Using adapter: ${this.adapter.getAdapterName()}`);
        return;
      } catch (error) {
        console.error('⚠️  WebGPU adapter failed, falling back to optimized CPU...');
        this.adapter = null;
      }
    }

    // Try optimized CPU adapter (if enabled)
    if (this.useOptimized) {
      try {
        this.adapter = new OptimizedCPUAdapter(modelPath, this.maxTextLength);
        await this.adapter.initialize();
        console.error(`🎯 Using adapter: ${this.adapter.getAdapterName()}`);
        return;
      } catch (error) {
        console.error('⚠️  Optimized CPU adapter failed, falling back to basic CPU...');
        this.adapter = null;
      }
    }

    // Final fallback to basic CPU
    try {
      this.adapter = new BasicCPUAdapter(modelPath, this.maxTextLength);
      await this.adapter.initialize();
      console.error(`🎯 Using adapter: ${this.adapter.getAdapterName()}`);
    } catch (error) {
      throw new Error(`All embedding adapters failed: ${error}`);
    }
  }

  /**
   * Generate embedding for a text string
   */
  async getEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.adapter) {
      await this.initialize();
    }

    if (!this.adapter) {
      throw new Error('No embedding adapter available');
    }

    // Normalize text
    const normalizedText = text.replace(/\s+/g, ' ').trim().substring(0, this.maxTextLength);
    
    // Check cache
    const cacheKey = `${this.adapter.getAdapterName()}:${normalizedText}`;
    const cached = this.embeddingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.adapter.getEmbedding(normalizedText);
      this.embeddingCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('❌ Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for an entity using a text converter
   */
  async generateEntityEmbedding<T extends Searchable>(entity: T, textConverter: TextConverter<T>): Promise<EmbeddingResult> {
    const text = textConverter(entity);
    return await this.getEmbedding(text);
  }

  /**
   * Generate embeddings for multiple entities in batch
   */
  async generateEntityEmbeddings<T extends Searchable>(entities: T[], textConverter: TextConverter<T>): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    
    for (let i = 0; i < entities.length; i += this.batchSize) {
      const batch = entities.slice(i, i + this.batchSize);
      const batchPromises = batch.map(entity => this.generateEntityEmbedding(entity, textConverter));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Get embedding service statistics
   */
  getStats() {
    return {
      modelName: this.modelName,
      adapter: this.adapter?.getAdapterName() || 'Not initialized',
      cacheSize: this.embeddingCache.size,
      maxTextLength: this.maxTextLength,
      batchSize: this.batchSize
    };
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }


  /**
   * Close the embedding service and free resources
   */
  async close(): Promise<void> {
    if (this.adapter) {
      await this.adapter.close();
      this.adapter = null;
    }
    
    // Clear the cache cleanup interval
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
    
    this.clearCache();
  }
}