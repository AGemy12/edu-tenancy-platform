import type { Shape } from "../../translate";
import type ar from "../ar/exams";

const exams: Shape<typeof ar> = {
  title: "Monthly exams",
  description: "Exams teachers set for each course every month",
  create: "Add exam",
  emptyTitle: "No exams yet",
  emptyText: "Create a monthly exam for a course, then record student grades.",
  myScore: "{score} / {total}",
  notGraded: "Not graded yet",
  grading: {
    title: "Enter marks",
    description: "{course} · out of {total}",
    student: "Student",
    score: "Mark",
    feedback: "Note",
    feedbackPlaceholder: "Optional",
    empty: "No students are enrolled in this course",
    emptyHint: "Enroll students in the course first, from the Courses page.",
    outOf: "out of {total}",
    invalid: "Mark between 0 and {total}",
    saved: "Marks saved",
  },
  columns: {
    myScore: "My mark",
    results: "Results",
  },
  form: {
    monthHint: "Any day within the month",
  },
  status: {
    DRAFT: "Draft",
    PUBLISHED: "Published",
    CLOSED: "Closed",
  },
  actions: {
    grade: "Enter marks",
    publish: "Publish exam",
    close: "Close exam",
  },
};

export default exams;
