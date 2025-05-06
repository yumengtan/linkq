import { neo4jConnection } from './neo4jConnection';
import { DocumentType } from './documentUpload';
import { QueryResult } from 'neo4j-driver';
import { Integer } from 'neo4j-driver';

/**
 * Fetch all documents from the Neo4j database
 */
export async function getDocuments(): Promise<DocumentType[]> {
  try {
    if (!neo4jConnection.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    const result: QueryResult = await neo4jConnection.runQuery(
      'MATCH (d:Document) WHERE d.fileName IS NOT NULL RETURN d ORDER BY d.updatedAt DESC'
    );
    
    return result.records.map(record => {
      const doc = record.get('d');
      return {
        id: doc.identity.toString(),
        fileName: doc.properties.fileName || 'Unknown',
        fileType: doc.properties.fileType || 'Unknown',
        fileSize: doc.properties.fileSize || 0,
        status: doc.properties.status || 'Unknown',
        nodeCount: doc.properties.nodeCount || 0,
        relationshipCount: doc.properties.relationshipCount || 0,
        processingTime: doc.properties.processingTime || '',
        createdAt: doc.properties.createdAt ? new Date(doc.properties.createdAt) : new Date(),
        errorMessage: doc.properties.errorMessage
      };
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
}

/**
 * Delete a document from the Neo4j database
 */
export async function deleteDocument(documentId: string): Promise<void> {
  try {
    if (!neo4jConnection.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    // First get the document to check if it has associated entities
    const documentResult: QueryResult = await neo4jConnection.runQuery(
      'MATCH (d:Document) WHERE id(d) = $documentId RETURN d.fileName AS fileName',
      { documentId: Integer.fromNumber(parseInt(documentId)) }
    );
    
    if (documentResult.records.length === 0) {
      throw new Error('Document not found');
    }
    
    const fileName = documentResult.records[0].get('fileName');
    
    // Delete the document and all related nodes
    await neo4jConnection.runQuery(`
      MATCH (d:Document {fileName: $fileName})
      OPTIONAL MATCH (chunk:Chunk)-[:PART_OF]->(d)
      OPTIONAL MATCH (entity)-[:MENTIONED_IN]->(chunk)
      DETACH DELETE d, chunk, entity
    `, { fileName });
    
    return;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

/**
 * Get document details
 */
export async function getDocumentDetails(documentId: string): Promise<DocumentType> {
  try {
    if (!neo4jConnection.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    const result: QueryResult = await neo4jConnection.runQuery(
      'MATCH (d:Document) WHERE id(d) = $documentId RETURN d',
      { documentId: Integer.fromNumber(parseInt(documentId)) }
    );
    
    if (result.records.length === 0) {
      throw new Error('Document not found');
    }
    
    const doc = result.records[0].get('d');
    
    return {
      id: doc.identity.toString(),
      fileName: doc.properties.fileName || 'Unknown',
      fileType: doc.properties.fileType || 'Unknown',
      fileSize: doc.properties.fileSize || 0,
      status: doc.properties.status || 'Unknown',
      nodeCount: doc.properties.nodeCount || 0,
      relationshipCount: doc.properties.relationshipCount || 0,
      processingTime: doc.properties.processingTime || '',
      createdAt: doc.properties.createdAt ? new Date(doc.properties.createdAt) : new Date(),
      errorMessage: doc.properties.errorMessage
    };
  } catch (error) {
    console.error('Error fetching document details:', error);
    throw error;
  }
}