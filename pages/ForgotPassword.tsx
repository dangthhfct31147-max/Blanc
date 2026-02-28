import React from 'react';
import { Navigate } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  return <Navigate to="/login" replace />;
};

export default ForgotPassword;
