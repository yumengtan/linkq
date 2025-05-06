/**
 * Format file size in bytes to a human-readable string
 */
export function formatFileSize(bytes: number | undefined | null): string {
    if (bytes === undefined || bytes === null) return 'Unknown';
    
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Format Neo4j date string to a readable format
   */
  export function formatDate(dateInput: any): string {
    if (!dateInput) return 'N/A';
    
    try {
      // Handle Neo4j DateTime object format
      if (typeof dateInput === 'object' && dateInput._DateTime__date && dateInput._DateTime__time) {
        const date = dateInput._DateTime__date;
        const time = dateInput._DateTime__time;
        
        const year = date._Date__year;
        const month = date._Date__month;
        const day = date._Date__day;
        
        const hour = time._Time__hour;
        const minute = time._Time__minute;
        const second = time._Time__second;
        
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
      }
      
      // Parse string date
      if (typeof dateInput === 'string') {
        const date = new Date(dateInput);
        return date.toLocaleString();
      }
      
      // Handle date object
      if (dateInput instanceof Date) {
        return dateInput.toLocaleString();
      }
      
      // Default case - stringified
      return String(dateInput);
    } catch (error) {
      console.error('Error formatting date:', error);
      return String(dateInput);
    }
  }
  
  /**
   * Format Neo4j node labels into a readable string
   */
  export function formatNodeLabels(labels: string[] | undefined | null): string {
    if (!labels || !Array.isArray(labels) || labels.length === 0) {
      return 'Unknown';
    }
    
    return labels.join(':');
  }
  
  /**
   * Format query execution time
   */
  export function formatExecutionTime(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds.toFixed(0)} ms`;
    } else {
      return `${(milliseconds / 1000).toFixed(2)} s`;
    }
  }
  
  /**
   * Truncate long text for display
   */
  export function truncateText(text: string, maxLength: number = 100): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength) + '...';
  }