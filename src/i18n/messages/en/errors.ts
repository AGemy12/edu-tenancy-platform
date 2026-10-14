import type { Shape } from "../../translate";
import type ar from "../ar/errors";

const errors: Shape<typeof ar> = {
  notFound: {
    code: "404",
    title: "Page not found",
    text: "The page may have moved, or the link is wrong.",
  },
  failed: {
    title: "Something went wrong",
    text: "Sorry, this page couldn't be shown. Try again, and if it keeps happening, contact support.",
    reference: "Reference: {digest}",
  },
  home: "Back to home",
};

export default errors;
