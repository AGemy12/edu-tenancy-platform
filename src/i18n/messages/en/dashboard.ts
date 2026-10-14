import type { Shape } from "../../translate";
import type ar from "../ar/dashboard";

const dashboard: Shape<typeof ar> = {
  greeting: "Welcome, {name}",
  overview: "Overview of {tenant}",
  actions: {
    scheduleSession: "Schedule a session",
    addStudent: "Add student",
  },
  stats: {
    students: "Students",
    teachers: "Teachers",
    courses: "Courses",
    upcomingSessions: "Upcoming sessions",
    openExams: "Published exams",
  },
};

export default dashboard;
