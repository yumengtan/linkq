// Copyright (c) 2024 Massachusetts Institute of Technology
// SPDX-License-Identifier: MIT
import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { DEMO_QUERY_HISTORY, IS_DEMO_MODE } from 'utils/demoData'
import { SparqlResultsJsonType } from 'types/sparql'

type QueryRecordType = {
  name: string | null,
  query: string,
  results: {
    data: SparqlResultsJsonType | null,
    error: string | null,
    summary: string | null,
  },
}

type PushQueryHistoryPayloadType = {
  data: SparqlResultsJsonType, 
  query: string
} | {
  error: string, 
  query: string
}

// Fix: Change summary type to string instead of object
type UpdateLastQueryHistoryPayloadType = {
  name: string, 
  summary: string
}

type QueryHistoryState = {
  queries: QueryRecordType[]
}

const initialState: QueryHistoryState = {
  queries: IS_DEMO_MODE ? DEMO_QUERY_HISTORY : [],
}

export const queryHistorySlice = createSlice({
  name: 'queryHistory',
  initialState,
  reducers: {
    pushQueryHistory: (state, action: PayloadAction<PushQueryHistoryPayloadType>) => {
      const { query } = action.payload;
      
      if ('data' in action.payload) {
        state.queries.push({
          name: null,
          query,
          results: {
            data: action.payload.data,
            error: null,
            summary: null,
          }
        });
      } else {
        state.queries.push({
          name: null,
          query,
          results: {
            data: null,
            error: action.payload.error,
            summary: null,
          }
        });
      }
    },
    updateLastQueryHistory: (state, action: PayloadAction<UpdateLastQueryHistoryPayloadType>) => {
      const { name, summary } = action.payload;
      if (state.queries.length > 0) {
        const lastQuery = state.queries[state.queries.length - 1];
        lastQuery.name = name;
        lastQuery.results.summary = summary;
      }
    },
  },
})

export const { pushQueryHistory, updateLastQueryHistory } = queryHistorySlice.actions
export const queryHistoryReducer = queryHistorySlice.reducer