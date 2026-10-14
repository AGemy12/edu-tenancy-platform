import type { Shape } from "../../translate";
import type ar from "../ar/profile";

const profile: Shape<typeof ar> = {
  title: "My profile",
  description: "Update your personal details and password.",
  details: {
    title: "Personal details",
    description: "Teachers and students in your center see your name.",
    emailHint: "You use it to sign in.",
    currentPassword: "Current password",
    currentPasswordHint: "Required to confirm the email change.",
    save: "Save changes",
    saved: "Your details were saved",
    saveFailed: "Couldn't save your details",
  },
  password: {
    title: "Password",
    description: "Changing it signs you out on every other device.",
    current: "Current password",
    new: "New password",
    confirm: "Confirm new password",
    submit: "Change password",
    changed: "Your password was changed",
    changeFailed: "Couldn't change your password",
  },
};

export default profile;
