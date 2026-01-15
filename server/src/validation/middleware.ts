import { Request, Response, NextFunction } from 'express'
import { z, ZodError } from 'zod'

/**
 * Validation middleware factory
 * Creates middleware that validates request body, query, or params against a Zod schema
 */
export const validate = (schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params
      const validated = await schema.parseAsync(data)

      // Attach validated data to request
      if (source === 'body') {
        req.body = validated
      } else if (source === 'query') {
        req.query = validated as any
      } else {
        req.params = validated as any
      }

      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))

        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        })
      }

      // Unexpected error
      console.error('Validation middleware error:', error)
      return res.status(500).json({
        error: 'Internal validation error'
      })
    }
  }
}

/**
 * Optional validation - doesn't fail if data is missing, but validates if present
 */
export const validateOptional = (schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params

      // Skip validation if no data
      if (!data || Object.keys(data).length === 0) {
        return next()
      }

      const validated = await schema.parseAsync(data)

      // Attach validated data to request
      if (source === 'body') {
        req.body = validated
      } else if (source === 'query') {
        req.query = validated as any
      } else {
        req.params = validated as any
      }

      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))

        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        })
      }

      console.error('Validation middleware error:', error)
      return res.status(500).json({
        error: 'Internal validation error'
      })
    }
  }
}
