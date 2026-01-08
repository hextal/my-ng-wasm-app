import { Component, EventEmitter, Output, signal, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FabricCanvasService } from '../../services/fabric-canvas.service';

/**
 * ToolbarComponent - Horizontal bottom toolbar for editor controls
 */
@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent {
  @Output() importImage = new EventEmitter<void>();
  @Output() toolChange = new EventEmitter<string>();

  currentTool = signal<string>('select');

  constructor(private fabricCanvas: FabricCanvasService) {}

  onSelectTool(): void {
    this.currentTool.set('select');
    this.fabricCanvas.setTool('select');
    this.toolChange.emit('select');
  }

  onDrawTool(): void {
    this.currentTool.set('draw');
    this.fabricCanvas.setTool('draw');
    this.toolChange.emit('draw');
  }

  onTextTool(): void {
    this.currentTool.set('text');
    this.fabricCanvas.setTool('text');
    this.toolChange.emit('text');
  }

  onSetTool(tool: string): void {
    this.currentTool.set(tool);
    this.fabricCanvas.setTool(tool as any);
    this.toolChange.emit(tool);
  }

  onImportImage(): void {
    this.importImage.emit();
  }

  async onRotate(): Promise<void> {
    await this.fabricCanvas.rotateSelected(90);
  }

  async onFlip(): Promise<void> {
    await this.fabricCanvas.flipY();
  }
}
