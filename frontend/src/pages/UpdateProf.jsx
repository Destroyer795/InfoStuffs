import {
  Box,
  Button,
  TextField,
  Typography,
  Avatar,
  Stack,
  Snackbar,
  Alert,
} from '@mui/material';
import React from 'react';
import { useTheme } from '@mui/material/styles';
import { useUser, useReverification } from '@clerk/clerk-react';

export const UpdateProf = () => {
  const theme = useTheme();
  const { user, isLoaded } = useUser();

  const [details, setDetails] = React.useState({
    username: '',
    image: '',
    email: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [snack, setSnack] = React.useState({
    open: false,
    type: 'success',
    message: '',
  });

  const showSnack = (type, message) => {
    setSnack({ open: true, type, message });
  };

  const handleCloseSnack = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnack((prev) => ({ ...prev, open: false }));
  };

  const performUpdate = async () => {
    if (details.image) {
      const file = await fetch(details.image)
        .then((res) => res.blob())
        .then((blob) => new File([blob], 'profile.png', { type: blob.type }));
      await user.setProfileImage({ file });
    }

    if (details.username && details.username !== user.username) {
      await user.update({ username: details.username });
    }

    if (details.email && details.email !== user.primaryEmailAddress?.emailAddress) {
      const newEmail = await user.createEmailAddress({ email: details.email });
      await newEmail.prepareVerification({ strategy: 'email_code' });

      const code = prompt('Enter the verification code sent to your new email:');
      if (code) {
        await newEmail.attemptVerification({ code });
      } else {
        await newEmail.destroy();
        throw new Error('Email verification cancelled');
      }
    }

    if (details.newPassword && details.confirmPassword) {
      if (details.newPassword !== details.confirmPassword) {
        throw new Error('New password and confirmation do not match');
      }

      if (!user.passwordEnabled) {
        await user.updatePassword({ newPassword: details.newPassword });
      } else {
        if (!details.oldPassword) {
          throw new Error('Please enter your current password');
        }
        await user.updatePassword({
          currentPassword: details.oldPassword,
          newPassword: details.newPassword,
        });
      }
    }
  };

  const updateWithReverification = useReverification(performUpdate);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasImageChange = !!details.image;
    const hasUsernameChange = details.username && details.username !== user.username;
    const hasEmailChange = details.email && details.email !== user.primaryEmailAddress?.emailAddress;
    const hasPasswordChange = !!details.newPassword;

    if (!hasImageChange && !hasUsernameChange && !hasEmailChange && !hasPasswordChange) {
      showSnack('info', 'No changes detected');
      return;
    }

    try {
      await updateWithReverification();
      showSnack('success', 'Profile updated successfully');
    } catch (err) {
      console.error(err);
      if (err.code === 'reverification_cancelled') {
        showSnack('info', 'Update cancelled');
        return;
      }
      showSnack('error', err.message || 'An error occurred while updating your profile');
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image' && files?.length > 0) {
      const reader = new FileReader();
      reader.readAsDataURL(files[0]);
      reader.onloadend = () => {
        setDetails((prev) => ({ ...prev, image: reader.result }));
      };
    } else {
      setDetails((prev) => ({ ...prev, [name]: value }));
    }
  };

  const clearImage = () => {
    setDetails((prev) => ({ ...prev, image: '' }));
  };

  if (!isLoaded) return null;

  return (
    <Box
      component="section"
      sx={{
        p: 6,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Typography variant="h4" gutterBottom>
        Update Profile
      </Typography>

      <Avatar
        src={details.image || user.imageUrl}
        alt="Profile"
        sx={{ width: 100, height: 100, mb: 2 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1, mb: 2 }}>
        <Button 
          component="label" 
          variant="outlined"
          className="cursor-hover-target"
          sx={{
            borderWidth: '2px',
            '&:hover': { borderWidth: '2px' }
          }}
        >
          Change Image
          <input hidden accept="image/*" type="file" name="image" onChange={handleChange} />
        </Button>
        <Button 
          variant="outlined" 
          color="error" 
          onClick={clearImage}
          className="cursor-hover-target"
          sx={{
            borderWidth: '2px',
            '&:hover': { borderWidth: '2px' }
          }}
        >
          Delete Image
        </Button>
      </Box>

      <TextField
        label="Username"
        name="username"
        fullWidth
        placeholder={user.username || 'Enter your username'}
        sx={{ mt: 3, maxWidth: 400 }}
        onChange={handleChange}
      />

      <TextField
        label="Email"
        name="email"
        fullWidth
        placeholder={user.primaryEmailAddress?.emailAddress || 'Enter your email'}
        sx={{ mt: 2, maxWidth: 400 }}
        onChange={handleChange}
      />

      <Typography variant="subtitle1" sx={{ mt: 4 }}>
        Change Password
      </Typography>

      <Stack direction="column" spacing={2} sx={{ maxWidth: 400, width: '100%' }}>
        {user.passwordEnabled && (
          <TextField
            label="Current Password"
            name="oldPassword"
            type="password"
            onChange={handleChange}
          />
        )}
        <TextField
          label="New Password"
          name="newPassword"
          type="password"
          onChange={handleChange}
        />
        <TextField
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          onChange={handleChange}
        />
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
        <Button 
          onClick={handleSubmit}
          variant="outlined"
          className="cursor-hover-target"
          sx={{
            borderWidth: '2px',
            '&:hover': { borderWidth: '2px' }
          }}
        >
          Update Profile
        </Button>
        <Button
          variant="outlined"
          onClick={() =>
            setDetails({
              username: '',
              image: '',
              email: '',
              oldPassword: '',
              newPassword: '',
              confirmPassword: '',
            })
          }
          className="cursor-hover-target"
          color="error" 
          sx={{
            borderWidth: '2px',
            '&:hover': { borderWidth: '2px' }
          }}
        >
          Cancel
        </Button>
      </Stack>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={handleCloseSnack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnack}
          severity={snack.type}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};