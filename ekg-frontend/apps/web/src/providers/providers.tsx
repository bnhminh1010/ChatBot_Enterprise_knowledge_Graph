'use client';

import { ThemeProvider } from './theme-provider';
import { ReactNode } from 'react';

//Dinh nghia props cho Providers component
interface ProvidersProps { 
    children: ReactNode // children co the la bat ky ReactNode nao

}

export function Providers({ children}: ProvidersProps){
    return (
        <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        >
            {children}
        </ThemeProvider>
    )
}