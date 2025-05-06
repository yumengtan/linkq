import { Record } from 'neo4j-driver';
import { neo4jConnection } from './neo4jConnection';
import { SparqlResultsJsonType } from 'types/sparql';

export interface CypherResult {
  records: Record[];
  summary: {
    query: string;
    parameters: any;
    counters: any;
  };
}

export interface FormattedCypherResult {
  columns: string[];
  rows: any[][];
  summary: {
    query: string;
    parameters: any;
    counters: any;
  };
}

/**
 * Execute a Cypher query and return the result
 */
export async function runCypherQuery(query: string, params = {}): Promise<CypherResult> {
  if (!neo4jConnection.isConnected()) {
    throw new Error('Not connected to Neo4j');
  }
  
  try {
    const result = await neo4jConnection.runQuery(query, params);
    return {
      records: result.records,
      summary: {
        query: result.summary.query.text,
        parameters: result.summary.query.parameters,
        counters: result.summary.counters.updates,
      }
    };
  } catch (error) {
    console.error('Error executing Cypher query:', error);
    throw error;
  }
}

/**
 * Format the Cypher result to a more usable structure
 */
export function formatCypherResult(result: CypherResult): FormattedCypherResult {
    if (!result.records.length) {
      return {
        columns: [],
        rows: [],
        summary: result.summary
      };
    }
    
    // Fix: convert PropertyKey[] to string[]
    const columns = result.records[0].keys.map(key => String(key));
    
    const rows = result.records.map(record => {
      return columns.map(column => {
        const value = record.get(column);
        // Handle Neo4j types appropriately
        if (value && typeof value === 'object') {
          // Rest of the function remains the same
        }
        return value;
      });
    });
    
    return {
      columns,
      rows,
      summary: result.summary
    };
}

/**
 * Convert Neo4j results to a format compatible with the existing application
 */
export function convertToSparqlResultsFormat(formattedResult: FormattedCypherResult): SparqlResultsJsonType {
  const vars = formattedResult.columns;
  
  const bindings = formattedResult.rows.map(row => {
    const binding: any = {};
    
    formattedResult.columns.forEach((column, index) => {
      const value = row[index];
      
      // Determine the type based on the value
      let type: string;
      if (value === null || value === undefined) {
        type = 'unknown';
      } else if (typeof value === 'object') {
        if (value._labels || value._id || value._type) {
          type = 'uri';
        } else {
          type = 'object';
        }
      } else {
        type = typeof value;
      }
      
      // Format the value as string
      let formattedValue: string;
      if (value === null || value === undefined) {
        formattedValue = '';
      } else if (typeof value === 'object') {
        formattedValue = JSON.stringify(value);
      } else {
        formattedValue = String(value);
      }
      
      binding[column] = {
        type,
        value: formattedValue
      };
    });
    
    return binding;
  });
  
  return {
    head: {
      vars
    },
    results: {
      bindings
    }
  };
}