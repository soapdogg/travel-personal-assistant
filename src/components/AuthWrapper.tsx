"use client";
import { Authenticator } from "@aws-amplify/ui-react";
import { ReactNode, useState } from "react";

interface AuthWrapperProps {
  children: ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  // For now, bypass Amplify auth entirely and let our components handle auth
  return <>{children}</>;
}
