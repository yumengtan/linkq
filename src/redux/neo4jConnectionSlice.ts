import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { neo4jConnection } from '../utils/neo4j/neo4jConnection';

export type Neo4jConnectionState = {
  uri: string;
  username: string;
  database: string;
  connected: boolean;
  isConnecting: boolean;
  error: string | null;
};

const initialState: Neo4jConnectionState = {
  uri: '',
  username: '',
  database: '',
  connected: false,
  isConnecting: false,
  error: null
};


export const connectToNeo4j = createAsyncThunk(
  'neo4jConnection/connect',
  async ({ uri, username, password, database }: { 
    uri: string; 
    username: string; 
    password: string; 
    database: string;
  }, { rejectWithValue }) => {
    try {
      const success = await neo4jConnection.connect(uri, username, password, database);
      if (!success) {
        return rejectWithValue('Failed to connect to Neo4j');
      }
      return neo4jConnection.getConnectionDetails(); 
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to connect to Neo4j');
    }
  }
);

export const disconnectFromNeo4j = createAsyncThunk(
  'neo4jConnection/disconnect',
  async (_, { rejectWithValue }) => {
    try {
      await neo4jConnection.disconnect(); 
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to disconnect from Neo4j');
    }
  }
);

const neo4jConnectionSlice = createSlice({
  name: 'neo4jConnection',
  initialState,
  reducers: {
    setConnectionDetails: (state, action: PayloadAction<{
      uri: string;
      username: string;
      database: string;
    }>) => {
      state.uri = action.payload.uri;
      state.username = action.payload.username;
      state.database = action.payload.database;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(connectToNeo4j.pending, (state) => {
        state.isConnecting = true;
        state.error = null;
      })
      .addCase(connectToNeo4j.fulfilled, (state, action) => {
        state.isConnecting = false;
        state.connected = true;
        state.uri = action.payload.uri;
        state.username = action.payload.username;
        state.database = action.payload.database;
      })
      .addCase(connectToNeo4j.rejected, (state, action) => {
        state.isConnecting = false;
        state.connected = false;
        state.error = action.payload as string;
      })
      .addCase(disconnectFromNeo4j.fulfilled, (state) => {
        state.connected = false;
        state.uri = '';
        state.username = '';
        state.database = '';
      });
  }
});

export const { setConnectionDetails, clearError } = neo4jConnectionSlice.actions;
export const neo4jConnectionReducer = neo4jConnectionSlice.reducer;