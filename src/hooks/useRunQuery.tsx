// Copyright (c) 2024 Massachusetts Institute of Technology
// SPDX-License-Identifier: MIT
import { createContext, useContext } from "react";

import { UseMutateFunction, useMutation } from "@tanstack/react-query";

import { pushQueryHistory, updateLastQueryHistory } from 'redux/queryHistorySlice.ts';
import { setResults, setResultsSummary } from 'redux/resultsSlice.ts';
import { useAppDispatch, useAppSelector } from "redux/store.ts";

import { runCypherQuery, convertToSparqlResultsFormat, formatCypherResult } from 'utils/neo4j/runCypherQuery.ts';
import { SummarizeOutcomeType, summarizeQueryResults } from 'utils/summarizeQueryResults.ts';

import { useGetNewChatId } from "./useGetNewChatId.ts";
import { useChatAPIInstance } from "./useChatAPIInstance.ts";

type RunQueryContextType = {
  runQuery: UseMutateFunction<void, Error, string, unknown>;
  isPending: boolean;
};

//this sets up a context so we can define one runQuery function for the whole app
const RunQueryContext = createContext<RunQueryContextType | null>(null);

//this defines the context provider that should be placed towards the top of the app to make the runQuery function available as a hook
export function RunQueryProvider({
  children,
}: {
  children: React.ReactNode,
}) {
  const dispatch = useAppDispatch();
  const getNewChatId = useGetNewChatId();
  const isConnected = useAppSelector((state) => state.neo4jConnection.connected);
  
  // For summarizing query results
  const chatAPI = useChatAPIInstance({
    chatId: getNewChatId(),
  });
  
  const { mutate, isPending } = useMutation({
    mutationFn: async (query: string) => {
      if (!isConnected) {
        throw new Error("Not connected to Neo4j database");
      }
      
      try {
        // Execute the Cypher query
        const result = await runCypherQuery(query);
        const formattedResult = formatCypherResult(result);
        const sparqlCompatibleFormat = convertToSparqlResultsFormat(formattedResult);
        
        // Store the results
        dispatch(setResults({ 
          data: sparqlCompatibleFormat, 
          error: null,
          summary: null 
        }));
        
        // Add to query history
        dispatch(pushQueryHistory({ 
          data: sparqlCompatibleFormat, 
          query 
        }));
        
        // Summarize the results
        handleSummaryResults({
          data: sparqlCompatibleFormat
        }, query);
        
      } catch (error) {
        console.error("Error executing query:", error);
        
        // Store the error
        dispatch(setResults({ 
          data: null, 
          error: error instanceof Error ? error.message : String(error),
          summary: null 
        }));
        
        // Add to query history with error
        dispatch(pushQueryHistory({ 
          error: error instanceof Error ? error.message : String(error), 
          query 
        }));
        
        // Try to summarize the error
        handleLLMError(error instanceof Error ? error : new Error(String(error)));
      }
    },
  });
  
  const handleSummaryResults = async (
    outcome: SummarizeOutcomeType,
    query: string
  ) => {
    try {
      if ('data' in outcome) {
        const summary = await summarizeQueryResults(chatAPI, query, outcome);
        
        // Update the results with the summary
        dispatch(setResultsSummary(summary));
        
        // Update the query history with the name and summary
        dispatch(updateLastQueryHistory({
          name: "Query Result",
          summary: summary
        }));
      }
    } catch (error) {
      console.error("Error summarizing results:", error);
    }
  };
  
  const handleLLMError = async (err: Error) => {
    try {
      // Send the error to the LLM to get a more user-friendly explanation
      const response = await chatAPI.sendMessages([
        {
          role: "user",
          content: `The following Cypher query caused an error. Can you explain what went wrong and how to fix it? Error: ${err.message}`,
          stage: "Query Summarization"
        }
      ]);
      
      // Update the results with the explanation
      dispatch(setResultsSummary(response.content));
      
      // Update the query history with the name and summary
      dispatch(updateLastQueryHistory({
        name: "Error Analysis",
        summary: response.content
      }));
    } catch (error) {
      console.error("Error getting error explanation:", error);
    }
  };
  
  return (
    <RunQueryContext.Provider value={{ runQuery: mutate, isPending }}>
      {children}
    </RunQueryContext.Provider>
  );
}

export function useRunQuery() {
  const context = useContext(RunQueryContext);
  if (!context) {
    throw new Error("useRunQuery must be used within a RunQueryProvider");
  }
  return context;
}
