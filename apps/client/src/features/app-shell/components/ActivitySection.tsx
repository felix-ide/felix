import { Card, CardHeader, CardTitle, CardContent } from '@client/shared/ui/Card';
import { Activity } from 'lucide-react';

export function ActivitySection() {
  return (
    <div className="h-full p-4">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="h-full">
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Real-time activity feed will be implemented here</p>
            <p className="text-sm">Live collaboration indicators coming in Phase 4</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}