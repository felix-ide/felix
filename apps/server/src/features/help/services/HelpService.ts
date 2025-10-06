import type { HelpPack, HelpSection } from '../../../types/HelpTypes.js';

import { TASKS_HELP } from '../../../help/tasksHelp.js';
import { WORKFLOWS_HELP } from '../../../help/workflowsHelp.js';
import { NOTES_HELP } from '../../../help/notesHelp.js';
import { CHECKLISTS_HELP } from '../../../help/checklistsHelp.js';
import { SPEC_HELP } from '../../../help/specHelp.js';

const REGISTRY: Record<HelpSection, HelpPack> = {
  tasks: TASKS_HELP,
  workflows: WORKFLOWS_HELP,
  notes: NOTES_HELP,
  checklists: CHECKLISTS_HELP,
  spec: SPEC_HELP,
};

export class HelpService {
  static listSections(): Array<{ section: HelpSection; version: string }> {
    return (Object.keys(REGISTRY) as HelpSection[]).map(s => ({ section: s, version: REGISTRY[s].version }));
  }

  static get(section: HelpSection): HelpPack {
    const pack = REGISTRY[section];
    if (!pack) throw new Error(`Unknown help section: ${section}`);
    return pack;
  }
}
