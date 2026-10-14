import type { Shape } from "../../translate";
import type ar from "../ar/courses";

const courses: Shape<typeof ar> = {
  title: "Courses",
  description: "Courses offered by your teachers",
  create: "Add course",
  emptyTitle: "No courses yet",
  emptyText: "Create a course, assign it to a teacher, then enroll students.",
  priceValue: "EGP {amount}",
  columns: {
    enrolled: "Enrolled",
  },
  form: {
    level: "Level / grade",
    price: "Price (EGP)",
  },
  enrollments: {
    title: "Course students",
    add: "Add student",
    addLabel: "Choose a student to add",
    noneLeft: "All your students are already in this course",
    empty: "No students enrolled yet",
    emptyHint: "Add students so they see the course and its exams, and its sessions include them automatically.",
    count: { zero: "No students", one: "{count} student", other: "{count} students" },
    remove: "Remove {name} from the course",
    added: "Student added",
    removed: "Student removed",
  },
  actions: {
    students: "Course students",
    deactivate: "Suspend course",
    activate: "Activate course",
  },
};

export default courses;
