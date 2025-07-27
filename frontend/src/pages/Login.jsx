import { SignIn } from "@clerk/clerk-react";
import { Box } from "@mui/material";

export default function Login() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <SignIn signUpUrl="/signup" forceRedirectUrl={"/"}/>
        </Box>
    );
}