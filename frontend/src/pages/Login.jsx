import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Paper,
  useTheme,
  Divider,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';

export default function Login() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();
  const theme = useTheme();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleOAuth = async (strategy) => {
    if (!isLoaded) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (err) {
      setError(err.errors?.[0]?.longMessage || 'An unexpected error occurred.');
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;

    setIsSubmitting(true);
    setError('');

    try {
      const result = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        navigate('/');
      } else {
        console.error(JSON.stringify(result, null, 2));
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError(err.errors?.[0]?.longMessage || 'An unexpected error occurred.');
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formStyles = {
    p: { xs: 3, sm: 4 },
    width: '100%',
    maxWidth: 450,
    borderRadius: 2,
    border: `2px solid ${theme.palette.text.primary}`,
    boxShadow: theme.palette.mode === 'dark' ? `6px 6px 0px #2979ff` : `6px 6px 0px #000`,
  };

  const socialButtonStyles = {
    justifyContent: 'center',
    py: 1.5,
    fontWeight: 'bold',
    fontSize: '1rem',
    borderWidth: 2,
    borderRadius: 1,
    flex: 1,
  };
  
  const continueButtonStyles = {
    py: 1.5,
    fontWeight: 'bold',
    fontSize: '1rem',
    borderWidth: 2,
    borderRadius: 1,
    boxShadow: `3px 3px 0px ${theme.palette.primary.main}`,
    transition: 'all 0.1s ease-in-out',
    '&:hover': {
      transform: 'translate(-2px, -2px)',
      boxShadow: `5px 5px 0px ${theme.palette.primary.main}`,
      borderWidth: 2,
    },
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 70px)', p: 2 }}>
      <Paper component="form" onSubmit={handleSubmit} elevation={0} sx={formStyles}>
        <Stack spacing={2}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            Sign in to InfoStuffs
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Welcome back! Please sign in to continue
          </Typography>

          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="outlined" color="primary" onClick={() => handleOAuth('oauth_google')} startIcon={<GoogleIcon />} sx={socialButtonStyles}>
              Google
            </Button>
            <Button variant="outlined" color="primary" onClick={() => handleOAuth('oauth_microsoft')} startIcon={<MicrosoftIcon />} sx={socialButtonStyles}>
              Microsoft
            </Button>
          </Stack>

          <Divider sx={{ color: theme.palette.text.secondary, fontSize: '0.9rem' }}>OR</Divider>

          <TextField
            label="Email Address"
            type="email"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />
          <Button type="submit" variant="outlined" color="primary" disabled={isSubmitting} sx={continueButtonStyles}>
            {isSubmitting ? 'Signing in...' : 'Continue'}
          </Button>

          {error && <Typography color="error" align="center" variant="body2">{error}</Typography>}

          <Typography variant="body2" align="center">
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
              Sign up
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}