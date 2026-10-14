import type { Shape } from "../../translate";
import type ar from "../ar/auth";

const auth: Shape<typeof ar> = {
  login: {
    title: "Sign in",
    description: "Welcome back. Enter your email and password to continue.",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    submit: "Sign in",
    noAccount: "Don't have an account?",
    createCenter: "Create your center",
  },
  register: {
    title: "Create a new center",
    description: "We'll set up your center and your admin account. Includes a 14-day free trial.",
    tenantName: "Center / teacher name",
    tenantSlug: "Short ID (English)",
    tenantSlugHint: "A short English name for your center, used in links and reports.",
    fullName: "Your full name",
    submit: "Create account",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
  },
  forgot: {
    title: "Forgot your password?",
    description: "Enter your email and we'll send you a link to reset your password.",
    submit: "Send reset link",
    remembered: "Remembered your password?",
    signIn: "Sign in",
    sentTitle: "Check your email",
    sentDescription: "If that email is registered, you'll receive a link to reset your password. The link is valid for 60 minutes.",
    devModeTitle: "Development mode",
    devModeText: "SMTP isn't configured yet. Here's the reset link: {link}",
    backToLogin: "Back to sign in",
  },
  reset: {
    invalidTitle: "Invalid link",
    invalidDescription: "This link doesn't contain a reset token. Request a new one.",
    requestNew: "Request a new link",
    title: "New password",
    description: "Choose a strong password that meets the requirements below. You'll be signed out on all devices.",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    submit: "Save password",
    backToLogin: "Back to sign in",
  },
};

export default auth;
