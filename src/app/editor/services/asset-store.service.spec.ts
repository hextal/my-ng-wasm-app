import { describe, it, expect, beforeEach } from 'vitest';
import { AssetStoreService } from './asset-store.service';

describe('AssetStoreService', () => {
  let service: AssetStoreService;

  beforeEach(() => {
    service = new AssetStoreService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store and retrieve a blob', async () => {
    const blob = new Blob(['test data'], { type: 'image/png' });
    
    const { assetId } = await service.put(blob);
    expect(assetId).toBeTruthy();

    const retrievedBlob = await service.get(assetId);
    expect(retrievedBlob).toBeTruthy();
    expect(retrievedBlob.type).toBe('image/png');
  });

  it('should throw error when retrieving non-existent asset', async () => {
    await expect(service.get('non-existent-id')).rejects.toThrow('Asset not found');
  });

  it('should delete an asset', async () => {
    const blob = new Blob(['test data'], { type: 'image/png' });
    const { assetId } = await service.put(blob);

    await service.delete(assetId);

    expect(service.has(assetId)).toBe(false);
    await expect(service.get(assetId)).rejects.toThrow('Asset not found');
  });

  it('should create and cache object URLs', async () => {
    const blob = new Blob(['test data'], { type: 'image/png' });
    const { assetId } = await service.put(blob);

    const url1 = await service.getObjectUrl(assetId);
    const url2 = await service.getObjectUrl(assetId);

    expect(url1).toBe(url2); // Should return cached URL
    expect(url1).toContain('blob:');
  });

  it('should clear all assets', async () => {
    const blob1 = new Blob(['test 1'], { type: 'image/png' });
    const blob2 = new Blob(['test 2'], { type: 'image/png' });

    await service.put(blob1);
    await service.put(blob2);

    expect(service.size()).toBe(2);

    service.clear();

    expect(service.size()).toBe(0);
  });

  it('should check if asset exists', async () => {
    const blob = new Blob(['test data'], { type: 'image/png' });
    const { assetId } = await service.put(blob);

    expect(service.has(assetId)).toBe(true);
    expect(service.has('non-existent')).toBe(false);
  });
});
