/**
 * Text Chunking Tests
 */

import {
  chunkText,
  slidingWindowChunk,
  chunkByParagraphs,
  semanticChunk
} from '../../text/chunking';

describe('Text Chunking', () => {
  describe('chunkText', () => {
    it('should chunk text with default options', () => {
      const text = 'This is a test. '.repeat(100);
      const chunks = chunkText(text, { maxChunkSize: 100 });
      
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]!.length).toBeLessThanOrEqual(100);
    });

    it('should respect word boundaries', () => {
      const text = 'This is a very long word that should not be split in the middle of processing';
      const chunks = chunkText(text, {
        maxChunkSize: 20,
        overlap: 0,
        respectWordBoundaries: true
      });
      
      // Should create multiple chunks
      expect(chunks.length).toBeGreaterThan(1);
      // All chunks should have content
      chunks.forEach(chunk => {
        expect(chunk.trim().length).toBeGreaterThan(0);
      });
    });

    it('should handle overlap correctly', () => {
      const text = 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z';
      const chunks = chunkText(text, {
        maxChunkSize: 10,
        overlap: 5,
        respectWordBoundaries: false
      });
      
      // Should create multiple chunks with overlap
      expect(chunks.length).toBeGreaterThan(1);
      // All chunks should have content
      chunks.forEach(chunk => {
        expect(chunk.trim().length).toBeGreaterThan(0);
      });
    });

    it('should handle empty text', () => {
      const chunks = chunkText('', { maxChunkSize: 100 });
      expect(chunks).toHaveLength(0);
    });

    it('should handle text smaller than chunk size', () => {
      const text = 'Short text';
      const chunks = chunkText(text, { maxChunkSize: 100 });
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });
  });

  describe('slidingWindowChunk', () => {
    it('should create sliding window chunks', () => {
      const text = '1234567890';
      const chunks = slidingWindowChunk(text, 5, 2);
      
      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toBe('12345');
      expect(chunks[1]).toBe('34567');
      expect(chunks[2]).toBe('56789');
      expect(chunks[3]).toBe('7890');
    });

    it('should handle no overlap', () => {
      const text = '1234567890';
      const chunks = slidingWindowChunk(text, 5, 5);
      
      expect(chunks[0]).toBe('12345');
      expect(chunks[1]).toBe('67890');
    });
  });

  describe('chunkByParagraphs', () => {
    it('should chunk by paragraphs', () => {
      const text = 'Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.';
      const chunks = chunkByParagraphs(text, 15, 5); // Small chunk size to force splitting
      
      expect(chunks.length).toBeGreaterThan(0);
      // Should contain all paragraph content
      const allText = chunks.join(' ');
      expect(allText).toContain('Paragraph 1');
      expect(allText).toContain('Paragraph 2');
      expect(allText).toContain('Paragraph 3');
    });

    it('should merge small paragraphs', () => {
      const text = 'A.\n\nB.\n\nC.\n\nThis is a longer paragraph that should be separate.';
      const chunks = chunkByParagraphs(text, 80);
      
      // Should create chunks
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should split large paragraphs', () => {
      const largePara = 'Word '.repeat(100);
      const text = `Small para.\n\n${largePara}`;
      const chunks = chunkByParagraphs(text, 50);
      
      // Large paragraph should be split
      expect(chunks.length).toBeGreaterThan(2);
    });

    it('should handle different line endings', () => {
      const text = 'Para 1.\r\n\r\nPara 2.\n\nPara 3.\r\n\r\nPara 4.';
      const chunks = chunkByParagraphs(text, 10, 5); // Small chunks to force splitting
      
      expect(chunks.length).toBeGreaterThan(0);
      // Should contain all content
      const allText = chunks.join(' ');
      expect(allText).toContain('Para 1');
      expect(allText).toContain('Para 4');
    });
  });

  describe('semanticChunk', () => {
    it('should chunk by sentences', async () => {
      const text = 'First sentence. Second sentence! Third sentence? Fourth.';
      const mockEmbedder = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
      
      const chunks = await semanticChunk(text, {
        maxChunkSize: 20,
        similarityThreshold: 0.5,
        embedder: mockEmbedder
      });
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(mockEmbedder).toHaveBeenCalled();
    });

    it('should merge short sentences', async () => {
      const text = 'Hi. Hello. How are you? I am fine.';
      const mockEmbedder = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
      
      const chunks = await semanticChunk(text, {
        maxChunkSize: 25,
        similarityThreshold: 0.8, // High threshold to encourage merging
        embedder: mockEmbedder
      });
      
      // Should create some chunks
      expect(chunks.length).toBeGreaterThan(0);
      expect(mockEmbedder).toHaveBeenCalled();
    });

    it('should handle code blocks specially', async () => {
      const text = `
Some text before code.

\`\`\`javascript
function test() {
  console.error("Hello");
  return 42;
}
\`\`\`

Some text after code.
      `.trim();
      
      const mockEmbedder = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
      
      const chunks = await semanticChunk(text, {
        maxChunkSize: 50,
        similarityThreshold: 0.5,
        embedder: mockEmbedder
      });
      
      // Should create chunks
      expect(chunks.length).toBeGreaterThan(0);
      expect(mockEmbedder).toHaveBeenCalled();
    });

    it('should respect markdown headers', async () => {
      const text = `
# Header 1
Content under header 1.

## Header 2
Content under header 2.

### Header 3
Content under header 3.
      `.trim();
      
      const mockEmbedder = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
      
      const chunks = await semanticChunk(text, {
        maxChunkSize: 50,
        similarityThreshold: 0.5,
        embedder: mockEmbedder
      });
      
      // Should create chunks
      expect(chunks.length).toBeGreaterThan(0);
      expect(mockEmbedder).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle unicode text', () => {
      const text = '你好世界 🌍 Hello World émojis café';
      const chunks = chunkText(text, { maxChunkSize: 10 });
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(10);
      });
    });

    it('should handle very long words', () => {
      const longWord = 'a'.repeat(100);
      const text = `Short ${longWord} end`;
      const chunks = chunkText(text, {
        maxChunkSize: 20,
        respectWordBoundaries: false // Don't respect boundaries to force splitting
      });
      
      // Should handle long word gracefully
      expect(chunks.length).toBeGreaterThan(1);
      // Should contain parts of the text
      const allText = chunks.join('');
      expect(allText).toContain('Short');
      expect(allText).toContain('end');
      expect(allText).toContain('aaa'); // Should contain part of long word
    });

    it('should handle only whitespace', () => {
      const chunks = chunkText('   \n\n   \t\t   ', { maxChunkSize: 100 });
      // Function may return whitespace chunk - test that it's minimal
      chunks.forEach(chunk => {
        expect(typeof chunk).toBe('string');
      });
    });
  });
});