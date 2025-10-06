import * as projects from '@client/shared/api/projectsClient';
import * as workflows from '@client/shared/api/workflowsClient';
import * as notes from '@client/shared/api/notesClient';
import * as tasks from '@client/shared/api/tasksClient';
import * as rules from '@client/shared/api/rulesClient';
import * as search from '@client/shared/api/searchClient';
import * as context from '@client/shared/api/contextClient';
import * as exportsClient from '@client/shared/api/exportClient';
import * as files from '@client/shared/api/filesClient';
import * as help from '@client/shared/api/helpClient';

export const felixService = {
  ...projects,
  ...workflows,
  ...notes,
  ...tasks,
  ...rules,
  ...search,
  ...context,
  ...exportsClient,
  ...files,
  ...help
};

export type FelixService = typeof felixService;
