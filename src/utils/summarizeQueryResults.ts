// Copyright (c) 2024 Massachusetts Institute of Technology
// SPDX-License-Identifier: MIT
import { SparqlResultsJsonType } from "types/sparql";
import { ChatAPI } from "./ChatAPI";
import { formatSparqlResultsAsString } from "./formatSparqlResultsAsString";

export type SummarizeOutcomeType = {
  data: SparqlResultsJsonType,
} | {
  error: Error,
}

export async function summarizeQueryResults(
  chatAPI: ChatAPI, 
  query: string, 
  outcome: SummarizeOutcomeType
): Promise<string> {
  if (!('data' in outcome)) {
    throw new Error("Cannot summarize error result");
  }
  
  const resultsAsString = formatSparqlResultsAsString(outcome.data);
  
  // First send a system message to guide the summarization
  await chatAPI.sendMessages([
    {
      role: "system",
      content: `You are an expert in Cypher queries and Neo4j graph databases. When summarizing query results:
1. Analyze the query structure to understand what data is being requested
2. Examine the results carefully and identify key patterns and insights
3. Provide a clear, concise explanation of what the results show
4. Highlight any interesting relationships or patterns in the data
5. If the results are empty, suggest potential reasons why
6. Use simple language that a non-technical user can understand
`,
      stage: "Query Summarization"
    }
  ]);
  
  // Then send the user message with the query and results
  const response = await chatAPI.sendMessages([
    {
      role: "user",
      content: `I executed the following Cypher query in Neo4j:

\`\`\`cypher
${query}
\`\`\`

And got these results:

${resultsAsString}

Please provide a clear, concise summary of what these results show. Explain any patterns or insights that might be relevant.`,
      stage: "Query Summarization"
    }
  ]);
  
  // Use the updated response format
  return response.content;
}