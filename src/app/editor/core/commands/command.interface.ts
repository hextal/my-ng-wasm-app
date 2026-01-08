import { DocumentStoreService } from '../../services/document-store.service';

/**
 * Command interface for undo/redo pattern
 */
export interface Command {
  /**
   * Execute the command
   */
  execute(store: DocumentStoreService): void | Promise<void>;

  /**
   * Undo the command
   */
  undo(store: DocumentStoreService): void | Promise<void>;

  /**
   * Get a human-readable description of the command
   */
  describe(): string;
}
