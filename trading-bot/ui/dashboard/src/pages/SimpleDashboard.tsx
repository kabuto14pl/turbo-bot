import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const SimpleDashboard: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Trading Bot Dashboard
      </Typography>
      
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6">
            System Status: Online
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Dashboard jest gotowy do działania!
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SimpleDashboard;
