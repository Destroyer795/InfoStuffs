import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Card, CardContent } from '@mui/material';
import { getOfflineNotes } from '../utils/localStore';

const OfflineVault = () => {
  const [cachedNotes, setCachedNotes] = useState([]);

  useEffect(() => {
    const loadCache = async () => {
      const data = await getOfflineNotes();
      setCachedNotes(data);
    };
    loadCache();
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
      <Typography variant="h3" fontWeight="bold" gutterBottom color="primary">
        Zero-Knowledge Offline Vault
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        You are currently offline. Clerk authentication is disabled.
      </Typography>

      {cachedNotes.length === 0 ? (
        <Typography variant="body2" color="error">
          No cached notes found in IndexedDB. Please connect to the internet to sync your vault.
        </Typography>
      ) : (
        <Box sx={{ mt: 4, textAlign: 'left' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Encrypted Payloads Found: {cachedNotes.length}
          </Typography>
          {cachedNotes.map((note) => (
            <Card key={note._id} sx={{ mb: 2, bgcolor: 'background.paper' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Document ID: {note._id}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, wordBreak: 'break-all' }}>
                  <strong>Encrypted Name:</strong> {note.name || note.title || 'Untitled'}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
};

export default OfflineVault;
