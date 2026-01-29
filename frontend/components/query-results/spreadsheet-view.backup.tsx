'use client';

import { useEffect, useRef, useMemo } from 'react';
import { HotTable } from '@handsontable/react';
// import 'handsontable/dist/handsontable.full.min.css';
import 'handsontable';

interface SpreadsheetViewProps {
    data: any[];
    columns: string[];
}

export default function SpreadsheetView({ data, columns }: SpreadsheetViewProps) {
    const hotRef = useRef<any>(null);

    // Memoize data to prevent unnecessary re-renders
    // Handsontable mutates data in place, so we must clone it if we want to be safe, 
    // but for read-only visualization, passing it directly is usually fine. 
    // However, ensuring the array structure matches what Handsontable expects is key.
    const hotData = useMemo(() => {
        return data;
    }, [data]);

    useEffect(() => {
        // Force a render resize when the component mounts to ensure proper sizing
        if (hotRef.current?.hotInstance) {
            setTimeout(() => {
                hotRef.current.hotInstance.render();
            }, 100);
        }
    }, []);

    return (
        <div className="h-full w-full overflow-hidden">
            <HotTable
                ref={hotRef}
                data={hotData}
                colHeaders={columns}
                rowHeaders={true}
                width="100%"
                height="100%"
                licenseKey="non-commercial-and-evaluation"
                readOnly={true}
                contextMenu={['copy', 'exportFile']}
                multiColumnSorting={true}
                filters={true}
                dropdownMenu={['filter_by_condition', 'filter_by_value', 'filter_action_bar']}
                manualColumnResize={true}
                manualRowResize={true}
                autoWrapRow={true}
                autoWrapCol={true}
                renderAllRows={false} // Virtualization on
                viewportColumnRenderingOffset={10}
                viewportRowRenderingOffset={20}
                columnSorting={true}
                className="htCustomTheme"
            />

            <style jsx global>{`
        /* Custom overrides for Handsontable to match InsightEngine Dark Mode */
        .handsontable {
            font-family: var(--font-inter), sans-serif !important;
            font-size: 13px !important;
        }
        
        .handsontable th {
            background-color: hsl(var(--muted)) !important;
            color: hsl(var(--foreground)) !important;
            font-weight: 600 !important;
            border-color: hsl(var(--border)) !important;
        }
        
        .handsontable td {
            background-color: hsl(var(--card)) !important;
            color: hsl(var(--card-foreground)) !important;
            border-color: hsl(var(--border)) !important;
        }

        .handsontable .htDimmed {
             color: hsl(var(--muted-foreground)) !important;
        }

        /* Selection Color */
        .handsontable tbody th.ht__highlight, 
        .handsontable thead th.ht__highlight {
            background-color: hsl(var(--accent)) !important;
        }

        .wtBorder {
            background-color: hsl(var(--primary)) !important; 
        }
        
        .area.highlight {
            background-color: hsl(var(--primary) / 0.1) !important;
        }
      `}</style>
        </div>
    );
}
