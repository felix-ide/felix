import { DocumentPreview } from './DocumentPreview';

// Example usage of the DocumentPreview components

export function PreviewExample() {
  // Example Mermaid diagram content
  const mermaidContent = `graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    C --> D[Rethink]
    D --> B
    B ---->|No| E[End]`;

  // Example Excalidraw content (simplified)
  const excalidrawContent = JSON.stringify({
    elements: [
      {
        id: "id1",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        backgroundColor: "#a5d8ff",
        strokeColor: "#1e1e1e",
        strokeWidth: 2
      }
    ],
    appState: {
      viewBackgroundColor: "#ffffff"
    }
  });

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold mb-4">Document Preview Examples</h2>
      
      {/* Thumbnail Gallery */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Thumbnail Previews</h3>
        <div className="flex gap-4">
          <DocumentPreview
            content={mermaidContent}
            type="mermaid"
            title="Flow Diagram"
            size="sm"
          />
          
          <DocumentPreview
            content={excalidrawContent}
            type="excalidraw"
            title="Mockup Design"
            size="sm"
          />
          
          <DocumentPreview
            content="/path/to/image.png"
            type="image"
            title="Screenshot"
            size="sm"
          />
        </div>
      </div>

      {/* Medium Sized Previews */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Medium Previews (Default)</h3>
        <div className="flex gap-4">
          <DocumentPreview
            content={mermaidContent}
            type="mermaid"
            title="Architecture Diagram"
            metadata={{
              fileName: "architecture.mmd",
              createdAt: new Date().toISOString()
            }}
          />
          
          <DocumentPreview
            content={excalidrawContent}
            type="excalidraw"
            title="UI Mockup"
            metadata={{
              fileName: "ui-design.excalidraw",
              updatedAt: new Date().toISOString()
            }}
          />
        </div>
      </div>

      {/* Large Expandable Preview */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Large Expandable Preview</h3>
        <DocumentPreview
          content={mermaidContent}
          type="mermaid"
          title="System Architecture"
          size="lg"
          className="mx-auto"
          metadata={{
            fileName: "system-architecture.mmd",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date().toISOString()
          }}
        />
      </div>

      {/* Document Preview */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Document Preview</h3>
        <div className="flex gap-4">
          <DocumentPreview
            content="This is the document content..."
            type="document"
            title="Project README"
            size="md"
            metadata={{
              fileName: "README.md"
            }}
          />
        </div>
      </div>

      {/* Custom Usage Example */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Custom Integration</h3>
        <div className="border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-4">
            Click any preview to open in full-screen modal. Use expand button to toggle inline expansion.
          </p>
          <DocumentPreview
            content={mermaidContent}
            type="mermaid"
            title="Interactive Diagram"
            onExpand={() => console.log('Custom expand handler')}
          />
        </div>
      </div>
    </div>
  );
}