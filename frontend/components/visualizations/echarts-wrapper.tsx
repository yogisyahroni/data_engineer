
'use client';

import React, { useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from 'next-themes';
import type { EChartsOption } from 'echarts';

interface EChartsWrapperProps {
    options: EChartsOption;
    isLoading?: boolean;
    className?: string;
    onEvents?: Record<string, Function>;
}

export function EChartsWrapper({
    options,
    isLoading,
    className = "h-full w-full min-h-[400px]",
    onEvents
}: EChartsWrapperProps) {
    const { theme } = useTheme();
    const echartRef = useRef<ReactECharts>(null);

    // Sync dark mode theme with ECharts
    // We use standard 'dark' theme if system is dark, else default.
    const echartsTheme = theme === 'dark' ? 'dark' : undefined;

    // Manual resize trigger if container changes (optional, but resize observer is safer)
    useEffect(() => {
        const handleResize = () => {
            echartRef.current?.getEchartsInstance().resize();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className={className}>
            <ReactECharts
                ref={echartRef}
                option={options}
                theme={echartsTheme}
                style={{ height: '100%', width: '100%' }}
                loadingOption={{
                    text: 'Loading...',
                    color: '#3b82f6', // blue-500
                    textColor: theme === 'dark' ? '#fff' : '#000',
                    maskColor: theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)',
                    zlevel: 0,
                }}
                showLoading={isLoading}
                onEvents={onEvents}
                notMerge={true} // Important: Replace old chart completely
                lazyUpdate={true} // Performance optimization
            />
        </div>
    );
}
