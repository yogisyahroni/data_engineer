'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface Database {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'snowflake' | 'bigquery';
  host: string;
  port: number;
  database: string;
  username: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  createdAt: string;
}

interface DatabaseContextType {
  databases: Database[];
  selectedDatabase: Database | null;
  setSelectedDatabase: (db: Database | null) => void;
  addDatabase: (db: Database) => void;
  updateDatabase: (id: string, db: Partial<Database>) => void;
  deleteDatabase: (id: string) => void;
  testConnection: (db: Database) => Promise<boolean>;
  isLoading: boolean;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

const DEFAULT_DATABASES: Database[] = [
  {
    id: 'sample_pg',
    name: 'Sample Database',
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'sample_db',
    username: 'postgres',
    status: 'connected',
    lastSync: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [databases, setDatabases] = useState<Database[]>(DEFAULT_DATABASES);
  const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(DEFAULT_DATABASES[0]);
  const [isLoading, setIsLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('insight_databases');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDatabases(parsed);
        if (parsed.length > 0) {
          setSelectedDatabase(parsed[0]);
        }
      } catch (err) {
        console.error('Failed to load databases from localStorage', err);
      }
    }
  }, []);

  // Save to localStorage whenever databases change
  useEffect(() => {
    localStorage.setItem('insight_databases', JSON.stringify(databases));
  }, [databases]);

  const addDatabase = useCallback((db: Database) => {
    setDatabases((prev) => [...prev, db]);
  }, []);

  const updateDatabase = useCallback((id: string, updates: Partial<Database>) => {
    setDatabases((prev) =>
      prev.map((db) => (db.id === id ? { ...db, ...updates } : db))
    );
  }, []);

  const deleteDatabase = useCallback((id: string) => {
    setDatabases((prev) => prev.filter((db) => db.id !== id));
    if (selectedDatabase?.id === id) {
      setSelectedDatabase(null);
    }
  }, [selectedDatabase]);

  const testConnection = useCallback(async (db: Database): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Simulate API call to test connection
      const response = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(db),
      });

      const isConnected = response.ok;
      updateDatabase(db.id, {
        status: isConnected ? 'connected' : 'error',
        lastSync: new Date().toISOString(),
      });

      return isConnected;
    } catch (error) {
      console.error('Connection test failed:', error);
      updateDatabase(db.id, { status: 'error' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [updateDatabase]);

  return (
    <DatabaseContext.Provider
      value={{
        databases,
        selectedDatabase,
        setSelectedDatabase,
        addDatabase,
        updateDatabase,
        deleteDatabase,
        testConnection,
        isLoading,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return context;
}
