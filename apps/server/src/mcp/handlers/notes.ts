import { projectManager } from '../project-manager.js';
import { processExcalidrawContent } from '../../utils/excalidraw-validator.js';
import { handleNotesList } from './notes.list.js';
import { createJsonContent, createTextContent, type NotesAddRequest, type NotesDeleteRequest, type NotesGetRequest, type NotesGetSpecBundleRequest, type NotesListRequest, type NotesToolRequest, type NotesUpdateRequest } from '../types/contracts.js';

export async function handleNotesTools(request: NotesToolRequest) {
  const projectInfo = await projectManager.getProject(request.project);
  if (!projectInfo) throw new Error(`Project not found: ${request.project}`);

  if (request.action === 'list') {
    return await handleNotesList(request as NotesListRequest);
  }

  switch (request.action) {
    case 'help': {
      const { HelpService } = await import('../../features/help/services/HelpService.js');
      const pack = HelpService.get('notes');
      return { content: [createJsonContent(pack)] };
    }
    case 'add': {
      const { title, content, note_type, entity_links, stable_tags, parent_id } = request as NotesAddRequest;
      if (!content) throw new Error('Content is required for add action');
      const { processedContent, isValid, error } = processExcalidrawContent(content, note_type || 'note');
      if (note_type === 'excalidraw' && !isValid) {
        return { content: [createTextContent(`Error: ${error}\n\nFor excalidraw notes, content must be valid Excalidraw JSON.`)] };
      }
      const newNote = await projectInfo.codeIndexer.addNote({
        title,
        content: processedContent,
        note_type: note_type || 'note',
        entity_links: entity_links || [],
        stable_tags: stable_tags || [],
        parent_id
      } as any);
      return { content: [createTextContent(`Note added with ID: ${newNote.id}`)] };
    }
    case 'get_spec_bundle': {
      const { task_id, compact = true } = request as NotesGetSpecBundleRequest;
      if (!task_id) throw new Error('Task ID is required for get_spec_bundle');
      const task = await projectInfo.codeIndexer.getTask(task_id);
      if (!task) throw new Error(`Task not found: ${task_id}`);
      const reverseNotes = await projectInfo.codeIndexer.listNotes({ entity_type: 'task' as any, entity_id: task_id, limit: 200 } as any);
      const noteMap: Record<string, any> = {};
      for (const n of reverseNotes) noteMap[n.id] = n;
      const directNoteIds = ((task as any).entity_links || [])
        .filter((l: any) => (l.entity_type as string) === 'note')
        .map((l: any) => String(l.entity_id));
      for (const id of directNoteIds) {
        if (!noteMap[id]) {
          const n = await projectInfo.codeIndexer.getNote(id);
          if (n) noteMap[n.id] = n;
        }
      }
      const notes = Object.values(noteMap);
      const CONTENT_LIMIT = 2000;
      const compactNotes = notes.map((n: any) => {
        const base = { id: n.id, title: n.title, note_type: n.note_type, stable_tags: n.stable_tags, entity_links: n.entity_links } as any;
        const c: string = n.content || '';
        if (!compact) return { ...base, content: c };
        if (c && c.length <= CONTENT_LIMIT) return { ...base, content: c };
        return { ...base, content_excerpt: c ? c.slice(0, CONTENT_LIMIT) : '', content_size: c ? c.length : 0 };
      });
      const children = await projectInfo.codeIndexer.listTasks({ parent_id: task_id } as any);
      const subtasks = (children || []).map((t: any) => ({ id: t.id, title: t.title, task_type: t.task_type, task_status: t.task_status, spec_state: (t as any).spec_state || 'draft' }));
      const { WorkflowService } = await import('../../features/workflows/services/WorkflowService.js');
      const wfSvc = new WorkflowService((projectInfo.codeIndexer as any).dbManager);
      const validation = await wfSvc.validate(task as any, (task as any).workflow);
      const { GuidanceService } = await import('../../features/workflows/services/GuidanceService.js');
      const gsvc = new GuidanceService((projectInfo.codeIndexer as any).dbManager);
      const guidance = await gsvc.build(task as any);
      const payload = {
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          task_type: task.task_type,
          task_status: task.task_status,
          task_priority: task.task_priority,
          workflow: (task as any).workflow,
          spec_state: (task as any).spec_state || 'draft',
          stable_tags: (task as any).stable_tags,
          entity_links: (task as any).entity_links,
          checklists: (task as any).checklists || []
        },
        notes: compactNotes,
        subtasks,
        waivers: (task as any).spec_waivers || [],
        validation,
        guidance
      };
      return { content: [createJsonContent(payload)] };
    }
    case 'get': {
      const { note_id } = request as NotesGetRequest;
      if (!note_id) throw new Error('Note ID is required for get action');
      const note = await projectInfo.codeIndexer.getNote(note_id);
      if (!note) throw new Error(`Note not found: ${note_id}`);
      return { content: [createJsonContent(note)] };
    }
    case 'update': {
      const { note_id, title: newTitle, content: newContent, note_type: newNoteType, stable_tags: newTags, entity_links, parent_id } = request as NotesUpdateRequest & Record<string, unknown>;
      if (!note_id) throw new Error('Note ID is required for update action');
      let processedContent = newContent;
      if (newContent && newNoteType === 'excalidraw') {
        const { processedContent: processed, isValid, error } = processExcalidrawContent(newContent, newNoteType);
        if (!isValid) return { content: [createTextContent(`Error: ${error}\n\nFor excalidraw notes, content must be valid Excalidraw JSON.`)] };
        processedContent = processed;
      }
      await projectInfo.codeIndexer.updateNote(note_id, { title: newTitle, content: processedContent, note_type: newNoteType, stable_tags: newTags, entity_links, parent_id } as any);
      return { content: [createTextContent(`Note ${note_id} updated successfully`)] };
    }
    case 'delete': {
      const { note_id } = request as NotesDeleteRequest;
      if (!note_id) throw new Error('Note ID is required for delete action');
      await projectInfo.codeIndexer.deleteNote(note_id);
      return { content: [createTextContent(`Note ${note_id} deleted successfully`)] };
    }
    default:
      throw new Error(`Unknown notes action: ${(request as { action: string }).action}`);
  }
}
