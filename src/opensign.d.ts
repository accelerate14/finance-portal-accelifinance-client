// src/opensign.d.ts
declare module '@opensign/react' {
    import React from 'react';

    interface OpensignProps {
        templateId: string;
        baseUrl: string;
        appId: string;
        variables?: Record<string, string | number>;
        onLoad?: () => void;
        onLoadError?: (error: any) => void;
        onDone?: (data?: any) => void;
    }

    const Opensign: React.FC<OpensignProps>;
    export default Opensign;
}