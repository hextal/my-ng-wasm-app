import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WatermarkService } from './watermark.service';
import { DocumentStoreService } from './document-store.service';
import { AssetStoreService } from './asset-store.service';
import { HistoryService } from './history.service';

describe('WatermarkService', () => {
  let service: WatermarkService;
  let mockDocumentStore: any;
  let mockAssetStore: any;
  let mockHistory: any;

  beforeEach(() => {
    mockDocumentStore = {
      getDimensions: vi.fn().mockReturnValue({ width: 800, height: 600 }),
    };

    mockAssetStore = {
      put: vi.fn().mockResolvedValue({ assetId: 'test-asset-id' }),
    };

    mockHistory = {
      run: vi.fn().mockResolvedValue(undefined),
    };

    service = new WatermarkService(mockDocumentStore, mockAssetStore, mockHistory);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addWatermark - text', () => {
    it('should add text watermark at center', async () => {
      await service.addWatermark('text', 'Watermark Text', 'center', 0.5);

      expect(mockHistory.run).toHaveBeenCalled();
      const command = mockHistory.run.mock.calls[0][0];
      expect(command.object.type).toBe('text');
      expect(command.object.text).toBe('Watermark Text');
      expect(command.object.opacity).toBe(0.5);
      expect(command.object.x).toBe(400); // Center X
      expect(command.object.y).toBe(300); // Center Y
    });

    it('should add text watermark at top-left', async () => {
      await service.addWatermark('text', 'Top Left', 'top-left', 0.3);

      const command = mockHistory.run.mock.calls[0][0];
      expect(command.object.x).toBe(50); // Margin
      expect(command.object.y).toBe(50); // Margin
    });

    it('should add text watermark at top-right', async () => {
      await service.addWatermark('text', 'Top Right', 'top-right', 0.3);

      const command = mockHistory.run.mock.calls[0][0];
      expect(command.object.x).toBe(750); // Width - margin
      expect(command.object.y).toBe(50);
    });

    it('should add text watermark at bottom-left', async () => {
      await service.addWatermark('text', 'Bottom Left', 'bottom-left', 0.3);

      const command = mockHistory.run.mock.calls[0][0];
      expect(command.object.x).toBe(50);
      expect(command.object.y).toBe(550); // Height - margin
    });

    it('should add text watermark at bottom-right', async () => {
      await service.addWatermark('text', 'Bottom Right', 'bottom-right', 0.3);

      const command = mockHistory.run.mock.calls[0][0];
      expect(command.object.x).toBe(750);
      expect(command.object.y).toBe(550);
    });

    it('should use default opacity of 0.3', async () => {
      await service.addWatermark('text', 'Default Opacity', 'center');

      const command = mockHistory.run.mock.calls[0][0];
      expect(command.object.opacity).toBe(0.3);
    });

    it('should create text with default font properties', async () => {
      await service.addWatermark('text', 'Test', 'center', 0.5);

      const command = mockHistory.run.mock.calls[0][0];
      expect(command.object.fontSize).toBe(48);
      expect(command.object.fontFamily).toBe('Arial');
      expect(command.object.fill).toBe('#ffffff');
    });
  });

  describe('addWatermark - image', () => {
    let mockBlob: Blob;
    let mockImage: any;

    beforeEach(() => {
      mockBlob = new Blob(['fake image data'], { type: 'image/png' });

      // Mock Image constructor
      mockImage = {
        width: 100,
        height: 100,
        onload: null as any,
        onerror: null as any,
        src: '',
      };

      global.Image = vi.fn(() => mockImage) as any;
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    });

    it('should add image watermark at center', async () => {
      const promise = service.addWatermark('image', mockBlob, 'center', 0.5);

      // Simulate image load
      setTimeout(() => mockImage.onload(), 0);

      await promise;

      expect(mockAssetStore.put).toHaveBeenCalledWith(mockBlob);
      expect(mockHistory.run).toHaveBeenCalled();

      const command = mockHistory.run.mock.calls[0][0];
      expect(command.object.type).toBe('image');
      expect(command.object.opacity).toBe(0.5);
      expect(command.object.x).toBe(400);
      expect(command.object.y).toBe(300);
    });

    it('should scale down large watermark images', async () => {
      // Set image to be larger than 20% of canvas
      mockImage.width = 500;
      mockImage.height = 500;

      const promise = service.addWatermark('image', mockBlob, 'center', 0.3);
      setTimeout(() => mockImage.onload(), 0);
      await promise;

      const command = mockHistory.run.mock.calls[0][0];
      // Max watermark size is 20% of min(800, 600) = 120px
      // Scale should be 120 / 500 = 0.24
      expect(command.object.scaleX).toBeCloseTo(0.24, 2);
      expect(command.object.scaleY).toBeCloseTo(0.24, 2);
    });

    it('should not scale down small watermark images', async () => {
      mockImage.width = 50;
      mockImage.height = 50;

      const promise = service.addWatermark('image', mockBlob, 'center', 0.3);
      setTimeout(() => mockImage.onload(), 0);
      await promise;

      const command = mockHistory.run.mock.calls[0][0];
      expect(command.object.scaleX).toBe(1);
      expect(command.object.scaleY).toBe(1);
    });

    it('should position image watermark at top-left', async () => {
      const promise = service.addWatermark('image', mockBlob, 'top-left', 0.3);
      setTimeout(() => mockImage.onload(), 0);
      await promise;

      const command = mockHistory.run.mock.calls[0][0];
      expect(command.object.x).toBe(50);
      expect(command.object.y).toBe(50);
    });

    it('should store asset in asset store', async () => {
      const promise = service.addWatermark('image', mockBlob, 'center', 0.3);
      setTimeout(() => mockImage.onload(), 0);
      await promise;

      expect(mockAssetStore.put).toHaveBeenCalledWith(mockBlob);
      const command = mockHistory.run.mock.calls[0][0];
      expect(command.object.assetId).toBe('test-asset-id');
    });
  });

  describe('position calculation', () => {
    it('should calculate center position correctly', async () => {
      await service.addWatermark('text', 'Center', 'center', 0.3);

      const command = mockHistory.run.mock.calls[0][0];
      expect(command.object.x).toBe(400);
      expect(command.object.y).toBe(300);
    });

    it('should apply margin to corner positions', async () => {
      await service.addWatermark('text', 'Test', 'top-left', 0.3);
      const cmd1 = mockHistory.run.mock.calls[0][0];
      expect(cmd1.object.x).toBe(50);
      expect(cmd1.object.y).toBe(50);

      await service.addWatermark('text', 'Test', 'bottom-right', 0.3);
      const cmd2 = mockHistory.run.mock.calls[1][0];
      expect(cmd2.object.x).toBe(750); // 800 - 50
      expect(cmd2.object.y).toBe(550); // 600 - 50
    });
  });
});
