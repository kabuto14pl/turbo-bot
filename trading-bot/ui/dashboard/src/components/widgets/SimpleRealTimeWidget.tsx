import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip,
  CircularProgress 
} from '@mui/material';

const SimpleRealTimeWidget: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Live Prices
          </Typography>
          <Chip 
            size="small" 
            label="LIVE" 
            color="success" 
            variant="outlined"
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          Price data will be loaded here
        </Typography>
      </CardContent>
    </Card>
  );
};

export default SimpleRealTimeWidget;
