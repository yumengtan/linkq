import { GraphinData } from "@antv/graphin";

// Types for Neo4j nodes and relationships from Cypher parsing
export type Neo4jNode = {
  variable: string;
  labels: string[];
  properties?: Record<string, any>;
};

export type Neo4jRelationship = {
  variable?: string;
  type: string;
  source: string;
  target: string;
  properties?: Record<string, any>;
};

// Color generation for consistent node colors
function getColorByLabel(label: string): string {
  // Simple hash function to generate a color based on the label
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert to hex color
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  
  return color;
}

// Create a Graphin node from a Neo4j node
function createGraphinNode(node: Neo4jNode) {
  const primaryLabel = node.labels[0] || 'Node';
  const color = getColorByLabel(primaryLabel);
  
  return {
    id: node.variable,
    style: {
      keyshape: {
        fill: color,
        stroke: '#fff',
        opacity: 0.85,
      },
      label: {
        value: `${node.variable}:${node.labels.join(':')}`,
      },
    },
    data: {
      label: primaryLabel,
      properties: node.properties || {},
    },
  };
}

// Create a Graphin edge from a Neo4j relationship
function createGraphinEdge(relationship: Neo4jRelationship) {
  return {
    id: relationship.variable || `${relationship.source}-${relationship.type}->${relationship.target}`,
    source: relationship.source,
    target: relationship.target,
    style: {
      label: {
        value: relationship.type,
        fill: '#fff',
        fontSize: 12,
        background: {
          fill: '#1890ff',
          stroke: '#1890ff',
          radius: 8,
        },
      },
      keyshape: {
        stroke: '#1890ff',
        lineDash: [0, 0],
        lineWidth: 1,
        opacity: 0.6,
      },
    },
    data: {
      type: relationship.type,
      properties: relationship.properties || {},
    },
  };
}

// Transform Neo4j nodes and relationships to Graphin format
export function transformCypherToGraphin(
  nodes: Neo4jNode[], 
  relationships: Neo4jRelationship[]
): GraphinData {
  const graphinNodes = nodes.map(createGraphinNode);
  const graphinEdges = relationships.map(createGraphinEdge);
  
  return {
    nodes: graphinNodes,
    edges: graphinEdges,
  };
}