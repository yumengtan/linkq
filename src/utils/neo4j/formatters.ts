/**
 * Format file size from bytes to human-readable format
 * @param bytes File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Format a timestamp to a readable date/time string
   * @param date Date object or string
   * @returns Formatted date string
   */
  export function formatTimestamp(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(dateObj);
  }
  
  /**
   * Format processing time (milliseconds or seconds) to human-readable format
   * @param time Time in milliseconds or seconds
   * @returns Formatted time string
   */
  export function formatProcessingTime(time: number | string): string {
    if (typeof time === 'string') {
      // Try to parse the string as a number
      const parsedTime = parseFloat(time);
      if (isNaN(parsedTime)) return time;
      time = parsedTime;
    }
    
    if (time < 1000) return `${time.toFixed(2)} ms`;
    if (time < 60000) return `${(time / 1000).toFixed(2)} sec`;
    
    const minutes = Math.floor(time / 60000);
    const seconds = ((time % 60000) / 1000).toFixed(2);
    return `${minutes} min ${seconds} sec`;
  }
  
  /**
   * Format a Neo4j node for display
   * @param node Neo4j node object
   * @returns Formatted string representation
   */
  export function formatNode(node: any): string {
    if (!node) return 'No node data';
    
    const labels = node._labels ? `(${node._labels.join(':')})` : '';
    const properties = Object.entries(node)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, value]) => `${key}: ${formatValue(value)}`)
      .join(', ');
    
    return `${labels} {${properties}}`;
  }
  
  /**
   * Format a Neo4j relationship for display
   * @param relationship Neo4j relationship object
   * @returns Formatted string representation
   */
  export function formatRelationship(relationship: any): string {
    if (!relationship) return 'No relationship data';
    
    const type = relationship._type ? `[${relationship._type}]` : '';
    const properties = Object.entries(relationship)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, value]) => `${key}: ${formatValue(value)}`)
      .join(', ');
    
    return `${type} {${properties}}`;
  }
  
  /**
   * Format a value based on its type
   */
  function formatValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return `"${value}"`;
    if (value instanceof Date) return formatTimestamp(value);
    if (Array.isArray(value)) return `[${value.map(formatValue).join(', ')}]`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }