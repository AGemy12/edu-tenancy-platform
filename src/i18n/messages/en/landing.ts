import type { Shape } from "../../translate";
import type ar from "../ar/landing";

const landing: Shape<typeof ar> = {
  header: {
    signIn: "Sign in",
    startFree: "Start free",
  },
  hero: {
    badge: "For teachers and learning centers",
    title: "All your students, courses and sessions in one place",
    text: "Set up your center in a minute, add your teachers and students, schedule Zoom or Google Meet sessions, then track attendance and exams with monthly reports.",
    createCenter: "Create your center",
    haveAccount: "I already have an account",
  },
  features: {
    students: {
      title: "Student management",
      text: "A profile for every student with attendance, grades and parent contact.",
    },
    sessions: {
      title: "Live sessions",
      text: "Zoom and Google Meet in one click, with the link sent to students automatically.",
    },
    exams: {
      title: "Monthly exams",
      text: "One exam per course each month, with grades and notes recorded.",
    },
    reports: {
      title: "Clear reports",
      text: "Attendance rate and average grade for every student in a monthly report.",
    },
  },
};

export default landing;
