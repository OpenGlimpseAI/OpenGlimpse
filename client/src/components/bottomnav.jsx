import * as React from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import ChatIcon from '@mui/icons-material/Chat';
import CameraIcon from '@mui/icons-material/Camera';
import Settings from '@mui/icons-material/Settings';
import Paper from '@mui/material/Paper';

export default function FixedBottomNavigation() {
    const [value, setValue] = React.useState(0);
    const ref = React.useRef(null);
    return(
        <Box sx={{ pb: 7 }} ref={ref}>
            <CssBaseline />
            <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
                <BottomNavigation
                    showLabels
                    value={value}
                    onChange={(event, newValue) => {
                        setValue(newValue);
                    }}
                >
                    <BottomNavigationAction label="Chat" icon={<ChatIcon />} />
                    <BottomNavigationAction label="Camera" icon={<CameraIcon />} />
                    <BottomNavigationAction label="Settings" icon={<Settings />} />
                </BottomNavigation>
            </Paper>
        </Box>
    );
}
