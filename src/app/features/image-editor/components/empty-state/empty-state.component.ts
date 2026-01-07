import { Component, Input, Output, EventEmitter } from '@angular/core';

/**
 * Empty State Component
 * 
 * Displays a centered empty state with an icon, message, and action button.
 * Used when no image is loaded in the editor.
 * 
 * Design Source: Figma UIUX-207--Content-Library (node-id=3636-23886)
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  /**
   * Message to display to the user
   * @default "Load an image to start editing"
   */
  @Input() message = 'Load an image to start editing';
  
  /**
   * Text to display on the action button
   * @default "Load image"
   */
  @Input() buttonText = 'Load image';
  
  /**
   * Path to the icon SVG file
   * @default "/assets/icons/image-icon.svg"
   */
  @Input() iconPath = '/assets/icons/image-icon.svg';
  
  /**
   * Event emitted when the action button is clicked
   */
  @Output() action = new EventEmitter<void>();
  
  /**
   * Handles button click and emits action event
   */
  handleAction(): void {
    this.action.emit();
  }
}
