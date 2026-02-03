import React from 'react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            <main className="max-w-md mx-auto min-h-screen bg-white shadow-lg overflow-hidden relative">
                {children}
            </main>
        </div>
    );
};

export default Layout;
