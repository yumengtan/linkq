import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Configuration for uploads
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:8000';

// Export DocumentType
export type DocumentType = {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    status: 'Completed' | 'Failed' | 'Processing' | 'New' | 'Cancelled';
    nodeCount?: number;
    relationshipCount?: number;
    processingTime?: string;
    createdAt: Date | string; // Accept both Date and string
    errorMessage?: string;
    fileSource?: string;
    model?: string;
    total_chunks?: number;
    processed_chunk?: number;
  };

  
/**
 * Function to chunk and upload a file
 */
export async function uploadDocument(
  file: File,
  model: string,
  neo4jUri: string,
  neo4jUsername: string,
  neo4jDatabase: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const originalname = file.name;
  const fileId = uuidv4(); // Generate a unique ID for this upload
  
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);
    
    const formData = new FormData();
    formData.append('file', chunk);
    formData.append('chunkNumber', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('originalname', originalname);
    formData.append('fileId', fileId);
    formData.append('model', model);
    formData.append('uri', neo4jUri);
    formData.append('userName', neo4jUsername);
    formData.append('database', neo4jDatabase);
    
    try {
      await axios.post(`${API_ENDPOINT}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (onProgress) {
        onProgress(Math.round(((chunkIndex + 1) / totalChunks) * 100));
      }
    } catch (error) {
      console.error(`Error uploading chunk ${chunkIndex}:`, error);
      throw new Error(`Failed to upload chunk ${chunkIndex}`);
    }
  }
  
  // After all chunks are uploaded, trigger the extraction process
  await triggerExtraction(
    originalname,
    fileId,
    model,
    "local", // Source type for local files
    neo4jUri,
    neo4jUsername,
    neo4jDatabase
  );
}

/**
 * Function to trigger extraction after upload
 */
async function triggerExtraction(
  fileName: string,
  fileId: string,
  model: string,
  sourceType: string,
  neo4jUri: string,
  neo4jUsername: string,
  neo4jDatabase: string,
  allowedNodes?: string[],
  allowedRelationship?: string[],
): Promise<void> {
  const formData = new FormData();
  formData.append('model', model);
  formData.append('source_type', sourceType);
  formData.append('file_name', fileName);
  formData.append('fileId', fileId);
  formData.append('uri', neo4jUri);
  formData.append('userName', neo4jUsername);
  formData.append('database', neo4jDatabase);
  formData.append('token_chunk_size', '500'); // Default token chunk size
  formData.append('chunk_overlap', '50');    // Default chunk overlap
  formData.append('chunks_to_combine', '1'); // Default chunks to combine
  
  // Optional parameters
  if (allowedNodes) {
    formData.append('allowedNodes', allowedNodes.join(','));
  }
  
  if (allowedRelationship) {
    formData.append('allowedRelationship', allowedRelationship.join(','));
  }
  
  try {
    await axios.post(`${API_ENDPOINT}/extract`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  } catch (error) {
    console.error('Error triggering extraction:', error);
    throw new Error('Failed to trigger extraction process');
  }
}

/**
 * Function to get a list of uploaded documents
 */
export async function getUploadedDocuments(
  neo4jUri: string,
  neo4jUsername: string,
  neo4jPassword: string,
  neo4jDatabase: string
): Promise<any[]> {
  const formData = new FormData();
  formData.append('uri', neo4jUri);
  formData.append('userName', neo4jUsername);
  formData.append('password', neo4jPassword); // Note: Handle this securely
  formData.append('database', neo4jDatabase);
  
  try {
    const response = await axios.post(`${API_ENDPOINT}/sources_list`, formData);
    return response.data.data || [];
  } catch (error) {
    console.error('Error getting uploaded documents:', error);
    throw new Error('Failed to retrieve uploaded documents');
  }
}

/**
 * Function to check document processing status
 */
export async function checkDocumentStatus(
  fileName: string,
  neo4jUri: string,
  neo4jUsername: string,
  neo4jDatabase: string
): Promise<any> {
  try {
    const response = await axios.get(`${API_ENDPOINT}/document_status/${fileName}`, {
      params: {
        url: neo4jUri,
        userName: neo4jUsername,
        database: neo4jDatabase
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error checking document status:', error);
    throw new Error('Failed to check document status');
  }
}

/**
 * Function to delete a document
 */
export async function deleteDocument(
  fileName: string,
  sourceType: string,
  neo4jUri: string,
  neo4jUsername: string,
  neo4jDatabase: string,
  deleteEntities: boolean = false
): Promise<any> {
  const formData = new FormData();
  formData.append('uri', neo4jUri);
  formData.append('userName', neo4jUsername);
  formData.append('database', neo4jDatabase);
  formData.append('filenames', JSON.stringify([fileName]));
  formData.append('source_types', JSON.stringify([sourceType]));
  formData.append('deleteEntities', deleteEntities.toString());
  
  try {
    const response = await axios.post(`${API_ENDPOINT}/delete_document`, formData);
    return response.data;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw new Error('Failed to delete document');
  }
}

/**
 * Function to cancel document processing
 */
export async function cancelDocumentProcessing(
  fileName: string,
  sourceType: string,
  neo4jUri: string,
  neo4jUsername: string,
  neo4jDatabase: string
): Promise<any> {
  const formData = new FormData();
  formData.append('uri', neo4jUri);
  formData.append('userName', neo4jUsername);
  formData.append('database', neo4jDatabase);
  formData.append('filenames', JSON.stringify([fileName]));
  formData.append('source_types', JSON.stringify([sourceType]));
  
  try {
    const response = await axios.post(`${API_ENDPOINT}/cancelled_job`, formData);
    return response.data;
  } catch (error) {
    console.error('Error cancelling processing:', error);
    throw new Error('Failed to cancel document processing');
  }
}