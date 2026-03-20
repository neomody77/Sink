<script setup>
import { nanoid } from '@@/schemas/link'
import { Shuffle, Sparkles } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const props = defineProps({
  link: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:link'])

const { t } = useI18n()
const link = ref(props.link)
const dialogOpen = ref(false)

const isEdit = !!props.link.id

const linkType = ref(props.link.type || 'redirect')
const slug = ref(props.link.slug || '')
const url = ref(props.link.url || '')
const content = ref(props.link.content || '')
const contentType = ref(props.link.contentType || 'text/plain; charset=utf-8')
const password = ref(props.link.password || '')
const comment = ref(props.link.comment || '')
const expiration = ref(props.link.expiration ? unix2date(props.link.expiration) : undefined)

const urlError = ref('')
const contentError = ref('')
const slugError = ref('')

function randomSlug() {
  slug.value = nanoid()()
}

const aiSlugPending = ref(false)
async function aiSlug() {
  if (!url.value)
    return

  aiSlugPending.value = true
  try {
    const { slug: aiResult } = await useAPI('/api/link/ai', {
      query: { url: url.value },
    })
    slug.value = aiResult
  }
  catch (error) {
    console.log(error)
  }
  aiSlugPending.value = false
}

function validate() {
  urlError.value = ''
  contentError.value = ''
  slugError.value = ''

  if (linkType.value === 'redirect' && !url.value.trim()) {
    urlError.value = t('links.url_required')
    return false
  }
  if (linkType.value === 'content' && !content.value) {
    contentError.value = t('links.content_required')
    return false
  }
  if (!slug.value.trim()) {
    slugError.value = t('links.slug_required')
    return false
  }
  return true
}

async function onSubmit() {
  if (!validate())
    return

  const body = {
    type: linkType.value,
    slug: slug.value,
    ...(linkType.value === 'redirect'
      ? { url: url.value }
      : { content: content.value, contentType: contentType.value }),
    password: password.value || undefined,
    comment: comment.value || undefined,
    expiration: expiration.value ? date2unix(expiration.value, 'end') : undefined,
  }

  const { link: newLink } = await useAPI(isEdit ? '/api/link/edit' : '/api/link/create', {
    method: isEdit ? 'PUT' : 'POST',
    body,
  })
  dialogOpen.value = false
  emit('update:link', newLink, isEdit ? 'edit' : 'create')
  toast(isEdit ? t('links.update_success') : t('links.create_success'))
}

function onOpen() {
  if (!isEdit)
    randomSlug()
}

const { previewMode } = useRuntimeConfig().public
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogTrigger as-child>
      <slot>
        <Button
          class="ml-2"
          variant="outline"
          @click="onOpen"
        >
          {{ $t('links.create') }}
        </Button>
      </slot>
    </DialogTrigger>
    <DialogContent class="max-w-[95svw] max-h-[95svh] md:max-w-lg grid-rows-[auto_minmax(0,1fr)_auto]">
      <DialogHeader>
        <DialogTitle>{{ link.id ? $t('links.edit') : $t('links.create') }}</DialogTitle>
      </DialogHeader>
      <p
        v-if="previewMode"
        class="text-sm text-muted-foreground"
      >
        {{ $t('links.preview_mode_tip') }}
      </p>
      <form
        class="overflow-y-auto px-2 space-y-4"
        @submit.prevent="onSubmit"
      >
        <!-- Type selector -->
        <div class="space-y-2">
          <label class="text-sm font-medium">{{ $t('links.type') }}</label>
          <div class="flex space-x-2">
            <Button
              type="button"
              size="sm"
              :variant="linkType === 'redirect' ? 'default' : 'outline'"
              :disabled="isEdit"
              @click="linkType = 'redirect'"
            >
              {{ $t('links.type_redirect') }}
            </Button>
            <Button
              type="button"
              size="sm"
              :variant="linkType === 'content' ? 'default' : 'outline'"
              :disabled="isEdit"
              @click="linkType = 'content'"
            >
              {{ $t('links.type_content') }}
            </Button>
          </div>
        </div>

        <!-- Slug -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Slug</label>
          <div class="relative">
            <Input
              v-model="slug"
              :disabled="isEdit"
              placeholder="my-link"
            />
            <div
              v-if="!isEdit"
              class="flex absolute right-2 top-1/2 -translate-y-1/2 space-x-3"
            >
              <Shuffle
                class="w-4 h-4 cursor-pointer"
                @click="randomSlug"
              />
              <Sparkles
                v-if="linkType === 'redirect'"
                class="w-4 h-4 cursor-pointer"
                :class="{ 'animate-bounce': aiSlugPending }"
                @click="aiSlug"
              />
            </div>
          </div>
          <p
            v-if="slugError"
            class="text-sm text-destructive"
          >
            {{ slugError }}
          </p>
        </div>

        <!-- URL (redirect mode) -->
        <div
          v-if="linkType === 'redirect'"
          class="space-y-2"
        >
          <label class="text-sm font-medium">URL</label>
          <Input
            v-model="url"
            placeholder="https://example.com"
          />
          <p
            v-if="urlError"
            class="text-sm text-destructive"
          >
            {{ urlError }}
          </p>
        </div>

        <!-- Content (content mode) -->
        <template v-if="linkType === 'content'">
          <div class="space-y-2">
            <label class="text-sm font-medium">Content-Type</label>
            <Input
              v-model="contentType"
              placeholder="text/plain; charset=utf-8"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">{{ $t('links.content') }}</label>
            <Textarea
              v-model="content"
              :placeholder="$t('links.content_placeholder')"
              class="min-h-[120px] font-mono text-sm"
            />
            <p
              v-if="contentError"
              class="text-sm text-destructive"
            >
              {{ contentError }}
            </p>
          </div>
        </template>

        <!-- Password -->
        <div class="space-y-2">
          <label class="text-sm font-medium">{{ $t('links.password_label') }}</label>
          <Input
            v-model="password"
            type="text"
            :placeholder="$t('links.password_placeholder')"
          />
        </div>

        <!-- Comment -->
        <div class="space-y-2">
          <label class="text-sm font-medium">{{ $t('links.comment_label') }}</label>
          <Textarea
            v-model="comment"
            :placeholder="$t('links.comment_placeholder')"
            class="min-h-[60px]"
          />
        </div>

        <DialogFooter>
          <DialogClose as-child>
            <Button
              type="button"
              variant="secondary"
              class="mt-2 sm:mt-0"
            >
              {{ $t('common.close') }}
            </Button>
          </DialogClose>
          <Button type="submit">
            {{ $t('common.save') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
