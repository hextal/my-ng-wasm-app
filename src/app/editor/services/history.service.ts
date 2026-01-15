import { Injectable, signal } from '@angular/core';
import { Command } from '../core/commands/command.interface';
import { DocumentStoreService } from './document-store.service';

/**
 * HistoryService - Manages undo/redo for commands
 * Uses the Command pattern to track and reverse operations
 */
@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private isExecuting = false;

  // Signals for UI state
  canUndo = signal(false);
  canRedo = signal(false);

  constructor(private documentStore: DocumentStoreService) {}

  /**
   * Execute a command and add it to history
   */
  async run(command: Command): Promise<void> {
    if (this.isExecuting) {
      console.warn('Command execution in progress, skipping');
      return;
    }

    this.isExecuting = true;
    try {
      await command.execute(this.documentStore);
      this.undoStack.push(command);
      this.redoStack = []; // Clear redo stack on new command
      this.updateSignals();
    } catch (error) {
      console.error('Command execution failed:', error);
      throw error;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Undo the last command
   */
  async undo(): Promise<void> {
    if (this.undoStack.length === 0 || this.isExecuting) {
      return;
    }

    this.isExecuting = true;
    try {
      const command = this.undoStack.pop()!;
      await command.undo(this.documentStore);
      this.redoStack.push(command);
      this.updateSignals();
    } catch (error) {
      console.error('Undo failed:', error);
      throw error;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Redo the last undone command
   */
  async redo(): Promise<void> {
    if (this.redoStack.length === 0 || this.isExecuting) {
      return;
    }

    this.isExecuting = true;
    try {
      const command = this.redoStack.pop()!;
      await command.execute(this.documentStore);
      this.undoStack.push(command);
      this.updateSignals();
    } catch (error) {
      console.error('Redo failed:', error);
      throw error;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.updateSignals();
  }

  /**
   * Get the undo stack size
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get the redo stack size
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Get description of the last command in undo stack
   */
  getUndoDescription(): string | null {
    return this.undoStack.length > 0
      ? this.undoStack[this.undoStack.length - 1].describe()
      : null;
  }

  /**
   * Get description of the last command in redo stack
   */
  getRedoDescription(): string | null {
    return this.redoStack.length > 0
      ? this.redoStack[this.redoStack.length - 1].describe()
      : null;
  }

  /**
   * Update signals for UI binding
   */
  private updateSignals(): void {
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
  }
}
