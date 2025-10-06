import { DataSource, Repository } from 'typeorm';
import { EmbeddingRepository } from '../EmbeddingRepository';
import { Embedding } from '../../entities/index/Embedding.entity';

// TypeORM is mocked globally in __mocks__/typeorm.js

describe('EmbeddingRepository', () => {
  let embeddingRepository: EmbeddingRepository;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockEmbeddingRepo: jest.Mocked<Repository<Embedding>>;

  beforeEach(() => {
    mockEmbeddingRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as any;

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockEmbeddingRepo)
    } as any;

    embeddingRepository = new EmbeddingRepository(mockDataSource);
  });

  describe('storeEmbedding', () => {
    it('should insert new embedding when it does not exist', async () => {
      const entityId = 'comp1';
      const embedding = [0.1, 0.2, 0.3];
      const version = '1.0.0';
      const entityType = 'component';

      mockEmbeddingRepo.findOne.mockResolvedValue(null);
      mockEmbeddingRepo.insert.mockResolvedValue({ identifiers: [{ entity_id: entityId }] } as any);

      const result = await embeddingRepository.storeEmbedding(entityId, embedding, version, entityType);

      expect(mockEmbeddingRepo.findOne).toHaveBeenCalledWith({
        where: {
          entity_id: entityId,
          entity_type: entityType
        }
      });

      expect(mockEmbeddingRepo.insert).toHaveBeenCalledWith({
        entity_id: entityId,
        entity_type: entityType,
        embedding: JSON.stringify(embedding),
        version,
        created_at: expect.any(Date)
      });

      expect(result).toEqual({ success: true, affected: 1 });
    });

    it('should update existing embedding when it exists', async () => {
      const entityId = 'comp1';
      const embedding = [0.1, 0.2, 0.3];
      const version = '1.0.1';
      const entityType = 'component';

      const existingEmbedding = { entity_id: entityId, entity_type: entityType };
      mockEmbeddingRepo.findOne.mockResolvedValue(existingEmbedding as any);
      mockEmbeddingRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await embeddingRepository.storeEmbedding(entityId, embedding, version, entityType);

      expect(mockEmbeddingRepo.update).toHaveBeenCalledWith(
        { entity_id: entityId, entity_type: entityType },
        {
          entity_id: entityId,
          entity_type: entityType,
          embedding: JSON.stringify(embedding),
          version,
          created_at: expect.any(Date)
        }
      );

      expect(result).toEqual({ success: true, affected: 1 });
    });

    it('should default to component entity type', async () => {
      const entityId = 'comp1';
      const embedding = [0.1, 0.2, 0.3];
      const version = '1.0.0';

      mockEmbeddingRepo.findOne.mockResolvedValue(null);
      mockEmbeddingRepo.insert.mockResolvedValue({ identifiers: [{ entity_id: entityId }] } as any);

      await embeddingRepository.storeEmbedding(entityId, embedding, version);

      expect(mockEmbeddingRepo.findOne).toHaveBeenCalledWith({
        where: {
          entity_id: entityId,
          entity_type: 'component'
        }
      });
    });

    it('should handle errors gracefully', async () => {
      const entityId = 'comp1';
      const embedding = [0.1, 0.2, 0.3];
      const version = '1.0.0';

      mockEmbeddingRepo.findOne.mockRejectedValue(new Error('Database error'));

      const result = await embeddingRepository.storeEmbedding(entityId, embedding, version);

      expect(result).toEqual({ success: false, error: 'Error: Database error' });
    });
  });

  describe('getEmbedding', () => {
    it('should return embedding when it exists', async () => {
      const entityId = 'comp1';
      const entityType = 'component';
      const storedEmbedding = {
        entity_id: entityId,
        entity_type: entityType,
        embedding: '[0.1, 0.2, 0.3]',
        version: '1.0.0'
      };

      mockEmbeddingRepo.findOne.mockResolvedValue(storedEmbedding as any);

      const result = await embeddingRepository.getEmbedding(entityId, entityType);

      expect(mockEmbeddingRepo.findOne).toHaveBeenCalledWith({
        where: {
          entity_id: entityId,
          entity_type: entityType
        }
      });

      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3],
        version: '1.0.0'
      });
    });

    it('should return null when embedding does not exist', async () => {
      const entityId = 'comp1';
      const entityType = 'component';

      mockEmbeddingRepo.findOne.mockResolvedValue(null);

      const result = await embeddingRepository.getEmbedding(entityId, entityType);

      expect(result).toBeNull();
    });

    it('should default to component entity type', async () => {
      const entityId = 'comp1';

      mockEmbeddingRepo.findOne.mockResolvedValue(null);

      await embeddingRepository.getEmbedding(entityId);

      expect(mockEmbeddingRepo.findOne).toHaveBeenCalledWith({
        where: {
          entity_id: entityId,
          entity_type: 'component'
        }
      });
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const entityId = 'comp1';
      const entityType = 'component';
      const storedEmbedding = {
        entity_id: entityId,
        entity_type: entityType,
        embedding: 'invalid json',
        version: '1.0.0'
      };

      mockEmbeddingRepo.findOne.mockResolvedValue(storedEmbedding as any);

      const result = await embeddingRepository.getEmbedding(entityId, entityType);

      expect(result).toEqual({
        embedding: 'invalid json', // Returns raw value when JSON parsing fails
        version: '1.0.0'
      });
    });

    it('should handle database errors gracefully', async () => {
      const entityId = 'comp1';
      const entityType = 'component';

      mockEmbeddingRepo.findOne.mockRejectedValue(new Error('Database error'));

      const result = await embeddingRepository.getEmbedding(entityId, entityType);

      expect(result).toBeNull();
    });
  });

  describe('getEmbeddingsByType', () => {
    it('should return embeddings for specified type', async () => {
      const entityType = 'component';
      const mockEmbeddings = [
        { entity_id: 'comp1', embedding: '[0.1, 0.2]', version: '1.0.0' },
        { entity_id: 'comp2', embedding: '[0.3, 0.4]', version: '1.0.0' }
      ];

      mockEmbeddingRepo.find.mockResolvedValue(mockEmbeddings as any);

      const result = await embeddingRepository.getEmbeddingsByType(entityType);

      expect(mockEmbeddingRepo.find).toHaveBeenCalledWith({
        where: { entity_type: entityType }
      });

      expect(result).toEqual([
        { entity_id: 'comp1', embedding: '[0.1, 0.2]', version: '1.0.0' },
        { entity_id: 'comp2', embedding: '[0.3, 0.4]', version: '1.0.0' }
      ]);
    });

    it('should return empty array on error', async () => {
      const entityType = 'component';

      mockEmbeddingRepo.find.mockRejectedValue(new Error('Database error'));

      const result = await embeddingRepository.getEmbeddingsByType(entityType);

      expect(result).toEqual([]);
    });

    it('should fallback to secondary find method on initial error', async () => {
      const entityType = 'component';
      const mockEmbeddings = [
        { entity_id: 'comp1', embedding: '[0.1, 0.2]', version: '1.0.0' }
      ];

      mockEmbeddingRepo.find
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(mockEmbeddings as any);

      const result = await embeddingRepository.getEmbeddingsByType(entityType);

      expect(mockEmbeddingRepo.find).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { entity_id: 'comp1', embedding: '[0.1, 0.2]', version: '1.0.0' }
      ]);
    });
  });

  describe('deleteEmbedding', () => {
    it('should delete embedding successfully', async () => {
      const entityId = 'comp1';
      const entityType = 'component';

      mockEmbeddingRepo.delete.mockResolvedValue({ affected: 1 } as any);

      const result = await embeddingRepository.deleteEmbedding(entityId, entityType);

      expect(mockEmbeddingRepo.delete).toHaveBeenCalledWith({
        entity_id: entityId,
        entity_type: entityType
      });

      expect(result).toEqual({ success: true, affected: 1 });
    });

    it('should default to component entity type', async () => {
      const entityId = 'comp1';

      mockEmbeddingRepo.delete.mockResolvedValue({ affected: 1 } as any);

      await embeddingRepository.deleteEmbedding(entityId);

      expect(mockEmbeddingRepo.delete).toHaveBeenCalledWith({
        entity_id: entityId,
        entity_type: 'component'
      });
    });

    it('should handle database errors gracefully', async () => {
      const entityId = 'comp1';
      const entityType = 'component';

      mockEmbeddingRepo.delete.mockRejectedValue(new Error('Database error'));

      const result = await embeddingRepository.deleteEmbedding(entityId, entityType);

      expect(result).toEqual({ success: false, error: 'Error: Database error' });
    });
  });

  describe('getAllEmbeddings', () => {
    it('should return all embeddings with parsed JSON', async () => {
      const mockEmbeddings = [
        { entity_id: 'comp1', entity_type: 'component', embedding: '[0.1, 0.2]', version: '1.0.0' },
        { entity_id: 'task1', entity_type: 'task', embedding: '[0.3, 0.4]', version: '1.0.0' }
      ];

      mockEmbeddingRepo.find.mockResolvedValue(mockEmbeddings as any);

      const result = await embeddingRepository.getAllEmbeddings();

      expect(result).toEqual([
        { entity_id: 'comp1', entity_type: 'component', embedding: [0.1, 0.2], version: '1.0.0' },
        { entity_id: 'task1', entity_type: 'task', embedding: [0.3, 0.4], version: '1.0.0' }
      ]);
    });

    it('should return empty array on error', async () => {
      mockEmbeddingRepo.find.mockRejectedValue(new Error('Database error'));

      const result = await embeddingRepository.getAllEmbeddings();

      expect(result).toEqual([]);
    });
  });
});