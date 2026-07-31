import { Link } from "react-router-dom";

import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Badge from '@mui/material/Badge';
import ChatIcon from '@mui/icons-material/Chat';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CameraAlt from '@mui/icons-material/CameraAlt';
import AccountCircle from '@mui/icons-material/AccountCircle';
import QrCode from '@mui/icons-material/QrCode';
import Paper from '@mui/material/Paper';
import { useConnectivity } from '../../hooks/useConnectivity';

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
    const { isOnline } = useConnectivity();

    return(
        <Box>
            <CssBaseline />
            <Paper className="bottom-nav" elevation={3}>
                <BottomNavigation className="bottom-nav-content">
                    <BottomNavigationAction
                        className="bottom-nav-action"
                        label={isOnline ? "Chat" : "Chat (offline)"}
                        value="chat"
                        icon={
                            <Badge color="error" variant="dot" invisible={isOnline}>
                                <ChatIcon sx={{ opacity: isOnline ? 1 : 0.4 }} />
                            </Badge>
                        }
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
                            icon={<CameraAlt/>}
                            component={Link}
                            to="/camera"
                        />
                    )}
                    {!isStaff && (
                        <BottomNavigationAction
                            className="bottom-nav-action"
                            label="Badge"
                            value="badge"
                            icon={
                                <QrCode />}
                            component={Link}
                            to="/badge"
                        />
                    )}
                    <BottomNavigationAction
                        className="bottom-nav-action"
                        label="Profile"
                        value="profile"
                        icon={<AccountCircle />}
                        component={Link}
                        to="/profile"
                    />
                </BottomNavigation>
            </Paper>
        </Box>
    );
}
