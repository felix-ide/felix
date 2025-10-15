import { useState } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Database {
  type: string;
  host: string;
  port: string;
  name: string;
  username: string;
  password: string;
  role: string;
}

interface KBDatabaseConfigProps {
  databases: Database[];
  onChange: (databases: Database[]) => void;
}

const DB_TYPES = ['PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis', 'MariaDB', 'Oracle', 'MSSQL', 'Cassandra', 'DynamoDB'];

export function KBDatabaseConfig({ databases, onChange }: KBDatabaseConfigProps) {
  const handleAdd = () => {
    onChange([
      ...databases,
      {
        type: '',
        host: 'localhost',
        port: '',
        name: '',
        username: '',
        password: '',
        role: ''
      }
    ]);
  };

  const handleRemove = (index: number) => {
    onChange(databases.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof Database, value: string) => {
    const updated = databases.map((db, i) =>
      i === index ? { ...db, [field]: value } : db
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">
          Databases
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="h-7 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Database
        </Button>
      </div>

      {databases.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-2">
          No databases configured. Click "Add Database" to add one.
        </p>
      ) : (
        <div className="space-y-3">
          {databases.map((db, idx) => (
            <div key={idx} className="border border-border rounded-lg p-3 bg-muted/5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Database {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="text-destructive hover:text-destructive/80 transition-colors"
                  title="Remove database"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Type and Role */}
                <div>
                  <label className="block text-xs font-medium mb-1">Type *</label>
                  <select
                    value={db.type}
                    onChange={(e) => handleChange(idx, 'type', e.target.value)}
                    className="w-full h-8 px-2 py-1 text-xs border border-border rounded-md bg-background"
                  >
                    <option value="">-- Select --</option>
                    {DB_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Role *</label>
                  <Input
                    type="text"
                    value={db.role}
                    onChange={(e) => handleChange(idx, 'role', e.target.value)}
                    placeholder="e.g., Main DB, Metadata, Cache"
                    className="h-8 text-xs"
                  />
                </div>

                {/* Host and Port */}
                <div>
                  <label className="block text-xs font-medium mb-1">Host</label>
                  <Input
                    type="text"
                    value={db.host}
                    onChange={(e) => handleChange(idx, 'host', e.target.value)}
                    placeholder="localhost"
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Port</label>
                  <Input
                    type="text"
                    value={db.port}
                    onChange={(e) => handleChange(idx, 'port', e.target.value)}
                    placeholder="5432, 3306, etc"
                    className="h-8 text-xs"
                  />
                </div>

                {/* Database Name */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Database Name</label>
                  <Input
                    type="text"
                    value={db.name}
                    onChange={(e) => handleChange(idx, 'name', e.target.value)}
                    placeholder="myapp_dev"
                    className="h-8 text-xs"
                  />
                </div>

                {/* Username and Password */}
                <div>
                  <label className="block text-xs font-medium mb-1">Username</label>
                  <Input
                    type="text"
                    value={db.username}
                    onChange={(e) => handleChange(idx, 'username', e.target.value)}
                    placeholder="postgres, root"
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Password</label>
                  <Input
                    type="text"
                    value={db.password}
                    onChange={(e) => handleChange(idx, 'password', e.target.value)}
                    placeholder="Dev credentials only"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
