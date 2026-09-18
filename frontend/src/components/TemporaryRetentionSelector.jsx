import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Stack,
  Chip,
  TextField,
  Button,
  ButtonGroup,
  useTheme
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TimerIcon from '@mui/icons-material/Timer';
import {
  calculateExpirationDate,
  formatExpirationPreview,
  formatExpirationLabel,
  toLocalISOString
} from '../utils/snippet';

/**
 * Enhanced retention selector for temporary notes.
 * Supports:
 * - Presets: 24 Hours, 7 Days, 30 Days, 90 Days
 * - Custom Duration: Exact combined Days, Hours, and Minutes (e.g. 2h 30m)
 * - Specific Date & Time: Calendar + Time picker (datetime-local)
 * - Live dynamic preview of exact expiration time and countdown.
 */
export default function TemporaryRetentionSelector({
  isTemporary,
  onToggleTemporary,
  config,
  onChangeConfig
}) {
  const theme = useTheme();

  // Ensure config has all safe defaults
  const safeConfig = useMemo(() => ({
    preset: config?.preset || 30,
    customMode: config?.customMode || 'duration',
    days: config?.days !== undefined ? config.days : 0,
    hours: config?.hours !== undefined ? config.hours : 2,
    minutes: config?.minutes !== undefined ? config.minutes : 30,
    specificDate: config?.specificDate || toLocalISOString(Date.now() + 2.5 * 60 * 60 * 1000)
  }), [config]);

  // Compute live target expiration timestamp
  const targetDate = useMemo(() => {
    if (!isTemporary) return null;
    return calculateExpirationDate(safeConfig);
  }, [isTemporary, safeConfig]);

  // Live countdown label
  const liveCountdown = useMemo(() => {
    if (!targetDate) return '';
    return formatExpirationLabel(targetDate);
  }, [targetDate]);

  // Live formatted date
  const liveDateStr = useMemo(() => {
    if (!targetDate) return '';
    return formatExpirationPreview(targetDate);
  }, [targetDate]);

  const update = (partial) => {
    onChangeConfig({
      ...safeConfig,
      ...partial
    });
  };

  const nowLocalStr = useMemo(() => toLocalISOString(Date.now() + 60 * 1000), []);

  return (
    <Box
      sx={{
        p: 1.8,
        borderRadius: '10px',
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        transition: 'all 0.2s ease-in-out'
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

          {/* Preset options */}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {[
              { label: '24 Hours', value: 1 },
              { label: '7 Days', value: 7 },
              { label: '30 Days', value: 30 },
              { label: '90 Days', value: 90 },
              { label: 'Custom', value: 'custom' },
            ].map((opt) => {
              const isSelected = safeConfig.preset === opt.value;
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  onClick={() => update({ preset: opt.value })}
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

          {/* Custom Section */}
          {safeConfig.preset === 'custom' && (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: '8px', bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', border: `1px dashed ${theme.palette.divider}` }}>
              {/* Mode switch: Duration vs Specific Date & Time */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                  Custom Options:
                </Typography>
                <ButtonGroup size="small" variant="outlined">
                  <Button
                    startIcon={<TimerIcon sx={{ fontSize: 16 }} />}
                    variant={safeConfig.customMode === 'duration' ? 'contained' : 'outlined'}
                    color={safeConfig.customMode === 'duration' ? 'warning' : 'inherit'}
                    onClick={() => update({ customMode: 'duration' })}
                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
                    className="cursor-hover-target"
                  >
                    Duration
                  </Button>
                  <Button
                    startIcon={<CalendarMonthIcon sx={{ fontSize: 16 }} />}
                    variant={safeConfig.customMode === 'datetime' ? 'contained' : 'outlined'}
                    color={safeConfig.customMode === 'datetime' ? 'warning' : 'inherit'}
                    onClick={() => update({ customMode: 'datetime' })}
                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
                    className="cursor-hover-target"
                  >
                    Specific Date & Time
                  </Button>
                </ButtonGroup>
              </Box>

              {/* Duration mode: Days, Hours, Minutes */}
              {safeConfig.customMode === 'duration' && (
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <TextField
                    type="number"
                    size="small"
                    label="Days"
                    value={safeConfig.days === '' ? '' : safeConfig.days}
                    onChange={(e) => {
                      const val = e.target.value;
                      update({ days: val === '' ? '' : Math.max(0, parseInt(val, 10) || 0) });
                    }}
                    inputProps={{ min: 0, max: 365 }}
                    sx={{ width: { xs: '80px', sm: '95px' } }}
                    className="cursor-hover-target"
                  />
                  <TextField
                    type="number"
                    size="small"
                    label="Hours"
                    value={safeConfig.hours === '' ? '' : safeConfig.hours}
                    onChange={(e) => {
                      const val = e.target.value;
                      update({ hours: val === '' ? '' : Math.max(0, Math.min(23, parseInt(val, 10) || 0)) });
                    }}
                    inputProps={{ min: 0, max: 23 }}
                    sx={{ width: { xs: '80px', sm: '95px' } }}
                    className="cursor-hover-target"
                  />
                  <TextField
                    type="number"
                    size="small"
                    label="Minutes"
                    value={safeConfig.minutes === '' ? '' : safeConfig.minutes}
                    onChange={(e) => {
                      const val = e.target.value;
                      update({ minutes: val === '' ? '' : Math.max(0, Math.min(59, parseInt(val, 10) || 0)) });
                    }}
                    inputProps={{ min: 0, max: 59 }}
                    sx={{ width: { xs: '85px', sm: '100px' } }}
                    className="cursor-hover-target"
                  />
                </Stack>
              )}

              {/* Specific Date & Time mode: HTML5 datetime-local */}
              {safeConfig.customMode === 'datetime' && (
                <Box sx={{ mt: 0.5 }}>
                  <TextField
                    type="datetime-local"
                    size="small"
                    label="Expire on exact date & time"
                    value={safeConfig.specificDate || ''}
                    onChange={(e) => update({ specificDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: nowLocalStr }}
                    fullWidth
                    className="cursor-hover-target"
                  />
                </Box>
              )}
            </Box>
          )}

          {/* Live Expiration Preview */}
          <Box
            sx={{
              mt: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.8,
              py: 0.8,
              px: 1.2,
              borderRadius: '6px',
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.08)' : 'rgba(255, 152, 0, 0.12)',
              border: '1px solid rgba(255, 152, 0, 0.3)'
            }}
          >
            <AccessTimeIcon sx={{ fontSize: 16, color: '#ff9800' }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: theme.palette.mode === 'dark' ? '#ffb74d' : '#d84315',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                flexWrap: 'wrap'
              }}
            >
              <span>Will expire on:</span>
              <span style={{ textDecoration: 'underline' }}>{liveDateStr}</span>
              <span>({liveCountdown})</span>
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
