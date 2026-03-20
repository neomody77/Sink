import { customAlphabet } from 'nanoid'
import { z } from 'zod'

const { slugRegex } = useAppConfig()

const slugDefaultLength = +useRuntimeConfig().public.slugDefaultLength

export const nanoid = (length: number = slugDefaultLength) => customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', length)

export const LinkTypeEnum = z.enum(['redirect', 'content']).default('redirect')

export const LinkSchema = z.object({
  id: z.string().trim().max(26).default(nanoid(10)),
  type: LinkTypeEnum,
  url: z.string().trim().url().max(2048).optional(),
  content: z.string().max(102400).optional(),
  contentType: z.string().trim().max(256).default('text/plain; charset=utf-8'),
  password: z.string().trim().max(128).optional(),
  slug: z.string().trim().max(2048).regex(new RegExp(slugRegex)).default(nanoid()),
  comment: z.string().trim().max(2048).optional(),
  createdAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
  updatedAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
  expiration: z.number().int().safe().refine(expiration => expiration > Math.floor(Date.now() / 1000), {
    message: 'expiration must be greater than current time',
    path: ['expiration'],
  }).optional(),
  title: z.string().trim().max(2048).optional(),
  description: z.string().trim().max(2048).optional(),
  image: z.string().trim().url().max(2048).optional(),
}).refine(
  data => (data.type === 'redirect' && data.url) || (data.type === 'content' && data.content),
  { message: 'URL is required for redirect type, content is required for content type' },
)
