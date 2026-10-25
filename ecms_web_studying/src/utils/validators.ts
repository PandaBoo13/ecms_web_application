import { z } from 'zod';

export const emailSchema = z.email('Email không hợp lệ');

export const passwordSchema = z
  .string()
  .min(6, 'Mật khẩu ít nhất 6 ký tự')
  .max(100, 'Mật khẩu tối đa 100 ký tự');

export const phoneSchema = z
  .string()
  .regex(/^\d{10,11}$/, 'Số điện thoại không hợp lệ')
  .optional()
  .or(z.literal(''));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
    fullName: z.string().min(1, 'Vui lòng nhập họ tên').max(150),
    phone: phoneSchema,
    agreedToTerms: z.literal(true, {
      message: 'Vui lòng đồng ý điều khoản',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Vui lòng nhập mật khẩu cũ'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const courseCreateSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tiêu đề').max(255),
  shortDescription: z.string().max(500).optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  price: z.number().min(0, 'Giá phải >= 0'),
  isFree: z.boolean().optional(),
  courseType: z.enum(['ONLINE', 'OFFLINE']),
  categoryId: z.number().optional(),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export type CourseCreateForm = z.infer<typeof courseCreateSchema>;