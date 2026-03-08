/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_CHAT_ENABLED?: string;
    readonly VITE_GEMINI_API_KEY: string;
    // thêm các biến môi trường khác nếu cần
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string | undefined;

interface Window {
    __CLERK_PUBLISHABLE_KEY__?: string;
    __APP_RUNTIME_CONFIG__?: {
        APP_ENV?: string;
        VITE_CLERK_PUBLISHABLE_KEY?: string;
        VITE_API_URL?: string;
    };
}
