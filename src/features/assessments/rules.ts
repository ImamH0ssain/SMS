type GradeableStudent = { id: string; fullName: string };
type StudentActivity<TStudent extends GradeableStudent> = { studentId: string; student: TStudent };

/** Preserves historic gradeability independently of a student's present enrolment status. */
export function mergeGradingGrid<TStudent extends GradeableStudent, TSubmission extends StudentActivity<TStudent>, TResult extends StudentActivity<TStudent>>(
  eligible: TStudent[],
  submissions: TSubmission[],
  results: TResult[],
) {
  const entries = new Map<string, { student: TStudent; submission?: TSubmission; result?: TResult }>();
  for (const student of eligible) entries.set(student.id, { student });
  for (const submission of submissions) entries.set(submission.studentId, { ...entries.get(submission.studentId), student: submission.student, submission });
  for (const result of results) entries.set(result.studentId, { ...entries.get(result.studentId), student: result.student, result });
  return [...entries.values()].sort((a, b) => a.student.fullName.localeCompare(b.student.fullName));
}
