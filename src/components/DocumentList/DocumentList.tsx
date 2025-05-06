import { useEffect, useState } from 'react';
import { ActionIcon, Badge, Button, Group, Loader, Menu, Paper, Table, Text, Title } from '@mantine/core';
import { IconDotsVertical, IconRefresh, IconTrash, IconX } from '@tabler/icons-react';
import { useAppSelector } from '../../redux/store';
import { DocumentType, getUploadedDocuments, deleteDocument, cancelDocumentProcessing } from '../../utils/neo4j/documentUpload';
import { formatFileSize, formatDate } from '../../utils/formatters';

// Styles for document list
import styles from './DocumentList.module.scss';

export function DocumentList() {
  // Change from any[] to DocumentType[]
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isConnected = useAppSelector((state) => state.neo4jConnection.connected);
  const connectionDetails = useAppSelector((state) => ({
    uri: state.neo4jConnection.uri,
    username: state.neo4jConnection.username,
    database: state.neo4jConnection.database,
    connected: state.neo4jConnection.connected
  }));
  
  // Load documents when component mounts and connection changes
  useEffect(() => {
    if (isConnected && connectionDetails) {
      loadDocuments();
    }
  }, [isConnected, connectionDetails]);
  
  // Function to load documents
  const loadDocuments = async () => {
    if (!isConnected || !connectionDetails) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const docs = await getUploadedDocuments(
        connectionDetails.uri,
        connectionDetails.username,
        '', // We don't store password in state for security reasons
        connectionDetails.database
      );
      
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      console.error('Error loading documents:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to delete a document
  const handleDeleteDocument = async (fileName: string, sourceType: string) => {
    if (!isConnected || !connectionDetails) return;
    
    try {
      await deleteDocument(
        fileName,
        sourceType,
        connectionDetails.uri,
        connectionDetails.username,
        connectionDetails.database,
        false // Don't delete entities by default
      );
      
      // Refresh the document list
      loadDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };
  
  // Function to cancel processing
  const handleCancelProcessing = async (fileName: string, sourceType: string) => {
    if (!isConnected || !connectionDetails) return;
    
    try {
      await cancelDocumentProcessing(
        fileName,
        sourceType,
        connectionDetails.uri,
        connectionDetails.username,
        connectionDetails.database
      );
      
      // Refresh the document list
      loadDocuments();
    } catch (err) {
      console.error('Error cancelling processing:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel processing');
    }
  };
  
  // Get status badge color based on document status
  const getStatusBadgeColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      case 'processing':
      case 'new':
        return 'blue';
      case 'cancelled':
        return 'gray';
      default:
        return 'blue';
    }
  };
  
  // Calculate progress percentage
  const calculateProgress = (document: DocumentType): number => {
    if (document.total_chunks && document.processed_chunk) {
      return Math.round((document.processed_chunk / document.total_chunks) * 100);
    }
    return 0;
  };
  
  if (!isConnected) {
    return (
      <Paper p="md" withBorder>
        <Text ta="center">Connect to Neo4j to view documents</Text>
      </Paper>
    );
  }
  
  return (
    <div className={styles.documentListContainer}>
      <Group justify="space-between" mb="md">
        <Title order={3} size="h5">Uploaded Documents</Title>
        <Button 
          size="xs" 
          leftSection={<IconRefresh size={14} />} 
          onClick={loadDocuments}
          loading={isLoading}
        >
          Refresh
        </Button>
      </Group>
      
      {error && (
        <Text color="red" size="sm" mb="md">
          Error: {error}
        </Text>
      )}
      
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader />
        </div>
      ) : documents.length === 0 ? (
        <Text ta="center" color="dimmed">
          No documents uploaded yet
        </Text>
      ) : (
        <Table striped highlightOnHover>
          <thead>
            <tr>
              <th>Name</th>
              <th>Source</th>
              <th>Size</th>
              <th>Status</th>
              <th>Upload Date</th>
              <th>Model</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.fileName}>
                <td>{doc.fileName}</td>
                <td>{doc.fileSource || 'N/A'}</td>
                <td>{formatFileSize(doc.fileSize)}</td>
                <td>
                  <Badge 
                    color={getStatusBadgeColor(doc.status)} 
                    variant="filled"
                  >
                    {doc.status}
                    {doc.status.toLowerCase() === 'processing' && doc.total_chunks && (
                      ` (${calculateProgress(doc)}%)`
                    )}
                  </Badge>
                </td>
                <td>{formatDate(doc.createdAt)}</td>
                <td>{doc.model || 'N/A'}</td>
                <td>
                  <Menu position="bottom-end" shadow="md">
                    <Menu.Target>
                      <ActionIcon>
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {doc.status.toLowerCase() === 'processing' && (
                        <Menu.Item 
                        leftSection={<IconX size={14} />} 
                          color="orange"
                          onClick={() => handleCancelProcessing(doc.fileName, doc.fileSource || '')}
                        >
                          Cancel Processing
                        </Menu.Item>
                      )}
                      <Menu.Item 
                        leftSection={<IconTrash size={14} />} 
                        color="red"
                        onClick={() => handleDeleteDocument(doc.fileName, doc.fileSource || '')}
                      >
                        Delete Document
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}