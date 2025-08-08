import { SignUp } from "@clerk/clerk-react";
import { Box, Typography, Stack } from "@mui/material";
import { Link } from "react-router-dom";

export default function Signup() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Stack direction="column" spacing={2} sx={{ textAlign: 'center' }} width={{ sm: '25rem', xs: '90%' }} height={{ sm: '43.3rem', xs: '90%' }} p={4} borderRadius={2} boxShadow={3} bgcolor="background.paper" ml={2} mr={2}>
                <Typography variant="h4" sx={{ mb: 2 }}>Your personal space for everything that matters.</Typography> 
                <Typography variant="body1" sx={{ mb: 4 }}>Easily save memories, notes, and files. Access them anytime, anywhere, safely and securely.</Typography>
            </Stack>
            <SignUp signInUrl="/login" forceRedirectUrl={"/"}/>
        </Box>
    );
}