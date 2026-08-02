import { DecodedIdToken } from "firebase-admin/auth";

export interface AuthenticatedUser extends DecodedIdToken {
  email: string;
}