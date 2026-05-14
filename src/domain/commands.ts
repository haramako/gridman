/**
 * Command pattern foundation for undo/redo and copy/paste.
 *
 * Each user action that mutates data is represented as a Command object.
 * CommandHistory maintains undo/redo stacks and executes commands.
 *
 * Current status: infrastructure only.
 * Integration with useProjectStore.updateCell is left for the next phase
 * once the undo/redo UX (Ctrl+Z / Ctrl+Y shortcuts) is wired up.
 */

export interface Command {
  execute(): void;
  undo(): void;
  description: string;
}

export class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  execute(cmd: Command): void {
    cmd.execute();
    this.undoStack.push(cmd);
    this.redoStack = [];
  }

  undo(): void {
    const cmd = this.undoStack.pop();
    if (cmd) {
      cmd.undo();
      this.redoStack.push(cmd);
    }
  }

  redo(): void {
    const cmd = this.redoStack.pop();
    if (cmd) {
      cmd.execute();
      this.undoStack.push(cmd);
    }
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

// Singleton history shared across the session.
// Replace with a Zustand-backed store when integrating with React.
export const commandHistory = new CommandHistory();

// ---------------------------------------------------------------------------
// Built-in command types
// ---------------------------------------------------------------------------

/**
 * Edit a single cell value.
 * Requires a setter that accepts (newValue) and a getter for the current value.
 */
export class EditCellCommand implements Command {
  readonly description: string;
  private prevValue: unknown;

  constructor(
    private readonly setter: (value: unknown) => void,
    getter: () => unknown,
    private readonly newValue: unknown,
    description?: string
  ) {
    this.prevValue = getter();
    this.description = description ?? 'セル編集';
  }

  execute(): void {
    this.setter(this.newValue);
  }

  undo(): void {
    this.setter(this.prevValue);
  }
}

/**
 * Batch multiple commands into one undoable unit.
 */
export class CompositeCommand implements Command {
  readonly description: string;

  constructor(
    private readonly commands: Command[],
    description?: string
  ) {
    this.description = description ?? `${commands.length}件の操作`;
  }

  execute(): void {
    for (const cmd of this.commands) cmd.execute();
  }

  undo(): void {
    for (const cmd of [...this.commands].reverse()) cmd.undo();
  }
}
