import type { Shape } from "../../translate";
import type ar from "../ar/students";

const students: Shape<typeof ar> = {
  title: "Students",
  description: "Manage students and assign them to teachers",
  create: "Add student",
  emptyTitle: "No students yet",
  emptyText: "Add your students and each one gets an account to sign in and follow their sessions.",
  columns: {
    email: "Email",
    grade: "Grade",
    teachers: "Teachers",
    courses: "Courses",
  },
  form: {
    passwordHint: "Optional: leave it empty and the student gets an email to choose one",
  },
  actions: {
    schedule: "Monthly hours schedule",
  },
};

export default students;
