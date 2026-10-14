import type { Shape } from "../../translate";
import type ar from "../ar/teachers";

const teachers: Shape<typeof ar> = {
  title: "Teachers",
  description: "Manage your center's teacher accounts",
  create: "Add teacher",
  emptyTitle: "No teachers yet",
  emptyText: "Add your first teacher so they can create courses and schedule sessions, or add yourself if you teach.",
  columns: {
    email: "Email",
    courses: "Courses",
    students: "Students",
  },
  form: {
    passwordHint: "Optional: leave it empty and the teacher gets an email to choose one",
    subjects: "Subjects (comma-separated)",
    subjectsPlaceholder: "Math, Physics",
  },
  self: {
    add: "Add me as a teacher",
    added: "You're now a teacher in your center. Pick yourself when creating courses and sessions.",
    badge: "You",
    removeText: "You'll stop teaching and leave the teachers list. Your center admin account stays as it is.",
  },
};

export default teachers;
