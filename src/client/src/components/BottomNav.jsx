import * as React from 'react';
import { Link } from "react-router-dom";

import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import ChatIcon from '@mui/icons-material/Chat';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CameraAlt from '@mui/icons-material/CameraAlt';
import Settings from '@mui/icons-material/Settings';
import Paper from '@mui/material/Paper';

export default function FixedBottomNavigation() {
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
                    <BottomNavigationAction
                        className="bottom-nav-action"
                        label="Dashboard"
                        value="dashboard"
                        icon={<DashboardIcon />}
                        component={Link}
                        to="/dashboard"
                    />
                    <BottomNavigationAction
                        className="bottom-nav-action"
                        label="Camera"
                        value="camera"
                        icon={<CameraAlt />}
                        component={Link}
                        to="/camera"
                    />
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
