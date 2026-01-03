'use client';

import { FC, ReactNode } from 'react';

// No wallet adapter needed - just pass children through
export const Providers: FC<{ children: ReactNode }> = ({ children }) => {
    return <>{children}</>;
};
