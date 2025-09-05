"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
const react_router_dom_1 = require("react-router-dom");
const react_query_1 = require("@tanstack/react-query");
const styles_1 = require("@mui/material/styles");
const material_1 = require("@mui/material");
const react_hot_toast_1 = require("react-hot-toast");
const App_1 = __importDefault(require("./App"));
const theme_1 = require("./utils/theme");
// Create a client for React Query
const queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5000,
            cacheTime: 300000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});
client_1.default.createRoot(document.getElementById('root')).render((0, jsx_runtime_1.jsx)(react_1.default.StrictMode, { children: (0, jsx_runtime_1.jsx)(react_router_dom_1.BrowserRouter, { children: (0, jsx_runtime_1.jsx)(react_query_1.QueryClientProvider, { client: queryClient, children: (0, jsx_runtime_1.jsxs)(styles_1.ThemeProvider, { theme: theme_1.theme, children: [(0, jsx_runtime_1.jsx)(material_1.CssBaseline, {}), (0, jsx_runtime_1.jsx)(App_1.default, {}), (0, jsx_runtime_1.jsx)(react_hot_toast_1.Toaster, { position: "top-right", toastOptions: {
                            duration: 4000,
                            style: {
                                background: '#363636',
                                color: '#fff',
                            }
                        } })] }) }) }) }));
