import { z } from "zod";

export const studentSchema = z.object({
  student_id: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  date_of_birth: z.string().refine((v) => !isNaN(Date.parse(v)), "invalid date"),
  grade: z.coerce.number().int().min(1).max(12),
  class_code: z.string().min(1),
});

export const classSchema = z.object({
  class_code: z.string().min(1),
  class_name: z.string().min(1),
  grade: z.coerce.number().int().min(1).max(12),
  teacher_email: z.string().email(),
});

export const schemas = {
  student: studentSchema,
  class: classSchema,
} as const;
