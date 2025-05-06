// Copyright (c) 2024 Massachusetts Institute of Technology
// SPDX-License-Identifier: MIT
import { ChatAPI } from './ChatAPI'
import { runCypherQuery } from './neo4j/runCypherQuery'
import { LinkQStageType } from '../types/linkQ'

interface IntermediateChatMessageType {
  content: string;
  role: "system" | "user" | "assistant";
  stage: LinkQStageType;
}

const QUERY_BUILDING_MAX_LOOPS = 20;
const ENTITY_SEARCH_PREFIX = "Entity Search:";
const PROPERTIES_SEARCH_PREFIX = "Properties Search:";
const TAIL_SEARCH_PREFIX = "Tail Search:";
const KG_NAME = "Neo4j Knowledge Graph";

const INITIAL_QUERY_BUILDING_SYSTEM_MESSAGE = `You are an AI assistant that helps construct Cypher queries for a Neo4j knowledge graph.

The knowledge graph contains documents that have been processed into chunks and entities.
Schema:
- (Document) nodes represent uploaded documents
- (Chunk) nodes represent pieces of those documents
- (__Entity__) nodes represent entities extracted from the documents
- Relationships: 
  - (Chunk)-[:PART_OF]->(Document)
  - (__Entity__)-[:MENTIONED_IN]->(Chunk)
  - (__Entity__)-[:RELATED_TO]->(__Entity__)

To build queries, you can:
1. Search for entities: "Entity Search: <search term>"
2. Search for properties of an entity: "Properties Search: <entity_id>"
3. Find entities related to another entity: "Tail Search: <entity_id>, <relationship_type>"

When you're ready to stop searching and construct the query, respond with "STOP".
`;

const QUERY_BUILDING_SYSTEM_MESSAGE = `Now construct a Cypher query that answers the user's question using the entity and relationship IDs you've found. The query should be syntactically correct Neo4j Cypher.`;

export async function queryBuildingWorkflow(chatAPI: ChatAPI, text: string) {
  // Send initial query building message to the LLM as the system role
  let llmResponse = await chatAPI.sendMessages([
    {
      content: INITIAL_QUERY_BUILDING_SYSTEM_MESSAGE,
      role: "system",
      stage: "Query Building",
    } as IntermediateChatMessageType,
  ]);

  let NO_FOREVER_LOOP = 0;
  while (NO_FOREVER_LOOP < QUERY_BUILDING_MAX_LOOPS) {
    NO_FOREVER_LOOP++;
    
    const responseText = llmResponse.content.trim();
    if (responseText.toUpperCase() === "STOP") {
      break;
    }
    // Handle entity search
    else if (responseText.includes(ENTITY_SEARCH_PREFIX)) {
      llmResponse = await handleEntitySearch(
        chatAPI,
        responseText.split(ENTITY_SEARCH_PREFIX)[1].trim(),
      );
    }
    // Handle properties search
    else if (responseText.includes(PROPERTIES_SEARCH_PREFIX)) {
      llmResponse = await handlePropertiesSearch(
        chatAPI,
        responseText.split(PROPERTIES_SEARCH_PREFIX)[1].trim(),
      );
    }
    // Handle tail search
    else if (responseText.startsWith(TAIL_SEARCH_PREFIX)) {
      llmResponse = await handleRelatedEntitiesSearch(
        chatAPI,
        responseText.replace(TAIL_SEARCH_PREFIX, "").trim(),
      );
    }
    // Invalid response
    else {
      llmResponse = await chatAPI.sendMessages([
        {
          content: `That was an invalid response. If you are done, just respond with STOP. Follow the specified format. ${INITIAL_QUERY_BUILDING_SYSTEM_MESSAGE}`,
          role: "system",
          stage: "Query Building",
        } as IntermediateChatMessageType,
      ]);
    }
  }
  
  // Ask the LLM to generate a query
  return await chatAPI.sendMessages([
    {
      content: QUERY_BUILDING_SYSTEM_MESSAGE + ` Now construct a query that answers the user's question: ${text}`,
      role: "system",
      stage: "Query Building",
    } as IntermediateChatMessageType,
  ]);
}

