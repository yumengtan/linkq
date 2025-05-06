/**
 * Format Neo4j entity IDs and values for display
 */

/**
 * Format a Neo4j entity ID
 * Neo4j entities don't have URIs like WikiData, so we'll create a display format
 */
export function formatURI(entityId: string): string {
    if (!entityId) return '';
    
    // For Neo4j, we don't have URIs, so we return the entity ID as-is
    return entityId;
  }
  
  /**
   * Get href for Neo4j entity
   * Since Neo4j doesn't have external URLs like WikiData, we'll provide context-appropriate links
   */
  export function getHrefFromURI(entityId: string): string {
    if (!entityId) return '#';
    
    // If the entity ID is an actual URI
    if (entityId.startsWith('http://') || entityId.startsWith('https://')) {
      return entityId;
    }
    
    // For Neo4j entity IDs, we might want to create a link to view the entity in the graph
    // You could customize this to link to your application's entity view page
    return `#/entity/${encodeURIComponent(entityId)}`;
  }
  
  /**
   * Format Neo4j node/relationship for display
   */
  export function formatNeo4jNode(node: any): string {
    if (!node) return 'Unknown';
    
    // For Neo4j nodes with labels
    if (node._labels && Array.isArray(node._labels)) {
      return `[${node._labels.join(':')}]`;
    }
    
    // For entity IDs
    if (typeof node === 'string') {
      return node;
    }
    
    // For other objects
    if (typeof node === 'object') {
      if (node.id) return node.id;
      if (node.name) return node.name;
      if (node.label) return node.label;
    }
    
    return String(node);
  }
  
  /**
   * Check if a value is a valid Neo4j entity reference
   */
  export function isNeo4jEntity(value: any): boolean {
    if (typeof value === 'string') {
      // Check if it looks like an entity ID (adjust pattern as needed)
      return value.match(/^[a-zA-Z0-9_-]+$/) !== null;
    }
    
    if (typeof value === 'object' && value !== null) {
      return '_labels' in value || '_id' in value || '_type' in value;
    }
    
    return false;
  }