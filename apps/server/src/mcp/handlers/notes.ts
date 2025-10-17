import { projectManager } from '../project-manager.js';
import { processExcalidrawContent } from '../../utils/excalidraw-validator.js';
import { handleNotesList } from './notes.list.js';
import { createJsonContent, createTextContent, type NotesAddRequest, type NotesDeleteRequest, type NotesGetRequest, type NotesGetSpecBundleRequest, type NotesListRequest, type NotesToolRequest, type NotesUpdateRequest } from '../types/contracts.js';

export async function handleNotesTools(request: any) {
  const projectInfo = await projectManager.getProject(request.project);
  if (!projectInfo) throw new Error(`Project not found: ${request.project}`);

  const action = request.action;

  if (action === 'list' || action === 'search') {
    return await handleNotesList(request as NotesListRequest);
  }

  switch (action) {
    case 'create': {
      const { title, content, note_type, entity_links, stable_tags, parent_id, kb_template } = request as NotesAddRequest & { kb_template?: string };

      // Handle KB template creation
      if (kb_template) {
        const { KBBuilder } = await import('../../features/knowledge-base/KBBuilder.js');
        const { DatabaseManager } = await import('../../features/storage/DatabaseManager.js');

        const dbManager = DatabaseManager.getInstance(request.project);
        await dbManager.initialize();
        const notesRepo = dbManager.getNotesRepository();
        const rulesRepo = dbManager.getRulesRepository();
        const metadataDataSource = dbManager.getMetadataDataSource();
        const kbBuilder = new KBBuilder(notesRepo, rulesRepo, metadataDataSource);

        // Create KB from template
        const result = await kbBuilder.buildFromTemplate(
          request.project,
          kb_template,
          parent_id,
          title // Use title as custom KB name if provided
        );

        return { content: [createTextContent(`Knowledge Base created from template '${kb_template}':\n- KB ID: ${result.kbId}\n- Root Note ID: ${result.rootId}\n- Created ${result.createdNodes} nodes\n\nUse kb_ids=['${result.kbId}'] to filter searches and notes to this KB.`)] };
      }

      // Regular note creation
      if (!content) throw new Error('Content is required for create action (unless using kb_template)');
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
      throw new Error(`Unknown notes action: ${action}`);
  }
}
