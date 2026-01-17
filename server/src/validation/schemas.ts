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

export const historyQuerySchema = z.object({
  userId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().optional()
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

export const enrichCandidateRequestSchema = z.object({
  candidateId: z.string().optional(),
  githubHandle: githubHandleSchema.optional(),
  email: emailSchema.optional(),
  name: z.string().max(200).optional()
}).refine(
  data => data.candidateId || data.githubHandle || data.email,
  { message: 'At least one of candidateId, githubHandle, or email is required' }
)

export const bulkEnrichSchema = z.object({
  handles: z.array(githubHandleSchema)
    .min(1, 'At least one handle required')
    .max(100, 'Maximum 100 handles per request')
})

export const bulkEnrichCandidatesSchema = z.object({
  candidates: z.array(z.object({
    candidateId: z.string().optional(),
    email: emailSchema.optional(),
    name: z.string().max(200).optional()
  }))
    .min(1, 'At least one candidate required')
    .max(10, 'Maximum 10 candidates per request')
})

export const googleAuthSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: emailSchema,
  name: z.string().min(1, 'Name is required').max(200),
  picture: z.string().url('Invalid picture URL').optional(),
  referralCode: referralCodeSchema.optional()
})

export const referralApplySchema = z.object({
  code: referralCodeSchema
})

export const applyReferralSchema = z.object({
  referralCode: referralCodeSchema,
  userId: z.string().min(1, 'User ID is required')
})

export const setTierSchema = z.object({
  tier: tierSchema,
  resetUsage: z.boolean().optional()
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

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required')
})

export const userIdBodySchema = z.object({
  userId: z.string().optional()
})

// Additional endpoint schemas
export const reportIdParamSchema = z.object({
  id: z.string().cuid('Invalid report ID format')
})

export const handleParamSchema = z.object({
  handle: githubHandleSchema
})

export const updateRecruiterSummarySchema = z.object({
  recruiterSummary: z.string().min(10, 'Summary too short').max(5000, 'Summary too long')
})

export const bulkAnalyzeSchema = z.object({
  handles: z.array(githubHandleSchema)
    .min(1, 'At least one handle required')
    .max(50, 'Maximum 50 handles for bulk analysis')
})

export const atsLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

export const atsAuthSchema = z.object({
  token: z.string().min(1, 'ATS token is required'),
  type: z.enum(['ashby', 'greenhouse'], { message: 'Type must be ashby or greenhouse' })
})

export const githubCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code required'),
  state: z.string().optional()
})

export const cheklistSearchSchemaV2 = z.object({
  reverseUsername: githubHandleSchema.optional(),
  archetype: z.string().max(100).optional(),
  seniority: z.enum(['Junior', 'Mid', 'Senior']).optional(),
  languages: z.array(z.string().max(50)).max(20).optional()
}).refine(
  data => data.reverseUsername || data.archetype || data.seniority || (data.languages && data.languages.length > 0),
  { message: 'At least one search criterion required' }
)

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
export type ReportIdParamInput = z.infer<typeof reportIdParamSchema>
export type UpdateRecruiterSummaryInput = z.infer<typeof updateRecruiterSummarySchema>
export type BulkAnalyzeInput = z.infer<typeof bulkAnalyzeSchema>
export type AtsLoginInput = z.infer<typeof atsLoginSchema>
export type GithubCallbackInput = z.infer<typeof githubCallbackSchema>
export type CheklistSearchV2Input = z.infer<typeof cheklistSearchSchemaV2>

// CrossChekk schemas
export const saveJDSchema = z.object({
  title: z.string().min(1, 'Job title is required').max(200),
  company: z.string().max(200).optional(),
  description: z.string().min(50, 'Job description is too short').max(20000, 'Job description is too long')
})

export const crossChekkAnalyzeSchema = z.object({
  jdId: z.string().optional(), // Use saved JD
  jdText: z.string().min(50).max(20000).optional(), // Or provide JD text directly
  jdTitle: z.string().min(1).max(200).optional(), // Required if using jdText
  jdCompany: z.string().max(200).optional(),

  // Candidate input (multiple sources)
  githubHandle: githubHandleSchema.optional(),
  candidateId: z.string().optional(), // From existing analysis
  reportId: z.string().optional(), // From existing VibeReport
  email: emailSchema.optional(),

  // Optional enrichment data for deeper analysis
  resumeText: z.string().max(50000).optional()
}).refine(
  data => data.jdId || (data.jdText && data.jdTitle),
  { message: 'Either jdId or (jdText + jdTitle) is required' }
).refine(
  data => data.githubHandle || data.candidateId || data.reportId || data.email,
  { message: 'At least one candidate identifier required (githubHandle, candidateId, reportId, or email)' }
)

export type SaveJDInput = z.infer<typeof saveJDSchema>
export type CrossChekkAnalyzeInput = z.infer<typeof crossChekkAnalyzeSchema>
