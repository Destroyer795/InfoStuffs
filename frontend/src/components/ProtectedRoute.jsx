import { useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const { isSignedIn, isLoaded } = useUser();
  const location = useLocation();
  if (!isLoaded) {
    return null;
  }
  if (!isSignedIn) {
    return <Navigate to="/login" state={{ from: location }} />;
  }
  return children;
};

export default ProtectedRoute;
