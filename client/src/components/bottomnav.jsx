import * as React from 'react';
import { Link } from "react-router-dom";

import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import ChatIcon from '@mui/icons-material/Chat';
import CameraIcon from '@mui/icons-material/Camera';
import Settings from '@mui/icons-material/Settings';
import Paper from '@mui/material/Paper';

export default function FixedBottomNavigation() {
    return(
        <Box sx={{ pb: 7 }}>
            <CssBaseline />
            <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
                <BottomNavigation>
                    <BottomNavigationAction
                        label="Chat"
                        value="chat"
                        icon={<ChatIcon />}
                        component={Link}
                        to="/chat"
                    />
                    <BottomNavigationAction
                        label="Camera"
                        value="camera"
                        icon={<CameraIcon />}
                        component={Link}
                        to="/camera"
                    />
                    <BottomNavigationAction
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
