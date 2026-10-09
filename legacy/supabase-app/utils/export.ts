
export const exportToCSV = (filename: string, rows: any[]) => {
  if (!rows || !rows.length) return;
  
  const separator = ',';
  // If it's an array of objects
  if (typeof rows[0] === 'object' && !Array.isArray(rows[0])) {
    const keys = Object.keys(rows[0]);
    const csvContent = [
      keys.join(separator),
      ...rows.map(row => 
        keys.map(key => {
          let cell = row[key] === null || row[key] === undefined ? '' : row[key];
          cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
          if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
          return cell;
        }).join(separator)
      )
    ].join('\n');

    triggerDownload(filename, csvContent);
  } else {
    // If it's already an array of arrays or raw lines
    const csvContent = rows.map(row => row.join(separator)).join('\n');
    triggerDownload(filename, csvContent);
  }
};

const triggerDownload = (filename: string, content: string) => {
  const blob = new Blob(["\ufeff" + content], { type: 'text/csv;charset=utf-8;' }); // Added BOM for Excel UTF-8 support
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
