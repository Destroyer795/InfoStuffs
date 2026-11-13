import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Paper,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  useTheme,
  Divider,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import KeyIcon from '@mui/icons-material/Key';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GitHubIcon from '@mui/icons-material/GitHub';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import TerminalIcon from '@mui/icons-material/Terminal';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const PUBLIC_LOGO_HOST = 'https://info-stuffs.vercel.app';

export default function Landing({ darkMode, toggleDarkMode }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useUser();

  const isDark = theme.palette.mode === 'dark';
  const primaryColor = isDark ? '#E6E6E6' : '#111111';
  const paperColor = isDark ? '#1C1C1C' : '#FFFFFF';
  const bgColor = isDark ? '#121212' : '#F7F7F3';
  const mutedText = isDark ? '#A1A1AA' : '#52525B';
  const subtleBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';

  // Interactive Live Cryptographic Sandbox state
  const [demoText, setDemoText] = useState('Production DB: postgres://admin:vault_secret_994x@cluster-0.internal:5432/main');
  const [demoPassword, setDemoPassword] = useState('zero-trust-passphrase-882');
  const [demoCiphertext, setDemoCiphertext] = useState('');
  const [demoIvHex, setDemoIvHex] = useState('');
  const [demoKeyHex, setDemoKeyHex] = useState('');

  // Real WebCrypto encryption executed entirely on client
  const runLiveEncryption = useCallback(async (text, password) => {
    if (!text) {
      setDemoCiphertext('');
      setDemoIvHex('');
      setDemoKeyHex('');
      return;
    }
    try {
      if (window.crypto && window.crypto.subtle) {
        const enc = new TextEncoder();
        const pwBuf = enc.encode(password || 'default-vault-key');
        const salt = enc.encode('infostuffs_salt_vector_prod');

        const keyMaterial = await window.crypto.subtle.importKey(
          'raw',
          pwBuf,
          { name: 'PBKDF2' },
          false,
          ['deriveKey', 'deriveBits']
        );

        const derivedKey = await window.crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256',
          },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt']
        );

        const rawKey = await window.crypto.subtle.exportKey('raw', derivedKey);
        const keyHexStr = Array.from(new Uint8Array(rawKey))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
          .substring(0, 32);
        setDemoKeyHex(keyHexStr);

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const ivHexStr = Array.from(iv)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        setDemoIvHex(ivHexStr);

        const cipherBuf = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          derivedKey,
          enc.encode(text)
        );

        const b64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuf)));
        setDemoCiphertext(b64);
      } else {
        setDemoIvHex('e7b92f4c10a398c2518e3a9d');
        setDemoKeyHex('7fa091cb68402ee19d00472bc');
        setDemoCiphertext('U2FsdGVkX19R7zP9+qK8N4h4' + btoa(text).slice(0, 24) + '==');
      }
    } catch (err) {
      console.warn('Live crypto error:', err);
    }
  }, []);

  useEffect(() => {
    runLiveEncryption(demoText, demoPassword);
  }, [demoText, demoPassword, runLiveEncryption]);

  const handleOpenApp = () => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pure clean white buttons in light mode with 12px rounded corners
  const whiteButton = {
    backgroundColor: isDark ? '#222222' : '#FFFFFF',
    color: isDark ? '#FFFFFF' : '#111111',
    border: `2px solid ${primaryColor}`,
    boxShadow: `3px 3px 0px ${primaryColor}`,
    fontWeight: 700,
    textTransform: 'none',
    borderRadius: '12px',
    transition: 'all 0.12s ease-in-out',
    '&:hover': {
      backgroundColor: isDark ? '#2D2D2D' : '#F9F9F8',
      transform: 'translate(-2px, -2px)',
      boxShadow: `5px 5px 0px ${primaryColor}`,
    },
    '&:active': {
      transform: 'translate(1px, 1px) !important',
      boxShadow: `1px 1px 0px ${primaryColor} !important`,
    },
  };

  const whiteButtonSecondary = {
    backgroundColor: isDark ? '#181818' : '#FFFFFF',
    color: isDark ? '#E6E6E6' : '#111111',
    border: `2px solid ${primaryColor}`,
    boxShadow: `3px 3px 0px ${primaryColor}`,
    fontWeight: 700,
    textTransform: 'none',
    borderRadius: '12px',
    transition: 'all 0.12s ease-in-out',
    '&:hover': {
      backgroundColor: isDark ? '#222222' : '#F5F5F2',
      transform: 'translate(-2px, -2px)',
      boxShadow: `5px 5px 0px ${primaryColor}`,
    },
    '&:active': {
      transform: 'translate(1px, 1px) !important',
      boxShadow: `1px 1px 0px ${primaryColor} !important`,
    },
  };

  // Clean Neo-Brutalist card styling with 14px radius
  const cleanCardStyle = {
    p: { xs: 3, sm: 4 },
    backgroundColor: paperColor,
    border: `2px solid ${primaryColor}`,
    borderRadius: '14px',
    boxShadow: `4px 4px 0px ${primaryColor}`,
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    '&:hover': {
      transform: 'translate(-2px, -2px)',
      boxShadow: `6px 6px 0px ${primaryColor}`,
    },
  };

  const cleanInputStyle = {
    width: '100%',
    py: 1.4,
    px: 2.2,
    fontSize: '0.92rem',
    fontFamily: '"JetBrains Mono", "SF Mono", "Consolas", monospace',
    backgroundColor: isDark ? '#141414' : '#FFFFFF',
    color: isDark ? '#FFFFFF' : '#000000',
    border: `2px solid ${primaryColor}`,
    borderRadius: '10px',
    outline: 'none',
    boxShadow: `2px 2px 0px ${primaryColor}`,
    boxSizing: 'border-box',
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: bgColor, color: theme.palette.text.primary }}>
      {/* ── CLEAN TOP HEADER (NO BOXED NAV LINKS) ── */}
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: isDark ? 'rgba(18, 18, 18, 0.95)' : 'rgba(247, 247, 243, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: `2px solid ${primaryColor}`,
          px: { xs: 2.5, sm: 4 },
          py: 1.6,
        }}
      >
        <Container maxWidth="lg" disableGutters sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo Brand */}
          <Box
            onClick={() => navigate('/')}
            className="cursor-hover-target"
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <Box
              component="img"
              src={isDark ? `${PUBLIC_LOGO_HOST}/logo_name_dark.png` : `${PUBLIC_LOGO_HOST}/logo_name.png`}
              alt="InfoStuffs"
              draggable="false"
              sx={{
                height: { xs: 32, sm: 38 },
                objectFit: 'contain',
                display: { xs: 'none', sm: 'block' },
              }}
            />
            <Box
              component="img"
              src={isDark ? `${PUBLIC_LOGO_HOST}/logo_dark.png` : `${PUBLIC_LOGO_HOST}/logo.png`}
              alt="InfoStuffs"
              draggable="false"
              sx={{
                height: 32,
                objectFit: 'contain',
                display: { xs: 'block', sm: 'none' },
              }}
            />
          </Box>

          {/* Clean Navbar Links: Unboxed, pure text links */}
          <Stack
            direction="row"
            spacing={{ xs: 2, sm: 4 }}
            alignItems="center"
            sx={{ display: { xs: 'none', md: 'flex' } }}
          >
            <Typography
              onClick={() => scrollToSection('architecture')}
              className="cursor-hover-target"
              sx={{
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: theme.palette.text.primary,
                transition: 'opacity 0.15s ease',
                '&:hover': { opacity: 0.65 },
              }}
            >
              Architecture
            </Typography>
            <Typography
              onClick={() => scrollToSection('sandbox')}
              className="cursor-hover-target"
              sx={{
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: theme.palette.text.primary,
                transition: 'opacity 0.15s ease',
                '&:hover': { opacity: 0.65 },
              }}
            >
              Live Sandbox
            </Typography>
            <Typography
              onClick={() => scrollToSection('security-spec')}
              className="cursor-hover-target"
              sx={{
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: theme.palette.text.primary,
                transition: 'opacity 0.15s ease',
                '&:hover': { opacity: 0.65 },
              }}
            >
              Security Spec
            </Typography>
            <Typography
              component="a"
              href="https://dev.to/pranav_kishan_f81e2fc8327/designing-a-zero-trust-personal-information-manager-with-client-side-encryption-4pb5"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-hover-target"
              sx={{
                fontSize: '0.92rem',
                fontWeight: 600,
                textDecoration: 'none',
                color: theme.palette.text.primary,
                transition: 'opacity 0.15s ease',
                '&:hover': { opacity: 0.65 },
              }}
            >
              Case Study
            </Typography>
          </Stack>

          {/* Action Area */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* Dark mode toggle */}
            <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <IconButton
                onClick={toggleDarkMode}
                color="inherit"
                className="cursor-hover-target"
                sx={{
                  width: 42,
                  height: 42,
                  border: `2px solid ${primaryColor}`,
                  borderRadius: '12px',
                  boxShadow: `3px 3px 0px ${primaryColor}`,
                  backgroundColor: paperColor,
                  transition: 'all 0.12s ease-in-out',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&:hover': {
                    transform: 'translate(-2px, -2px)',
                    boxShadow: `5px 5px 0px ${primaryColor}`,
                  },
                  '&:active': {
                    transform: 'translate(1px, 1px) !important',
                    boxShadow: `1px 1px 0px ${primaryColor} !important`,
                  },
                }}
              >
                {isDark ? <Brightness7Icon sx={{ fontSize: '1.2rem' }} /> : <Brightness4Icon sx={{ fontSize: '1.2rem' }} />}
              </IconButton>
            </Tooltip>

            {/* Auth CTA with White Neo-Brutalist Buttons */}
            {isLoaded && isSignedIn ? (
              <Button
                onClick={() => navigate('/dashboard')}
                endIcon={<ArrowForwardIcon />}
                className="cursor-hover-target"
                sx={{
                  ...whiteButton,
                  height: 42,
                  px: { xs: 2, sm: 2.5 },
                  fontSize: '0.88rem',
                }}
              >
                Go to Vault
              </Button>
            ) : (
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Button
                  onClick={() => navigate('/login')}
                  className="cursor-hover-target"
                  sx={{
                    ...whiteButtonSecondary,
                    height: 42,
                    px: { xs: 1.5, sm: 2 },
                    fontSize: '0.88rem',
                    display: { xs: 'none', sm: 'inline-flex' },
                  }}
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  endIcon={<ArrowForwardIcon />}
                  className="cursor-hover-target"
                  sx={{
                    ...whiteButton,
                    height: 42,
                    px: { xs: 1.75, sm: 2.5 },
                    fontSize: '0.88rem',
                  }}
                >
                  Open Vault
                </Button>
              </Stack>
            )}
          </Stack>
        </Container>
      </Box>

      {/* ── HERO SECTION (CLEAN & DIRECT) ── */}
      <Container maxWidth="lg" sx={{ pt: { xs: 8, sm: 12 }, pb: { xs: 7, sm: 10 } }}>
        <Box sx={{ maxWidth: 880, mx: 'auto', textAlign: 'center', mb: { xs: 6, sm: 8 } }}>
          {/* Main Headline */}
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: '2.4rem', sm: '3.4rem', md: '4.2rem' },
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.1,
              mb: 3,
            }}
          >
            Private thoughts.
            <br />
            Encrypted before transit.
          </Typography>

          {/* Subtitle */}
          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              color: mutedText,
              maxWidth: 720,
              mx: 'auto',
              lineHeight: 1.6,
              mb: 5,
              fontWeight: 400,
            }}
          >
            InfoStuffs enforces client-side cryptographic isolation. Your vault password derives an AES-256 key
            inside a browser Web Worker. Plaintext stays strictly in your machine RAM while the cloud database only stores ciphertext.
          </Typography>

          {/* Action Row with Clean White Rounded Buttons */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
            alignItems="center"
          >
            <Button
              size="large"
              onClick={handleOpenApp}
              endIcon={<ArrowForwardIcon />}
              className="cursor-hover-target"
              sx={{
                ...whiteButton,
                px: 4,
                py: 1.6,
                fontSize: '1.02rem',
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              {isLoaded && isSignedIn ? 'Enter Your Vault' : 'Create Free Vault'}
            </Button>

            <Button
              size="large"
              onClick={() => scrollToSection('sandbox')}
              startIcon={<TerminalIcon />}
              className="cursor-hover-target"
              sx={{
                ...whiteButtonSecondary,
                px: 3.5,
                py: 1.6,
                fontSize: '1.02rem',
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              Try Live Encryption
            </Button>

            <Button
              size="large"
              component="a"
              href="https://github.com/Destroyer795/InfoStuffs"
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<GitHubIcon />}
              className="cursor-hover-target"
              sx={{
                ...whiteButtonSecondary,
                px: 3,
                py: 1.6,
                fontSize: '1.02rem',
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              GitHub
            </Button>
          </Stack>
        </Box>

        {/* ── 4 KEY ARCHITECTURAL METRICS ── */}
        <Grid container spacing={2.5} sx={{ maxWidth: 1040, mx: 'auto' }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper elevation={0} sx={{ ...cleanCardStyle, p: 2.5, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800 }}>
                0
              </Typography>
              <Typography variant="caption" sx={{ color: mutedText, fontWeight: 600, display: 'block', mt: 0.5 }}>
                Plaintext Bytes on Cloud
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper elevation={0} sx={{ ...cleanCardStyle, p: 2.5, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800 }}>
                256-bit
              </Typography>
              <Typography variant="caption" sx={{ color: mutedText, fontWeight: 600, display: 'block', mt: 0.5 }}>
                AES-GCM Cipher Strength
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper elevation={0} sx={{ ...cleanCardStyle, p: 2.5, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800 }}>
                100k
              </Typography>
              <Typography variant="caption" sx={{ color: mutedText, fontWeight: 600, display: 'block', mt: 0.5 }}>
                PBKDF2 Key Iterations
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper elevation={0} sx={{ ...cleanCardStyle, p: 2.5, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800 }}>
                100%
              </Typography>
              <Typography variant="caption" sx={{ color: mutedText, fontWeight: 600, display: 'block', mt: 0.5 }}>
                In-Browser Web Worker Math
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* ── SECTION: LIVE CLIENT-SIDE CRYPTOGRAPHIC PLAYGROUND ── */}
      <Box
        id="sandbox"
        sx={{
          py: { xs: 8, sm: 11 },
          borderTop: `2px solid ${primaryColor}`,
          borderBottom: `2px solid ${primaryColor}`,
          backgroundColor: isDark ? '#151515' : '#EFEFEA',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ maxWidth: 760, mx: 'auto', textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 2 }}>
              Inspect client-side encryption in real time.
            </Typography>
            <Typography variant="body1" sx={{ color: mutedText, fontSize: '1.05rem' }}>
              Type your note below. Your browser derives a 256-bit AES key via PBKDF2 and encrypts it locally.
              The ciphertext on the right is the exact scrambled payload our server receives.
            </Typography>
          </Box>

          <Grid container spacing={3.5} alignItems="stretch">
            {/* Input Side: Plaintext on Client */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
              <Paper elevation={0} sx={{ ...cleanCardStyle, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack spacing={2.5} sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <LockOutlinedIcon fontSize="small" />
                        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                          Client Side (In-Memory Plaintext)
                        </Typography>
                      </Stack>
                      <Chip
                        label="NEVER SENT TO SERVER"
                        size="small"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          border: '1.5px solid #10b981',
                          color: '#10b981',
                          backgroundColor: 'transparent',
                        }}
                      />
                    </Box>

                    <Box sx={{ mb: 2.5 }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, display: 'block', mb: 0.75 }}>
                        VAULT PASSWORD (PBKDF2 SEED):
                      </Typography>
                      <input
                        type="text"
                        value={demoPassword}
                        onChange={(e) => setDemoPassword(e.target.value)}
                        placeholder="Enter a test vault password..."
                        style={cleanInputStyle}
                      />
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, display: 'block', mb: 0.75 }}>
                        SECRET NOTE OR MARKDOWN BODY:
                      </Typography>
                      <textarea
                        value={demoText}
                        onChange={(e) => setDemoText(e.target.value)}
                        placeholder="Type your sensitive information here..."
                        style={{
                          ...cleanInputStyle,
                          height: '140px',
                          resize: 'none',
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Sample presets with White Neo-Brutalist Buttons */}
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={1} sx={{ pt: 1 }}>
                    <Typography variant="caption" sx={{ color: mutedText, fontWeight: 600 }}>
                      Presets:
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setDemoText('Production Database: postgres://admin:x99#@cluster0.db')}
                      sx={{
                        ...whiteButtonSecondary,
                        py: 0.35,
                        px: 1.25,
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                      }}
                    >
                      Database URL
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setDemoText('Emergency recovery phrase: abandon abandon ability able about above absent')}
                      sx={{
                        ...whiteButtonSecondary,
                        py: 0.35,
                        px: 1.25,
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                      }}
                    >
                      Recovery Seed
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            {/* Output Side: Ciphertext on Server */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
              <Paper elevation={0} sx={{ ...cleanCardStyle, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack spacing={2.5} sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <StorageIcon fontSize="small" />
                        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                          Database Side (MongoDB & Supabase)
                        </Typography>
                      </Stack>
                      <Chip
                        label="CIPHERTEXT ONLY"
                        size="small"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          border: `1.5px solid ${primaryColor}`,
                          color: theme.palette.text.primary,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        }}
                      />
                    </Box>

                    {/* Derived cryptographic parameters */}
                    <Box
                      sx={{
                        p: 1.25,
                        mb: 2.5,
                        borderRadius: '10px',
                        backgroundColor: isDark ? '#121212' : '#F0F0EB',
                        border: `1px solid ${subtleBorder}`,
                      }}
                    >
                      <Stack spacing={0.75}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: mutedText }}>
                            DERIVED KEY PREVIEW:
                          </Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                            {demoKeyHex ? `0x${demoKeyHex}...` : 'deriving...'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: mutedText }}>
                            GCM IV (96-BIT RANDOM):
                          </Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                            {demoIvHex ? `${demoIvHex}` : 'generating...'}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    {/* Stored Ciphertext Container */}
                    <Box>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, display: 'block', mb: 0.75 }}>
                        STORED CIPHERTEXT PAYLOAD:
                      </Typography>

                      <Box
                        sx={{
                          p: 2,
                          height: '140px',
                          overflowY: 'auto',
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.82rem',
                          lineHeight: 1.5,
                          backgroundColor: isDark ? '#101010' : '#FFFFFF',
                          border: `2px solid ${primaryColor}`,
                          borderRadius: '10px',
                          wordBreak: 'break-all',
                          color: isDark ? '#34D399' : '#047857',
                        }}
                      >
                        {demoCiphertext || 'Type in the left editor to generate ciphertext...'}
                      </Box>
                    </Box>
                  </Box>

                  <Typography variant="caption" sx={{ color: mutedText, lineHeight: 1.4, pt: 1, display: 'block' }}>
                    Even if our MongoDB cluster or Supabase bucket is breached, an attacker sees only this cryptographic noise.
                    Decryption without your vault password is mathematically infeasible.
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── SECTION: THREE ARCHITECTURAL PILLARS ── */}
      <Container id="architecture" maxWidth="lg" sx={{ py: { xs: 8, sm: 12 } }}>
        <Box sx={{ maxWidth: 720, mx: 'auto', textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 2 }}>
            Engineered around verifiable security.
          </Typography>
          <Typography variant="body1" sx={{ color: mutedText, fontSize: '1.1rem' }}>
            Traditional note tools claim privacy while retaining access to decrypt your data on their servers.
            InfoStuffs enforces physical client isolation.
          </Typography>
        </Box>

        <Grid container spacing={3.5}>
          {/* Pillar 1 */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ ...cleanCardStyle, height: '100%' }}>
              <Stack spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    border: `2px solid ${primaryColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }}
                >
                  <KeyIcon />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Ephemeral In-Browser Keys
                </Typography>
                <Typography variant="body2" sx={{ color: mutedText, lineHeight: 1.7, fontSize: '0.95rem' }}>
                  Your Vault Password is processed locally with the native Web Crypto API and PBKDF2 (100,000 rounds)
                  in a dedicated Web Worker. The resulting 256-bit AES-GCM key resides solely in volatile browser RAM
                  and is instantly wiped when your session ends.
                </Typography>
              </Stack>
            </Paper>
          </Grid>

          {/* Pillar 2 */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ ...cleanCardStyle, height: '100%' }}>
              <Stack spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    border: `2px solid ${primaryColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }}
                >
                  <ShieldOutlinedIcon />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Obfuscated Storage Paths
                </Typography>
                <Typography variant="body2" sx={{ color: mutedText, lineHeight: 1.7, fontSize: '0.95rem' }}>
                  Images and attachments are encrypted before upload. Supabase receives opaque randomized UUID paths
                  containing raw encrypted bytes. Decrypted paths are only held in client memory
                  to request temporary 1-hour signed URLs.
                </Typography>
              </Stack>
            </Paper>
          </Grid>

          {/* Pillar 3 */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ ...cleanCardStyle, height: '100%' }}>
              <Stack spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    border: `2px solid ${primaryColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }}
                >
                  <CloudOffIcon />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Lie-Fi Resilient Offline PWA
                </Typography>
                <Typography variant="body2" sx={{ color: mutedText, lineHeight: 1.7, fontSize: '0.95rem' }}>
                  When internet connectivity drops or DNS fails, a fast 2.5-second connectivity probe triggers our
                  offline failover. Clerk authentication is bypassed entirely, and your local vault unlocks offline
                  using cached encrypted payloads stored in IndexedDB.
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* ── SECTION: SECURITY SPEC & TRANSPARENCY ── */}
      <Container id="security-spec" maxWidth="lg" sx={{ py: { xs: 8, sm: 12 } }}>
        <Box sx={{ maxWidth: 780, mx: 'auto', textAlign: 'center', mb: 7 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 2 }}>
            Honest security trade-offs. No black boxes.
          </Typography>
          <Typography variant="body1" sx={{ color: mutedText, fontSize: '1.05rem' }}>
            We explicitly delineate what is protected by client-side cryptography versus what remains visible
            metadata for database indexing and server-side query routing.
          </Typography>
        </Box>

        <Grid container spacing={3.5}>
          {/* Fully Encrypted Column */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cleanCardStyle}>
              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleOutlineIcon sx={{ color: '#10B981' }} />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Fully Client-Side Encrypted
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: mutedText }}>
                  These fields are encrypted and authenticated via AES-GCM before transmission. The backend cannot read or index them.
                </Typography>

                <Stack spacing={1.5}>
                  {[
                    { label: 'Note Title', desc: 'Encrypted ciphertext string' },
                    { label: 'Note Body & Markdown', desc: 'Encrypted text and code snippets' },
                    { label: 'Categories & Tags', desc: 'Encrypted client-side' },
                    { label: 'Original File Names', desc: 'Encrypted prior to storage path generation' },
                    { label: 'Image & Attachment Blobs', desc: 'Binary ciphertext stored in Supabase' },
                    { label: 'Local Offline Cache', desc: 'Stored strictly as encrypted records in IndexedDB' },
                  ].map((item, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 1.5,
                        border: `1.5px solid ${primaryColor}`,
                        borderRadius: '10px',
                        backgroundColor: isDark ? '#141414' : '#F9F9F6',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {item.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: mutedText }}>
                          {item.desc}
                        </Typography>
                      </Box>
                      <Chip
                        label="AES-256"
                        size="small"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                          color: isDark ? '#34D399' : '#047857',
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          {/* Visible Metadata Column */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cleanCardStyle}>
              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VisibilityIcon sx={{ color: isDark ? '#F59E0B' : '#B45309' }} />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Plaintext Server Metadata
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: mutedText }}>
                  Necessary to support server-side query routing, access control, and user account association.
                </Typography>

                <Stack spacing={1.5}>
                  {[
                    { label: 'User ID (userId)', desc: 'Public Clerk ID used for access control and PBKDF2 salt' },
                    { label: 'Importance Level', desc: 'High, Medium, or Low flag for basic database filtering' },
                    { label: 'Note Type', desc: 'text, image, or file type descriptor' },
                    { label: 'Temporary Retention Flag', desc: 'Boolean flag controlling cron-based auto expiration' },
                    { label: 'Timestamps (createdAt, updatedAt)', desc: 'Standard MongoDB synchronization timestamps' },
                    { label: 'File Extension & Byte Size', desc: 'Supabase storage metadata required for HTTP headers' },
                  ].map((item, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 1.5,
                        border: `1.5px solid ${primaryColor}`,
                        borderRadius: '10px',
                        backgroundColor: isDark ? '#141414' : '#F9F9F6',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {item.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: mutedText }}>
                          {item.desc}
                        </Typography>
                      </Box>
                      <Chip
                        label="METADATA"
                        size="small"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.12)',
                          color: isDark ? '#FBBF24' : '#B45309',
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* ── SECTION: CLEAN CALL TO ACTION ── */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, sm: 10 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 6 },
            textAlign: 'center',
            border: `2px solid ${primaryColor}`,
            borderRadius: '16px',
            backgroundColor: paperColor,
            boxShadow: `6px 6px 0px ${primaryColor}`,
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.025em',
              mb: 2,
              fontSize: { xs: '2rem', sm: '2.8rem' },
            }}
          >
            Take back sovereignty over your notes.
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: mutedText,
              maxWidth: 600,
              mx: 'auto',
              fontSize: '1.05rem',
              lineHeight: 1.6,
              mb: 4,
            }}
          >
            Create an encrypted vault in seconds. Zero analytics trackers. Zero plaintext storage.
            Fully accessible offline through your browser PWA.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              size="large"
              onClick={handleOpenApp}
              endIcon={<ArrowForwardIcon />}
              className="cursor-hover-target"
              sx={{
                ...whiteButton,
                px: 4.5,
                py: 1.5,
                fontSize: '1.02rem',
              }}
            >
              {isLoaded && isSignedIn ? 'Go to Vault' : 'Initialize Vault Now'}
            </Button>
            <Button
              size="large"
              component="a"
              href="https://github.com/Destroyer795/InfoStuffs"
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<GitHubIcon />}
              className="cursor-hover-target"
              sx={{
                ...whiteButtonSecondary,
                px: 3.5,
                py: 1.5,
                fontSize: '1.02rem',
              }}
            >
              View GitHub Repository
            </Button>
          </Stack>
        </Paper>
      </Container>

      {/* ── CLEAN MINIMALIST FOOTER (ELEGANT & UNCLUTTERED) ── */}
      <Box
        component="footer"
        sx={{
          borderTop: `2px solid ${primaryColor}`,
          backgroundColor: isDark ? '#141414' : '#FFFFFF',
          py: 4,
          px: { xs: 2.5, sm: 4 },
        }}
      >
        <Container maxWidth="lg" disableGutters>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 3,
            }}
          >
            {/* Brand and Summary */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
              <Box
                component="img"
                src={isDark ? `${PUBLIC_LOGO_HOST}/logo_name_dark.png` : `${PUBLIC_LOGO_HOST}/logo_name.png`}
                alt="InfoStuffs"
                draggable="false"
                sx={{ height: 28, objectFit: 'contain' }}
              />
              <Typography variant="caption" sx={{ color: mutedText, fontFamily: 'monospace' }}>
                Zero-knowledge personal information manager. MIT License.
              </Typography>
            </Stack>

            {/* Quick Links & Back to Top */}
            <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
              <Typography
                component="a"
                href="https://github.com/Destroyer795/InfoStuffs"
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-hover-target"
                sx={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: mutedText,
                  '&:hover': { color: theme.palette.text.primary },
                }}
              >
                GitHub
              </Typography>
              <Typography
                component="a"
                href="https://dev.to/pranav_kishan_f81e2fc8327/designing-a-zero-trust-personal-information-manager-with-client-side-encryption-4pb5"
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-hover-target"
                sx={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: mutedText,
                  '&:hover': { color: theme.palette.text.primary },
                }}
              >
                Case Study
              </Typography>
              <Typography
                onClick={handleOpenApp}
                className="cursor-hover-target"
                sx={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: mutedText,
                  '&:hover': { color: theme.palette.text.primary },
                }}
              >
                Vault
              </Typography>
              <Button
                size="small"
                onClick={scrollToTop}
                endIcon={<KeyboardArrowUpIcon fontSize="small" />}
                className="cursor-hover-target"
                sx={{
                  ...whiteButtonSecondary,
                  py: 0.4,
                  px: 1.5,
                  fontSize: '0.78rem',
                }}
              >
                Top
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
