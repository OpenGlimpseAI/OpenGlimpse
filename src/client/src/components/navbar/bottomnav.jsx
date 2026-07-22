import { Link } from "react-router-dom";

import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import ChatIcon from '@mui/icons-material/Chat';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CameraAlt from '@mui/icons-material/CameraAlt';
import Settings from '@mui/icons-material/Settings';
import AccountCircle from '@mui/icons-material/AccountCircle';
import QrCode from '@mui/icons-material/QrCode';
import Paper from '@mui/material/Paper';

function getAuthUser() {
    const raw = localStorage.getItem('authUser');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export default function FixedBottomNavigation() {
    const currentUser = getAuthUser();
    const isStaff = currentUser?.role === 'staff';

    return(
        <Box>
            <CssBaseline />
            <Paper className="bottom-nav" elevation={3}>
                <BottomNavigation className="bottom-nav-content">
                    <BottomNavigationAction
                        className="bottom-nav-action"
                        label="Chat"
                        value="chat"
                        icon={<ChatIcon />}
                        component={Link}
                        to="/chat"
                    />
                    {isStaff && (
                        <BottomNavigationAction
                            className="bottom-nav-action"
                            label="Dashboard"
                            value="dashboard"
                            icon={<DashboardIcon />}
                            component={Link}
                            to="/dashboard"
                        />
                    )}
                    {isStaff && (
                        <BottomNavigationAction
                            className="bottom-nav-action"
                            label="Camera"
                            value="camera"
                            icon={
                                <Box sx={{
                                    bgcolor: '#3b82f6',
                                    borderRadius: '50%',
                                    width: 44,
                                    height: 44,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <CameraAlt sx={{ fontSize: 26, color: '#fff' }} />
                                </Box>
                            }
                            component={Link}
                            to="/camera"
                        />
                    )}
                    {isStaff && (
                        <BottomNavigationAction
                            className="bottom-nav-action"
                            label="Profile"
                            value="profile"
                            icon={<AccountCircle />}
                            component={Link}
                            to="/profile"
                        />
                    )}
                    {!isStaff && (
                        <BottomNavigationAction
                            className="bottom-nav-action"
                            label="Badge"
                            value="badge"
                            icon={
                                <Box sx={{
                                    bgcolor: '#3b82f6',
                                    borderRadius: '50%',
                                    width: 44,
                                    height: 44,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <QrCode sx={{ fontSize: 26, color: '#fff' }} />
                                </Box>
                            }
                            component={Link}
                            to="/badge"
                        />
                    )}
                    <BottomNavigationAction
                        className="bottom-nav-action"
                        label="Settings"
                        value="settings"
                        icon={<Settings />}
                        component={Link}
                        to="/"
                    />
                </BottomNavigation>
            </Paper>
        </Box>
    );
}
