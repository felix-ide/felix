import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@client/shared/ui/Card';
import { Button } from '@client/shared/ui/Button';
import { RefreshCw, Download, Trash2 } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}

export function ServerLogSection() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);

  // Mock log entries for now
  useEffect(() => {
    const mockLogs: LogEntry[] = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'MCP server started on port 3001',
        source: 'server',
      },
      {
        id: '2',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Web UI connected',
        source: 'mcp',
      },
      {
        id: '3',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Project indexing completed successfully',
        source: 'indexer',
      },
    ];
    setLogs(mockLogs);
  }, []);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'debug':
        return 'text-muted-foreground';
      default:
        return 'text-green-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="h-full flex flex-col p-4">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Server Logs</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <div className="h-full overflow-auto bg-background p-4 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">
                No logs available. Start Felix server to stream logs.
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <span className="text-muted-foreground text-xs min-w-[80px]">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span className={`text-xs min-w-[50px] uppercase ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                    {log.source && (
                      <span className="text-muted-foreground text-xs min-w-[60px]">
                        [{log.source}]
                      </span>
                    )}
                    <span className="text-foreground flex-1">
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
