import { Neo4jNode, Neo4jRelationship } from "./transformCyphertoGraphin";

/**
 * Parses a Cypher query to extract nodes and relationships for visualization
 * Note: This is a simplified parser and doesn't handle all Cypher syntax
 */
export function parseCypherQuery(query: string): { 
  nodes: Neo4jNode[],
  relationships: Neo4jRelationship[] 
} {
  // Normalize the query
  const normalizedQuery = query
    .replace(/\s+/g, ' ')
    .replace(/\/\/.*/g, '')  // Remove comments
    .trim();
  
  const nodes: Neo4jNode[] = [];
  const relationships: Neo4jRelationship[] = [];
  const nodeMap = new Map<string, Neo4jNode>();
  
  // Extract node patterns
  // Looks for patterns like (n:Person), (m:Movie {title: "The Matrix"})
  const nodePattern = /\(([a-zA-Z0-9_]+)(?::([a-zA-Z0-9_:]+))?(?:\s*\{([^}]*)\})?\)/g;
  let match;
  
  while ((match = nodePattern.exec(normalizedQuery)) !== null) {
    const variable = match[1];
    const labelsPart = match[2] || '';
    const propertiesPart = match[3] || '';
    
    // Skip if we've already processed this node
    if (nodeMap.has(variable)) continue;
    
    const labels = labelsPart ? labelsPart.split(':').filter(Boolean) : [];
    
    // Simple properties parsing (not handling complex expressions)
    const properties: Record<string, any> = {};
    if (propertiesPart) {
      const propPairs = propertiesPart.split(',');
      propPairs.forEach(pair => {
        const [key, value] = pair.split(':').map(s => s.trim());
        if (key && value) {
          // Remove quotes from string values
          properties[key] = value.replace(/^["'](.*)["']$/, '$1');
        }
      });
    }
    
    const node: Neo4jNode = {
      variable,
      labels,
      properties: Object.keys(properties).length > 0 ? properties : undefined
    };
    
    nodes.push(node);
    nodeMap.set(variable, node);
  }
  
  // Extract relationship patterns
  // Looks for patterns like (a)-[r:ACTED_IN]->(m)
  const relPattern = /\(([a-zA-Z0-9_]+)\)(?:-\[(?:([a-zA-Z0-9_]+))?(?::([a-zA-Z0-9_]+))?(?:\s*\{([^}]*)\})?\]->|\-\-\>|\-\-|\-\>|\-)\(([a-zA-Z0-9_]+)\)/g;
  
  while ((match = relPattern.exec(normalizedQuery)) !== null) {
    const sourceVar = match[1];
    const relVar = match[2] || undefined;
    const relType = match[3] || '';
    const propsPart = match[4] || '';
    const targetVar = match[5];
    
    // Simple properties parsing for relationships
    const properties: Record<string, any> = {};
    if (propsPart) {
      const propPairs = propsPart.split(',');
      propPairs.forEach(pair => {
        const [key, value] = pair.split(':').map(s => s.trim());
        if (key && value) {
          properties[key] = value.replace(/^["'](.*)["']$/, '$1');
        }
      });
    }
    
    relationships.push({
      variable: relVar,
      type: relType || 'RELATED_TO', // Default type if none specified
      source: sourceVar,
      target: targetVar,
      properties: Object.keys(properties).length > 0 ? properties : undefined
    });
    
    // Make sure both nodes are in our nodes list
    // Sometimes queries use shorthand without declaring node labels
    if (!nodeMap.has(sourceVar)) {
      const node: Neo4jNode = { variable: sourceVar, labels: [] };
      nodes.push(node);
      nodeMap.set(sourceVar, node);
    }
    
    if (!nodeMap.has(targetVar)) {
      const node: Neo4jNode = { variable: targetVar, labels: [] };
      nodes.push(node);
      nodeMap.set(targetVar, node);
    }
  }
  
  return { nodes, relationships };
}