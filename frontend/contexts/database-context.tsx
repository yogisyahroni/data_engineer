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

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch databases from API
  useEffect(() => {
    const fetchDatabases = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/connections');
        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            // Map API connections to Database interface if needed
            // Assuming API returns compatible structure or we adapt easily
            const mappedDbs: Database[] = result.data.map((conn: any) => ({
              id: conn.id,
              name: conn.name,
              type: conn.type,
              host: conn.host || 'localhost', // transform if needed
              port: conn.port || 5432,
              database: conn.database || '',
              username: conn.username || '',
              status: conn.isActive ? 'connected' : 'disconnected',
              lastSync: conn.updatedAt || new Date().toISOString(),
              createdAt: conn.createdAt || new Date().toISOString(),
            }));
            setDatabases(mappedDbs);
            // Select first one if none selected and dbs exist
            if (mappedDbs.length > 0 && !selectedDatabase) {
              setSelectedDatabase(mappedDbs[0]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch databases:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatabases();
    // Re-fetch every 30s or on mount
    const interval = setInterval(fetchDatabases, 30000);
    return () => clearInterval(interval);
  }, []); // Connection list shouldn't depend on too many things to avoid loops.

  // Save to localStorage whenever databases change (Persist selection/cache if needed, though we rely on API now)
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
