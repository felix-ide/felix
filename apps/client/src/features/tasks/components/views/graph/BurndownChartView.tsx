import { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { TaskData } from '@/types/api';
// cn not needed here

interface BurndownChartViewProps {
  tasks: TaskData[];
  onTaskClick?: (task: TaskData) => void;
}

export function BurndownChartView({ tasks }: BurndownChartViewProps) {
  // Calculate effort statistics
  const effortStats = useMemo(() => {
    const stats = {
      totalEstimated: 0,
      totalActual: 0,
      byStatus: {
        todo: { estimated: 0, actual: 0, count: 0 },
        in_progress: { estimated: 0, actual: 0, count: 0 },
        blocked: { estimated: 0, actual: 0, count: 0 },
        done: { estimated: 0, actual: 0, count: 0 }
      },
      byType: {} as Record<string, { estimated: number; actual: number; count: number }>,
      byPriority: {} as Record<string, { estimated: number; actual: number; count: number }>,
      byAssignee: {} as Record<string, { estimated: number; actual: number; count: number }>
    };

    tasks.forEach(task => {
      const estimated = parseFloat(task.estimated_effort?.replace(/[^\d.]/g, '') || '0');
      const actual = parseFloat(task.actual_effort?.replace(/[^\d.]/g, '') || '0');
      
      stats.totalEstimated += estimated;
      stats.totalActual += actual;
      
      // By status
      const status = task.task_status || 'todo';
      if (stats.byStatus[status as keyof typeof stats.byStatus]) {
        stats.byStatus[status as keyof typeof stats.byStatus].estimated += estimated;
        stats.byStatus[status as keyof typeof stats.byStatus].actual += actual;
        stats.byStatus[status as keyof typeof stats.byStatus].count += 1;
      }
      
      // By type
      const type = task.task_type || 'task';
      if (!stats.byType[type]) {
        stats.byType[type] = { estimated: 0, actual: 0, count: 0 };
      }
      stats.byType[type].estimated += estimated;
      stats.byType[type].actual += actual;
      stats.byType[type].count += 1;
      
      // By priority
      const priority = task.task_priority || 'medium';
      if (!stats.byPriority[priority]) {
        stats.byPriority[priority] = { estimated: 0, actual: 0, count: 0 };
      }
      stats.byPriority[priority].estimated += estimated;
      stats.byPriority[priority].actual += actual;
      stats.byPriority[priority].count += 1;
      
      // By assignee
      if (task.assigned_to) {
        if (!stats.byAssignee[task.assigned_to]) {
          stats.byAssignee[task.assigned_to] = { estimated: 0, actual: 0, count: 0 };
        }
        stats.byAssignee[task.assigned_to].estimated += estimated;
        stats.byAssignee[task.assigned_to].actual += actual;
        stats.byAssignee[task.assigned_to].count += 1;
      }
    });

    return stats;
  }, [tasks]);

  // Prepare data for charts
  const statusData = Object.entries(effortStats.byStatus).map(([status, data]) => ({
    name: status.replace('_', ' ').toUpperCase(),
    estimated: data.estimated,
    actual: data.actual,
    remaining: Math.max(0, data.estimated - data.actual),
    count: data.count
  }));

  const priorityData = Object.entries(effortStats.byPriority).map(([priority, data]) => ({
    name: priority.toUpperCase(),
    value: data.estimated,
    actual: data.actual,
    count: data.count
  }));

  const typeData = Object.entries(effortStats.byType).map(([type, data]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    estimated: data.estimated,
    actual: data.actual,
    count: data.count
  }));

  const assigneeData = Object.entries(effortStats.byAssignee)
    .sort((a, b) => b[1].estimated - a[1].estimated)
    .slice(0, 10)
    .map(([assignee, data]) => ({
      name: assignee,
      estimated: data.estimated,
      actual: data.actual,
      completion: data.estimated > 0 ? (data.actual / data.estimated) * 100 : 0,
      count: data.count
    }));

  // Calculate burndown data (simulated over last 30 days)
  const burndownData = useMemo(() => {
    const totalWork = effortStats.totalEstimated;
    const completedWork = tasks
      .filter(t => t.task_status === 'done')
      .reduce((sum, t) => sum + parseFloat(t.estimated_effort?.replace(/[^\d.]/g, '') || '0'), 0);
    
    const days = 30;
    const data = [];
    
    for (let i = 0; i <= days; i++) {
      const progress = i / days;
      const ideal = totalWork * (1 - progress);
      const actual = totalWork - (completedWork * progress * 1.2); // Simulate some variance
      
      data.push({
        day: i,
        ideal: Math.round(ideal),
        actual: Math.round(Math.max(0, actual + (Math.random() - 0.5) * 20)),
        date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString()
      });
    }
    
    return data;
  }, [tasks, effortStats]);

  const COLORS = {
    todo: '#6b7280',
    in_progress: '#3b82f6',
    blocked: '#ef4444',
    done: '#10b981',
    critical: '#ef4444',
    high: '#f97316',
    medium: '#3b82f6',
    low: '#6b7280'
  };

  return (
    <div className="h-full overflow-auto bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Project Analytics</h2>
          <p className="text-muted-foreground mt-1">
            Burndown charts and effort analysis for {tasks.length} tasks
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Estimated</div>
            <div className="text-2xl font-bold text-foreground">{effortStats.totalEstimated}h</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Actual</div>
            <div className="text-2xl font-bold text-foreground">{effortStats.totalActual}h</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Remaining</div>
            <div className="text-2xl font-bold text-orange-500">
              {Math.max(0, effortStats.totalEstimated - effortStats.totalActual)}h
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Completion</div>
            <div className="text-2xl font-bold text-green-500">
              {effortStats.totalEstimated > 0 
                ? Math.round((effortStats.totalActual / effortStats.totalEstimated) * 100) 
                : 0}%
            </div>
          </div>
        </div>

        {/* Burndown Chart */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Burndown Chart</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={burndownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="ideal" 
                stroke="#6b7280" 
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                name="Ideal"
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
                name="Actual"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Effort by Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="actual" fill="#3b82f6" name="Actual Hours" />
                <Bar dataKey="remaining" fill="#e5e7eb" name="Remaining Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Tasks by Priority</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, count }: any) => `${name}: ${count} tasks`}
                >
                  {priorityData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || '#6b7280'} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value: number) => `${value}h`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Type Distribution */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Effort by Task Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Bar dataKey="estimated" fill="#e5e7eb" name="Estimated" />
              <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Team Performance */}
        {assigneeData.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Team Performance</h3>
            <div className="space-y-3">
              {assigneeData.map(member => (
                <div key={member.name} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium truncate">{member.name}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-xs text-muted-foreground">
                        {member.actual}h / {member.estimated}h
                      </div>
                      <div className="text-xs font-medium">
                        {Math.round(member.completion)}%
                      </div>
                    </div>
                    <div className="w-full bg-gray-200  rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, member.completion)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {member.count} tasks
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
