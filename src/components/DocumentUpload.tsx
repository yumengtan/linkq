import { useState } from 'react';
import { 
  Button, 
  Card, 
  FileInput, 
  Group, 
  Select, 
  Text, 
  Title, 
  Progress 
} from '@mantine/core';
import { IconUpload, IconFilePlus } from '@tabler/icons-react';
import { useAppSelector } from 'redux/store';
import { notifications } from '@mantine/notifications';
import { uploadDocument } from 'utils/neo4j/documentUpload';

// LLM models available for document processing
const MODEL_OPTIONS = [
  { value: 'openai-gpt-4o', label: 'OpenAI GPT-4o' },
  { value: 'openai-gpt-3.5', label: 'OpenAI GPT-3.5' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' }
];

export function DocumentUpload() {
  const neo4jState = useAppSelector(state => state.neo4jConnection);
  
  const [file, setFile] = useState<File | null>(null);
  const [model, setModel] = useState<string>('openai-gpt-4o');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const handleUpload = async () => {
    if (!file) {
      notifications.show({
        title: 'Error',
        message: 'Please select a file to upload',
        color: 'red',
      });
      return;
    }
    
    if (!neo4jState.connected) {
      notifications.show({
        title: 'Error',
        message: 'Please connect to Neo4j before uploading documents',
        color: 'red',
      });
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    try {
      // Use the uploadDocument function with the progress callback
      await uploadDocument(
        file,
        model,
        neo4jState.uri,
        neo4jState.username,
        neo4jState.database,
        (progress) => {
          // This callback gets called by uploadDocument with progress updates
          setUploadProgress(progress);
        }
      );
      
      notifications.show({
        title: 'Success',
        message: `File "${file.name}" uploaded successfully and will be processed`,
        color: 'green',
      });
      
      // Reset form
      setTimeout(() => {
        setFile(null);
        setUploadProgress(0);
        setUploading(false);
      }, 1500);
      
    } catch (error) {
      setUploadProgress(0);
      
      console.error('Upload error:', error);
      notifications.show({
        title: 'Upload Failed',
        message: error instanceof Error ? error.message : 'Failed to upload document',
        color: 'red',
      });
      
      setUploading(false);
    }
  };
  
  if (!neo4jState.connected) {
    return (
      <Card withBorder p="md" radius="md" mb="md">
        <Text ta="center">Connect to Neo4j to upload documents</Text>
      </Card>
    );
  }
  
  return (
    <Card withBorder p="md" radius="md" mb="md">
      <Title order={4} mb="md">Upload Document</Title>
      
      <FileInput
        label="Select file"
        placeholder="Click to select file"
        value={file}
        onChange={setFile}
        leftSection={<IconFilePlus size={16} />}
        accept=".pdf,.txt,.csv,.xlsx,.docx,.md"
        mb="md"
        clearable
        disabled={uploading}
      />
      
      <Select
        label="Processing model"
        placeholder="Select LLM model"
        data={MODEL_OPTIONS}
        value={model}
        onChange={(value) => value && setModel(value)}
        mb="md"
        disabled={uploading}
      />
      
      {uploadProgress > 0 && (
        <div>
            <Text size="sm" mb="xs">
            {Math.round(uploadProgress)}%
            </Text>
            <Progress 
            value={uploadProgress} 
            mb="md" 
            color={uploadProgress === 100 ? 'green' : 'blue'}
            size="sm"
            />
        </div>
      )}
      
      <Group justify="flex-end">
        <Button
          leftSection={<IconUpload size={16} />}
          onClick={handleUpload}
          loading={uploading}
          disabled={!file || uploading}
        >
          Upload
        </Button>
      </Group>
    </Card>
  );
}