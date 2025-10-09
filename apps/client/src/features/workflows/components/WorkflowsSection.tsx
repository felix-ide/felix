import { useWorkflowsSectionState } from './workflows-section/hooks/useWorkflowsSectionState';
import { WorkflowsSectionHeader } from './workflows-section/WorkflowsSectionHeader';
import { WorkflowEditTab } from './workflows-section/WorkflowEditTab';
import { WorkflowValidateTab } from './workflows-section/WorkflowValidateTab';
import { WorkflowConfigTab } from './workflows-section/WorkflowConfigTab';
import { NewWorkflowDialog } from './workflows-section/NewWorkflowDialog';
import type { WorkflowDefinition } from '@client/features/workflows/components/WorkflowForm';

export function WorkflowsSection() {
  const {
    tab,
    setTab,
    filteredItems,
    selected,
    searchQuery,
    setSearchQuery,
    handleSelect,
    handleNew,
    editorSection,
    setEditorSection,
    configPanel,
    setConfigPanel,
    parseOk,
    name,
    displayName,
    description,
    error,
    bindField,
    editor,
    onEditorChange,
    form,
    setForm,
    setParseOk,
    setDirty,
    dirty,
    handleDelete,
    handleSave,
    getWorkflowIcon,
    getSectionIcon,
    showNewDialog,
    newWorkflowName,
    setNewWorkflowName,
    createNewWorkflow,
    setShowNewDialog,
    items,
    validation,
    setValidation,
    selectedTaskId,
    setSelectedTaskId,
    tasks,
    runValidation,
    configSection,
    setConfigSection,
    defaultWf,
    updateDefaultWorkflow,
    enforceMapping,
    toggleEnforceMapping,
    mappingKey,
    setMappingKey,
    restoreBuiltInWorkflows,
    exportSnapshot,
    importSnapshot,
    statusHints,
    statusPresets,
    statusCatalog,
    statusFlows,
    saveStatus,
    removeStatus,
    saveStatusFlow,
    removeStatusFlow,
  } = useWorkflowsSectionState();

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleFormChange = (next: WorkflowDefinition) => {
    setForm(next);
    setParseOk(true);
    setDirty(true);
  };

  const handleTemplateSelect = (template: string) => {
    void handleSelect(template);
  };

  const handleValidationWorkflowSelect = (workflow: WorkflowDefinition) => {
    setForm(workflow);
  };

  const handleRestoreBuiltIns = () => {
    if (!confirm('This will overwrite the built-in workflows. Continue?')) {
      return;
    }
    void restoreBuiltInWorkflows();
  };

  return (
    <div className="h-full flex flex-col">
      <WorkflowsSectionHeader tab={tab} onTabChange={setTab} />

      <div className="flex-1 flex overflow-hidden">
        {tab === 'edit' && (
          <WorkflowEditTab
            filteredItems={filteredItems}
            selected={selected as WorkflowDefinition | null}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onSelectWorkflow={(name) => void handleSelect(name)}
            onNewWorkflow={handleNew}
            editorSection={editorSection}
            onEditorSectionChange={setEditorSection}
            configPanel={configPanel}
            onConfigPanelChange={setConfigPanel}
            error={error}
            parseOk={parseOk}
            name={name}
            displayName={displayName}
            description={description}
            onFieldChange={bindField}
            editorValue={editor}
            onEditorChange={onEditorChange}
            form={form}
            onFormChange={handleFormChange}
            dirty={dirty}
            onDelete={() => void handleDelete()}
            onSave={() => void handleSave()}
            getWorkflowIcon={getWorkflowIcon}
            getSectionIcon={getSectionIcon}
            onTemplateSelect={handleTemplateSelect}
            statusHints={statusHints}
            statePresets={statusPresets}
            statusCatalog={statusCatalog}
            statusFlows={statusFlows}
          />
        )}

        {tab === 'validate' && (
          <WorkflowValidateTab
            items={items}
            form={form}
            onFormSelect={handleValidationWorkflowSelect}
            getWorkflowIcon={getWorkflowIcon}
            validation={validation}
            clearValidation={() => setValidation(null)}
            selectedTaskId={selectedTaskId}
            onTaskChange={setSelectedTaskId}
            tasks={tasks}
            runValidation={() => void runValidation()}
          />
        )}

        {tab === 'mapping' && (
          <WorkflowConfigTab
            configSection={configSection}
            onConfigSectionChange={setConfigSection}
            defaultWorkflow={defaultWf}
            items={items}
            updateDefaultWorkflow={(name) => void updateDefaultWorkflow(name)}
            enforceMapping={enforceMapping}
            toggleEnforceMapping={() => void toggleEnforceMapping()}
            mappingKey={mappingKey}
            onReloadMapping={() => setMappingKey((key) => key + 1)}
            restoreBuiltInWorkflows={handleRestoreBuiltIns}
            exportSnapshot={(filePath) => void exportSnapshot(filePath)}
            importSnapshot={(options) => void importSnapshot(options)}
            statusCatalog={statusCatalog}
            statusFlows={statusFlows}
            onSaveStatus={saveStatus}
            onDeleteStatus={removeStatus}
            onSaveStatusFlow={saveStatusFlow}
            onDeleteStatusFlow={removeStatusFlow}
          />
        )}
      </div>

      <NewWorkflowDialog
        visible={showNewDialog}
        name={newWorkflowName}
        onNameChange={setNewWorkflowName}
        onClose={() => setShowNewDialog(false)}
        onCreate={createNewWorkflow}
      />
    </div>
  );
}
