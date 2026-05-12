"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginActionState = {
  error?: string;
};

export async function authenticate(_prevState: LoginActionState, formData: FormData): Promise<LoginActionState> {
  try {
    await signIn("credentials", formData);
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "Unable to sign in right now." };
      }
    }

    throw error;
  }
}
