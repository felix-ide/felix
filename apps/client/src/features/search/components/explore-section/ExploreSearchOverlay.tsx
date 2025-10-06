import { Button } from '@client/shared/ui/Button';
import { AlertCircle, Copy, Loader2, Search, X } from 'lucide-react';
import type { GuardrailInfo } from '@client/shared/api/searchClient';
import type { SearchResult } from './types';
type ReactCSSProperties = import('react').CSSProperties;

interface ExploreSearchOverlayProps {
  visible: boolean;
  onClose: () => void;
  searchResults: SearchResult[];
  searchError: string | null;
  isSearching: boolean;
  totalResults: number;
  guardrailInfo: GuardrailInfo | null;
  getItemIcon: (type: string) => React.ComponentType<{ className?: string }>;
  getItemTypeColor: (type: string) => ReactCSSProperties;
  addToWorkingSet: (result: SearchResult) => void;
}

export function ExploreSearchOverlay({
  visible,
  onClose,
  searchResults,
  searchError,
  isSearching,
  totalResults,
  guardrailInfo,
  getItemIcon,
  getItemTypeColor,
  addToWorkingSet,
}: ExploreSearchOverlayProps) {
  if (!visible) return null;

  const removedByGuardrails = guardrailInfo?.removedCount ?? 0;
  const similarityFiltered = guardrailInfo?.similarityFiltered ?? 0;
  const pathFiltered = guardrailInfo?.pathFiltered ?? 0;

  return (
    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-medium">
            Search Results
            {(totalResults > 0 || removedByGuardrails > 0) && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                Showing {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
                {totalResults > searchResults.length && ` of ${totalResults}`}
              </span>
            )}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {searchError ? (
            <div className="flex items-center gap-2 p-4 text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{searchError}</span>
            </div>
          ) : (
            <>
              {removedByGuardrails > 0 && (
                <div className="mb-4 p-3 text-xs text-orange-600 bg-orange-500/10 rounded-md flex flex-col gap-1">
                  <span className="font-medium">Guardrails applied</span>
                  <span>Filtered {removedByGuardrails} item{removedByGuardrails === 1 ? '' : 's'} hidden from results.</span>
                  <span className="text-orange-700 dark:text-orange-300">
                    {pathFiltered > 0 && `${pathFiltered} coverage/build artifacts hidden.`}
                    {pathFiltered > 0 && similarityFiltered > 0 && ' '}
                    {similarityFiltered > 0 && `${similarityFiltered} low-similarity matches removed.`}
                  </span>
                </div>
              )}

              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((result) => {
                    const ItemIcon = getItemIcon(result.type);
                    return (
                      <div
                        key={result.id}
                        onClick={() => addToWorkingSet(result)}
                        className="p-4 border border-border rounded-lg transition-colors hover:bg-accent/30 cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-md flex-shrink-0" style={getItemTypeColor(result.type)}>
                            <ItemIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{result.name}</h4>
                              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                {result.type}
                              </span>
                              {result.score !== undefined && (
                                <span className="text-xs text-muted-foreground">
                                  Score: {(result.score * 100).toFixed(0)}%
                                </span>
                              )}
                              <button
                                title="Copy ID"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigator.clipboard.writeText(result.id).catch(() => {});
                                }}
                                className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border text-xs hover:bg-accent"
                              >
                                <Copy className="h-3 w-3" />
                                Copy ID
                              </button>
                            </div>
                            {result.filePath && (
                              <p className="text-xs text-muted-foreground mb-1">{result.filePath}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground truncate">ID: {result.id}</p>
                            {result.snippet && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{result.snippet}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {totalResults > searchResults.length && removedByGuardrails === 0 && (
                    <div className="mt-4 text-center">
                      <Button variant="outline" disabled className="w-full">
                        {totalResults - searchResults.length} more results available (pagination coming soon)
                      </Button>
                    </div>
                  )}
                </div>
              ) : isSearching ? (
                <div className="flex flex-col items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">Searching...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2" />
                  <p>No results found</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
