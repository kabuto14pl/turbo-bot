"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const react_router_dom_1 = require("react-router-dom");
const drawerWidth = 280;
const menuItems = [
    { text: 'Dashboard', icon: (0, jsx_runtime_1.jsx)(icons_material_1.Dashboard, {}), path: '/dashboard' },
    { text: 'Portfolio', icon: (0, jsx_runtime_1.jsx)(icons_material_1.AccountBalance, {}), path: '/portfolio' },
    { text: 'Trading', icon: (0, jsx_runtime_1.jsx)(icons_material_1.TrendingUp, {}), path: '/trading' },
    { text: 'Analytics', icon: (0, jsx_runtime_1.jsx)(icons_material_1.Analytics, {}), path: '/analytics' },
    { text: 'Alerts', icon: (0, jsx_runtime_1.jsx)(icons_material_1.Warning, {}), path: '/alerts' },
    { text: 'Settings', icon: (0, jsx_runtime_1.jsx)(icons_material_1.Settings, {}), path: '/settings' },
];
const Layout = ({ children }) => {
    const [mobileOpen, setMobileOpen] = (0, react_1.useState)(false);
    const navigate = (0, react_router_dom_1.useNavigate)();
    const location = (0, react_router_dom_1.useLocation)();
    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };
    const handleNavigate = (path) => {
        navigate(path);
        setMobileOpen(false); // Close mobile drawer on navigation
    };
    const drawer = ((0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: {
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                }, children: [(0, jsx_runtime_1.jsx)(material_1.Avatar, { sx: {
                            bgcolor: 'primary.main',
                            width: 40,
                            height: 40,
                        }, children: "\uD83E\uDD16" }), (0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", fontWeight: "bold", children: "Trading Bot" }), (0, jsx_runtime_1.jsx)(material_1.Chip, { label: "ACTIVE", size: "small", color: "success", sx: { fontSize: '0.7rem', height: 20 } })] })] }), (0, jsx_runtime_1.jsx)(material_1.List, { sx: { py: 1 }, children: menuItems.map((item) => ((0, jsx_runtime_1.jsx)(material_1.ListItem, { disablePadding: true, children: (0, jsx_runtime_1.jsxs)(material_1.ListItemButton, { onClick: () => handleNavigate(item.path), selected: location.pathname === item.path, sx: {
                            mx: 1,
                            borderRadius: 1,
                            '&.Mui-selected': {
                                backgroundColor: 'primary.main',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: 'primary.dark',
                                },
                                '& .MuiListItemIcon-root': {
                                    color: 'white',
                                },
                            },
                        }, children: [(0, jsx_runtime_1.jsx)(material_1.ListItemIcon, { sx: {
                                    minWidth: 40,
                                    color: location.pathname === item.path ? 'white' : 'inherit',
                                }, children: item.text === 'Alerts' ? ((0, jsx_runtime_1.jsx)(material_1.Badge, { badgeContent: 3, color: "error", children: item.icon })) : (item.icon) }), (0, jsx_runtime_1.jsx)(material_1.ListItemText, { primary: item.text, primaryTypographyProps: {
                                    fontWeight: location.pathname === item.path ? 600 : 400,
                                } })] }) }, item.text))) })] }));
    return ((0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex' }, children: [(0, jsx_runtime_1.jsx)(material_1.AppBar, { position: "fixed", sx: {
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    ml: { md: `${drawerWidth}px` },
                }, children: (0, jsx_runtime_1.jsxs)(material_1.Toolbar, { children: [(0, jsx_runtime_1.jsx)(material_1.IconButton, { color: "inherit", "aria-label": "open drawer", edge: "start", onClick: handleDrawerToggle, sx: { mr: 2, display: { md: 'none' } }, children: (0, jsx_runtime_1.jsx)(icons_material_1.Menu, {}) }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { flexGrow: 1 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", noWrap: true, component: "div", children: menuItems.find(item => item.path === location.pathname)?.text || 'Dashboard' }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "caption", color: "inherit", sx: { opacity: 0.7 }, children: "Real-time trading monitoring" })] }), (0, jsx_runtime_1.jsx)(material_1.IconButton, { color: "inherit", sx: { mr: 1 }, onClick: () => navigate('/alerts'), children: (0, jsx_runtime_1.jsx)(material_1.Badge, { badgeContent: 5, color: "error", children: (0, jsx_runtime_1.jsx)(icons_material_1.Notifications, {}) }) }), (0, jsx_runtime_1.jsx)(material_1.Avatar, { sx: {
                                bgcolor: 'secondary.main',
                                width: 32,
                                height: 32,
                            }, children: "U" })] }) }), (0, jsx_runtime_1.jsxs)(material_1.Box, { component: "nav", sx: { width: { md: drawerWidth }, flexShrink: { md: 0 } }, children: [(0, jsx_runtime_1.jsx)(material_1.Drawer, { variant: "temporary", open: mobileOpen, onClose: handleDrawerToggle, ModalProps: {
                            keepMounted: true, // Better open performance on mobile
                        }, sx: {
                            display: { xs: 'block', md: 'none' },
                            '& .MuiDrawer-paper': {
                                boxSizing: 'border-box',
                                width: drawerWidth,
                            },
                        }, children: drawer }), (0, jsx_runtime_1.jsx)(material_1.Drawer, { variant: "permanent", sx: {
                            display: { xs: 'none', md: 'block' },
                            '& .MuiDrawer-paper': {
                                boxSizing: 'border-box',
                                width: drawerWidth,
                            },
                        }, open: true, children: drawer })] }), (0, jsx_runtime_1.jsx)(material_1.Box, { component: "main", sx: {
                    flexGrow: 1,
                    p: 3,
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    mt: 8, // Account for app bar height
                    minHeight: 'calc(100vh - 64px)',
                    backgroundColor: 'background.default',
                }, children: children })] }));
};
exports.default = Layout;
