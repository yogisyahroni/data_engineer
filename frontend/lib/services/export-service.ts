import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export class ExportService {
    /**
     * Captures a DOM element and exports it as a high-quality PDF.
     * Ideal for board meetings and executive reports.
     */
    static async exportToPDF(elementId: string, filename: string = 'dashboard-report.pdf'): Promise<void> {
        const element = document.getElementById(elementId);
        if (!element) throw new Error(`Element with id ${elementId} not found`);

        try {
            // Add a temporary header for the PDF
            const header = document.createElement('div');
            header.style.textAlign = 'center';
            header.style.marginBottom = '20px';
            header.innerHTML = `
                <h1 style="font-size: 24px; margin-bottom: 5px; font-family: sans-serif;">InsightEngine Dashboard Report</h1>
                <p style="font-size: 14px; color: #666; font-family: sans-serif;">Generated on ${new Date().toLocaleString()}</p>
            `;
            element.prepend(header);

            const canvas = await html2canvas(element, {
                scale: 2, // High DPI for industrial printing
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // Remove the temporary header
            element.removeChild(header);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(filename);

            console.log(`[ExportService] PDF exported successfully: ${filename}`);
        } catch (error) {
            console.error('[ExportService] PDF export failed:', error);
            throw error;
        }
    }

    /**
     * Exports a dashboard or chart as a PNG image.
     */
    static async exportToPNG(elementId: string, filename: string = 'chart-export.png'): Promise<void> {
        const element = document.getElementById(elementId);
        if (!element) throw new Error(`Element with id ${elementId} not found`);

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: null // Transparent background support
            });

            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();

            console.log(`[ExportService] PNG exported successfully: ${filename}`);
        } catch (error) {
            console.error('[ExportService] PNG export failed:', error);
            throw error;
        }
    }

    /**
     * Exports raw data array to CSV.
     */
    static exportDataToCSV(data: any[], filename: string = 'data-export.csv'): void {
        if (!data || data.length === 0) {
            console.warn('[ExportService] No data to export');
            return;
        }

        try {
            // Get all unique keys from all objects to form headers
            const allKeys = Array.from(new Set(data.flatMap(Object.keys)));

            // Create CSV header row
            const headerRow = allKeys.join(',');

            // Create CSV body rows
            const rows = data.map(row => {
                return allKeys.map(key => {
                    const value = row[key];
                    // Handle strings with commas or newlines by wrapping in quotes
                    if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    // Handle null/undefined
                    if (value === null || value === undefined) {
                        return '';
                    }
                    return value;
                }).join(',');
            });

            const csvContent = [headerRow, ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');

            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            console.log(`[ExportService] CSV exported successfully: ${filename}`);
        } catch (error) {
            console.error('[ExportService] CSV export failed:', error);
            throw error;
        }
    }
}
