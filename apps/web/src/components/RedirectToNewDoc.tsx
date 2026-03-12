import React from "react";
import { Navigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export const RedirectToNewDoc: React.FC = () => {
  const id = uuidv4();
  return <Navigate to={`/${id}`} replace />;
};
