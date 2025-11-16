'use client'; // Đánh dấu là client component trong nextjs

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';


// Định nghĩa kiểu props cho ThemeProvider bằng cách kế thừa từ NextThemesProvider
type  ThemesProviderProps = React.ComponentProps<typeof NextThemesProvider>;


/**
 * Component cung cấp theme cho toàn bộ ứng dụng
 * @param children - Các component con sẽ được bọc bởi ThemeProvider
 * @param props - Các thuộc tính khác của NextThemesProvider
 */
export function ThemeProvider ({ children, ...props}: ThemesProviderProps){
    return (
        <NextThemesProvider 
        
        // Sử dụng class để thay đổi theme ( thêm class dark vào sau thẻ html)
        attribute="class"
           
        // Sử dụng hệ thống theme của hệ điều hành
        defaultTheme="system"
           
        // Cho phép sử dụng hệ thống theme của hệ điều hành
        enableSystem
           
        // Tắt hiệu ứng chuyển đổi khi thay đổi theme
        disableTransitionOnChange
            {...props}
        >
            {children} {/* Render các component con */}
        </NextThemesProvider>
    )
}