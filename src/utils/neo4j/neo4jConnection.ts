// src/utils/neo4j/neo4jConnection.ts
import { Driver, Session, auth, driver as createDriver } from 'neo4j-driver';

/**
 * Class to manage Neo4j database connections
 * Implemented as a singleton to ensure only one connection is active
 */
export class Neo4jConnection {
  private static instance: Neo4jConnection;
  private driver: Driver | null = null;
  private _database: string = 'neo4j';
  
  // Private constructor to prevent direct instantiation
  private constructor() {}
  
  /**
   * Get singleton instance of Neo4jConnection
   */
  public static getInstance(): Neo4jConnection {
    if (!Neo4jConnection.instance) {
      Neo4jConnection.instance = new Neo4jConnection();
    }
    return Neo4jConnection.instance;
  }
  
  /**
   * Connect to Neo4j database
   * @param uri Neo4j connection URI (e.g. bolt://localhost:7687)
   * @param username Neo4j username
   * @param password Neo4j password
   * @param database Neo4j database name (default: neo4j)
   * @returns boolean indicating if connection was successful
   */
  public connect(uri: string, username: string, password: string, database: string = 'neo4j'): boolean {
    try {
      // Close existing connection if there is one
      if (this.driver) {
        this.close();
      }
      
      // Create new driver
      this.driver = createDriver(uri, auth.basic(username, password), {
        maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
      });
      
      // Store the database name
      this._database = database;
      
      return true;
    } catch (error) {
      console.error('Error connecting to Neo4j:', error);
      return false;
    }
  }
  
  /**
   * Check if connection is established
   * @returns boolean indicating if connected
   */
  public isConnected(): boolean {
    return this.driver !== null;
  }
  
  /**
   * Get Neo4j session
   * @param database Optional database name (overrides default)
   * @returns Neo4j session or null if not connected
   */
  public getSession(database?: string): Session | null {
    if (!this.driver) {
      return null;
    }
    
    return this.driver.session({ 
      database: database || this._database,
      defaultAccessMode: 'WRITE'
    });
  }
  
  /**
   * Run Cypher query
   * @param query Cypher query string
   * @param params Parameters for the query
   * @param database Optional database name
   * @returns Query result
   */
  public async runQuery(query: string, params = {}, database?: string): Promise<any> {
    const session = this.getSession(database);
    if (!session) {
      throw new Error('Not connected to Neo4j');
    }
    
    try {
      const result = await session.run(query, params);
      return result;
    } finally {
      await session.close();
    }
  }
  
  /**
   * Verify connection by running a simple query
   * @returns Promise resolving to true if connected
   */
  public async verifyConnection(): Promise<boolean> {
    try {
      const result = await this.runQuery('RETURN 1 as n');
      return result && result.records && result.records.length > 0;
    } catch (error) {
      console.error('Connection verification failed:', error);
      return false;
    }
  }
  
  /**
   * Get database information (version, edition, etc.)
   * @returns Database info object or null if not connected
   */
  public async getDatabaseInfo(): Promise<any | null> {
    if (!this.isConnected()) return null;
    
    try {
      const result = await this.runQuery('CALL dbms.components() YIELD name, versions, edition RETURN name, versions, edition');
      if (result && result.records && result.records.length > 0) {
        const record = result.records[0];
        return {
          name: record.get('name'),
          version: record.get('versions')[0],
          edition: record.get('edition')
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get database info:', error);
      return null;
    }
  }
  
  /**
   * Check if vector search capabilities are available
   * @returns Promise resolving to boolean
   */
  public async hasVectorCapabilities(): Promise<boolean> {
    if (!this.isConnected()) return false;
    
    try {
      // Check if vector index can be created (Neo4j 5.13+)
      const result = await this.runQuery(`
        SHOW INDEXES YIELD * 
        WHERE type = 'VECTOR' 
        RETURN count(*) as count
      `);
      
      return result && result.records && result.records[0].get('count') >= 0;
    } catch (error) {
      // If query fails, vector capabilities are not available
      return false;
    }
  }
  
  /**
   * Get list of available databases
   * @returns Array of database names
   */
  public async getDatabases(): Promise<string[]> {
    if (!this.isConnected()) return [];
    
    try {
      const result = await this.runQuery('SHOW DATABASES YIELD name RETURN name');
      if (result && result.records) {
        return result.records.map((record: any) => record.get('name'));
      }
      return [];
    } catch (error) {
      console.error('Failed to get databases:', error);
      return [];
    }
  }
  
  /**
   * Close connection
   */
  public close(): void {
    if (this.driver) {
      this.driver.close();
      this.driver = null;
    }
  }
  
  /**
   * Get current database name
   */
  public get database(): string {
    return this._database;
  }
}

export const neo4jConnection = Neo4jConnection.getInstance();