async function handleEntitySearch(chatAPI: ChatAPI, searchTerm: string) {
  try {
    // Search for entities using CONTAINS for fuzzy matching
    const result = await runCypherQuery(`
      MATCH (e:__Entity__)
      WHERE e.id CONTAINS $searchTerm OR e.description CONTAINS $searchTerm
      RETURN e.id AS entityId, e.description AS description
      LIMIT 5
    `, { searchTerm });

    if (result.records.length === 0) {
      return await chatAPI.sendMessages([
        {
          content: `${KG_NAME} did not find any entities matching "${searchTerm}". You may need to rephrase or simplify your entity search`,
          role: "system",
          stage: "Entity Fuzzy Searching",
        } as IntermediateChatMessageType,
      ]);
    }

    const entitiesText = result.records
      .map(record => {
        const entityId = record.get('entityId');
        const description = record.get('description');
        return `${entityId}: ${description || 'No description'}`;
      })
      .join('\n');

    return await chatAPI.sendMessages([
      {
        content: `Found entities in ${KG_NAME}:\n${entitiesText}`,
        role: "system",
        stage: "Entity Fuzzy Searching",
      } as IntermediateChatMessageType,
    ]);
  } catch (error) {
    console.error('Error in entity search:', error);
    return await chatAPI.sendMessages([
      {
        content: `Error searching for entities: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: "system",
        stage: "Entity Fuzzy Searching",
      } as IntermediateChatMessageType,
    ]);
  }
}

async function handlePropertiesSearch(chatAPI: ChatAPI, entityId: string) {
  try {
    // Get properties for an entity
    const result = await runCypherQuery(`
      MATCH (e:__Entity__ {id: $entityId})
      RETURN properties(e) AS properties
      LIMIT 1
    `, { entityId });

    if (result.records.length === 0) {
      return await chatAPI.sendMessages([
        {
          content: `${KG_NAME} did not find any entity with ID "${entityId}". Are you sure that entity exists?`,
          role: "system",
          stage: "Property Search",
        } as IntermediateChatMessageType,
      ]);
    }

    const properties = result.records[0].get('properties');
    const propertiesText = Object.entries(properties)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    return await chatAPI.sendMessages([
      {
        content: `Properties for entity ${entityId}:\n${propertiesText}`,
        role: "system",
        stage: "Property Search",
      } as IntermediateChatMessageType,
    ]);
  } catch (error) {
    console.error('Error in properties search:', error);
    return await chatAPI.sendMessages([
      {
        content: `Error getting properties for entity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: "system",
        stage: "Property Search",
      } as IntermediateChatMessageType,
    ]);
  }
}

async function handleRelatedEntitiesSearch(chatAPI: ChatAPI, text: string) {
  const split = text.split(",");
  if (split.length !== 2) {
    return await chatAPI.sendMessages([
      {
        content: "Your response did not follow the correct format. Please provide: Entity ID, Relationship Type",
        role: "system",
        stage: "Tail Search",
      } as IntermediateChatMessageType,
    ]);
  }

  const [entityId, relationshipType] = split.map(s => s.trim());

  try {
    // Find related entities
    const result = await runCypherQuery(`
      MATCH (e1:__Entity__ {id: $entityId})-[r:${relationshipType}]->(e2:__Entity__)
      RETURN e2.id AS relatedEntityId, e2.description AS description
      LIMIT 5
    `, { entityId });

    if (result.records.length === 0) {
      return await chatAPI.sendMessages([
        {
          content: `${KG_NAME} did not find any entities connected to "${entityId}" via "${relationshipType}" relationship. Are you sure that entity has that relationship?`,
          role: "system",
          stage: "Tail Search",
        } as IntermediateChatMessageType,
      ]);
    }

    const relatedEntitiesText = result.records
      .map(record => {
        const relatedEntityId = record.get('relatedEntityId');
        const description = record.get('description');
        return `${relatedEntityId}: ${description || 'No description'}`;
      })
      .join('\n');

    return await chatAPI.sendMessages([
      {
        content: `Related entities via ${relationshipType}:\n${relatedEntitiesText}`,
        role: "system",
        stage: "Tail Search",
      } as IntermediateChatMessageType,
    ]);
  } catch (error) {
    console.error('Error in related entities search:', error);
    return await chatAPI.sendMessages([
      {
        content: `Error finding related entities: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: "system",
        stage: "Tail Search",
      } as IntermediateChatMessageType,
    ]);
  }
}