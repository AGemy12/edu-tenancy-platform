import type { Shape } from "../../translate";
import type ar from "../ar/reports";

const reports: Shape<typeof ar> = {
  title: "Monthly reports",
  description: "Attendance and average exam scores for each student",
  loadFailed: "Couldn't load the report",
  empty: "No data for this month.",
  ratingValue: "{rating} / 10",
  lateCount: "{count} late",
  columns: {
    rating: "Average rating",
    student: "Student",
    sessions: "Sessions",
    attended: "Attended",
    attendanceRate: "Attendance rate",
    exams: "Exams",
    averageScore: "Average score",
  },
};

export default reports;
