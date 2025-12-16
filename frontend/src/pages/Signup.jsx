import { useState } from 'react';
import { useSignUp } from '@clerk/clerk-react';
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
  IconButton,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';

export default function Signup() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const navigate = useNavigate();
  const theme = useTheme();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    emailAddress: '',
    password: '',
  });
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOAuth = async (strategy) => {
    if (!isLoaded) return;
    try {
      await signUp.authenticateWithRedirect({
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
      await signUp.create({
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        emailAddress: formData.emailAddress,
        password: formData.password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      setError(err.errors?.[0]?.longMessage || 'An unexpected error occurred.');
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;

    setIsSubmitting(true);
    setError('');

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        navigate('/');
      } else {
        setError("Verification failed. Please check the code and try again.");
      }
    } catch (err) {
      setError(err.errors?.[0]?.longMessage || 'Verification failed.');
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

  const buttonStyles = {
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

  const socialButtonStyles = {
    py: 1.2,
    textTransform: 'none',
    fontWeight: 600,
    justifyContent: 'center',
    flex: 1,
    borderWidth: 2,
    borderRadius: 1,
    '&:hover': {
      borderWidth: 2,
    },
  };

  if (!pendingVerification) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 70px)', p: 2 }}>
        <Paper component="form" onSubmit={handleSubmit} elevation={0} sx={formStyles}>
          <Stack spacing={2}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
              Create your account
            </Typography>

            <Typography variant="body1" sx={{ color: 'text.secondary', pb: 1 }}>
              Keep your important texts, images, and files organized and accessible in one place, whenever you need them.
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

            <Stack direction="row" spacing={2}>
              <TextField name="firstName" label="First Name" onChange={handleInputChange} fullWidth />
              <TextField name="lastName" label="Last Name" onChange={handleInputChange} fullWidth />
            </Stack>
            <TextField name="username" label="Username" onChange={handleInputChange} required fullWidth />
            <TextField name="emailAddress" label="Email Address" type="email" onChange={handleInputChange} required fullWidth />
            <TextField name="password" label="Password" type="password" onChange={handleInputChange} required fullWidth />
            
            <Button type="submit" variant="outlined" color="primary" disabled={isSubmitting} sx={buttonStyles}>
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
            
            {error && <Typography color="error" align="center" variant="body2">{error}</Typography>}
            
            <Typography variant="body2" align="center">
              Already have an account?{' '}
              <Link to="/login" style={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
                Sign in
              </Link>
            </Typography>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 70px)', p: 2 }}>
      <Paper component="form" onSubmit={handleVerify} elevation={0} sx={formStyles}>
        <Stack spacing={3}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            Verify your email
          </Typography>
          <Typography variant="body1">
            A verification code has been sent to {formData.emailAddress}.
          </Typography>
          <TextField label="Verification Code" onChange={(e) => setCode(e.target.value)} required fullWidth />
          <Button type="submit" variant="outlined" color="primary" disabled={isSubmitting} sx={buttonStyles}>
            {isSubmitting ? 'Verifying...' : 'Verify Email'}
          </Button>
          {error && <Typography color="error">{error}</Typography>}
        </Stack>
      </Paper>
    </Box>
  );
}