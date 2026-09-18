import React from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Stack,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme
} from '@mui/material';

/**
 * Reusable retention duration selector for temporary notes.
 * Supports presets (24 Hours, 7 Days, 30 Days, 90 Days) and Custom duration (minutes, hours, days).
 */
export default function TemporaryRetentionSelector({
  isTemporary,
  onToggleTemporary,
  preset,
  onPresetChange,
  customValue,
  onCustomValueChange,
  customUnit,
  onCustomUnitChange
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: '8px',
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
      }}
    >
      <FormControlLabel
        control={
          <Switch
            checked={Boolean(isTemporary)}
            onChange={(e) => onToggleTemporary(e.target.checked)}
            color="warning"
          />
        }
        label={
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Temporary Note (Auto-Deletes)
          </Typography>
        }
        className="cursor-hover-target"
      />

      {isTemporary && (
        <Box sx={{ mt: 1.5, pl: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
            Expires in:
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {[
              { label: '24 Hours', value: 1 },
              { label: '7 Days', value: 7 },
              { label: '30 Days', value: 30 },
              { label: '90 Days', value: 90 },
              { label: 'Custom', value: 'custom' },
            ].map((opt) => {
              const isSelected = preset === opt.value;
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  onClick={() => onPresetChange(opt.value)}
                  variant={isSelected ? "filled" : "outlined"}
                  color={isSelected ? "warning" : "default"}
                  className="cursor-hover-target"
                  sx={{
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    borderWidth: isSelected ? '2px' : '1px',
                    transition: 'all 0.1s ease-in-out',
                    '&:hover': {
                      transform: 'translate(-1px, -1px)',
                    }
                  }}
                />
              );
            })}
          </Stack>

          {preset === 'custom' && (
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField
                type="number"
                size="small"
                label="Duration"
                value={customValue}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    onCustomValueChange('');
                  } else {
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                      onCustomValueChange(parsed);
                    }
                  }
                }}
                inputProps={{ min: 1, max: 10000 }}
                sx={{ width: { xs: '120px', sm: '140px' } }}
                className="cursor-hover-target"
              />
              <FormControl size="small" sx={{ minWidth: '130px' }} className="cursor-hover-target">
                <InputLabel id="custom-retention-unit-label">Unit</InputLabel>
                <Select
                  labelId="custom-retention-unit-label"
                  value={customUnit || 'hours'}
                  label="Unit"
                  onChange={(e) => onCustomUnitChange(e.target.value)}
                >
                  <MenuItem value="minutes" className="cursor-hover-target">Minutes</MenuItem>
                  <MenuItem value="hours" className="cursor-hover-target">Hours</MenuItem>
                  <MenuItem value="days" className="cursor-hover-target">Days</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
