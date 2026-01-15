import { z } from 'zod'

// GitHub URL validation - accepts full URLs, just handles, or with/without @
export const githubUrlSchema = z.string()
  .min(1, 'GitHub URL or handle is required')
  .max(500, 'Input too long')
  .refine(
    (val) => {
      // Allow github.com URLs
      if (val.includes('github.com/')) {
        return /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9][-a-zA-Z0-9]*\/?$/.test(val)
      }
      // Allow plain handles (with or without @)
      const handle = val.replace('@', '')
      return /^[a-zA-Z0-9][-a-zA-Z0-9]*$/.test(handle) && handle.length <= 39
    },
    { message: 'Invalid GitHub URL or handle format' }
  )

// Email validation
export const emailSchema = z.string()
  .email('Invalid email format')
  .max(320, 'Email too long')

// GitHub handle validation (stricter than URL)
export const githubHandleSchema = z.string()
  .min(1, 'Handle is required')
  .max(39, 'GitHub handle too long')
  .regex(/^[a-zA-Z0-9][-a-zA-Z0-9]*$/, 'Invalid GitHub handle format')

// Referral code validation
export const referralCodeSchema = z.string()
  .min(20, 'Invalid referral code')
  .max(30, 'Invalid referral code')
  .regex(/^[a-zA-Z0-9]+$/, 'Referral code must be alphanumeric')

// Tier validation
export const tierSchema = z.enum(['GUEST', 'AUTHENTICATED', 'PRO'])

// Pagination validation
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
})

// API Schemas
export const analyzeSchema = z.object({
  githubUrl: githubUrlSchema,
  guestIp: z.string().optional(),
  tier: z.string().optional()
})

export const emailLookupSchema = z.object({
  email: emailSchema
})

export const enrichCandidateSchema = z.object({
  githubUrl: githubUrlSchema
})

export const bulkEnrichSchema = z.object({
  handles: z.array(githubHandleSchema)
    .min(1, 'At least one handle required')
    .max(100, 'Maximum 100 handles per request')
})

export const googleAuthSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  referralCode: referralCodeSchema.optional()
})

export const referralApplySchema = z.object({
  code: referralCodeSchema
})

export const setTierSchema = z.object({
  tier: tierSchema
})

export const chekklistSearchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  technologies: z.array(z.string().max(50))
    .max(20, 'Maximum 20 technologies')
    .optional(),
  minExperience: z.coerce.number().int().min(0).max(50).optional(),
  signals: z.array(z.string().max(100))
    .max(10, 'Maximum 10 signals')
    .optional(),
  location: z.string().max(100).optional(),
  minScore: z.coerce.number().min(0).max(100).optional()
})

export const deleteHistorySchema = z.object({
  id: z.string().min(1, 'ID is required')
})

// Type exports for TypeScript
export type AnalyzeInput = z.infer<typeof analyzeSchema>
export type EmailLookupInput = z.infer<typeof emailLookupSchema>
export type EnrichCandidateInput = z.infer<typeof enrichCandidateSchema>
export type BulkEnrichInput = z.infer<typeof bulkEnrichSchema>
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>
export type ReferralApplyInput = z.infer<typeof referralApplySchema>
export type SetTierInput = z.infer<typeof setTierSchema>
export type ChekklistSearchInput = z.infer<typeof chekklistSearchSchema>
export type DeleteHistoryInput = z.infer<typeof deleteHistorySchema>
export type PaginationInput = z.infer<typeof paginationSchema>
