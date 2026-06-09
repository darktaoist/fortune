<script setup>
// 운세 결과 후기 작성 폼. 별점(필수) + 한 줄 후기(선택) + 메인 공개 동의(is_public).
// reviews 테이블에 insert (RLS: 본인 소유). 미로그인 시 로그인으로 유도.
// 공개 동의한 후기는 메인 "그들의 이야기"에 노출될 수 있다.
const props = defineProps({
  typeKey: { type: String, required: true },
  readingId: { type: String, default: null },
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const rating = ref(0)
const hover = ref(0)
const text = ref('')
const consent = ref(false)
const submitting = ref(false)
const submitted = ref(false)
const errorMsg = ref('')

const stars = [1, 2, 3, 4, 5]
function setRating(n) { rating.value = n; errorMsg.value = '' }

async function submit() {
  if (submitting.value) return
  errorMsg.value = ''
  if (!user.value) {
    navigateTo(localePath({ path: '/login', query: { reason: 'save', redirect: route.fullPath } }))
    return
  }
  if (rating.value < 1) { errorMsg.value = t('review.needRating'); return }
  submitting.value = true
  // 표시 이름 비정규화: profiles는 비로그인이 못 읽으므로 메인 노출용 이름을 함께 저장.
  const { data: prof } = await supabase.from('profiles').select('nickname').eq('id', user.value.id).single()
  const authorName = prof?.nickname || user.value.email?.split('@')[0] || null
  const { error } = await supabase.from('reviews').insert({
    owner_id: user.value.id,
    reading_id: props.readingId,
    type_key: props.typeKey,
    rating: rating.value,
    text: text.value.trim() || null,
    is_public: consent.value,
    author_name: authorName,
    locale: locale.value,
  })
  submitting.value = false
  if (error) { errorMsg.value = error.message; return }
  submitted.value = true
}

function editAgain() { submitted.value = false }
</script>

<template>
  <section class="review">
    <!-- 작성 완료 -->
    <div v-if="submitted" class="thanks">
      <div class="thanks-glyph">謝</div>
      <h3>{{ t('review.thanksTitle') }}</h3>
      <p>{{ t('review.thanksDesc') }}</p>
      <button class="edit-again" @click="editAgain">{{ t('review.editAgain') }}</button>
    </div>

    <!-- 작성 폼 -->
    <template v-else>
      <div class="review-head">
        <h3>{{ t('review.title') }}</h3>
        <p>{{ t('review.sub') }}</p>
      </div>

      <div class="rate-row">
        <span class="rate-label">{{ t('review.rate') }}</span>
        <div class="stars" @mouseleave="hover = 0">
          <button
            v-for="s in stars" :key="s" type="button" class="star"
            :class="{ on: (hover || rating) >= s }"
            :aria-label="`${s}`"
            @mouseenter="hover = s" @click="setRating(s)"
          >★</button>
        </div>
      </div>

      <textarea
        v-model="text" class="review-text" rows="2" maxlength="300"
        :placeholder="t('review.placeholder')"
      />

      <label class="consent">
        <input v-model="consent" type="checkbox">
        <span>{{ t('review.consent') }}</span>
      </label>

      <p v-if="errorMsg" class="review-error">{{ errorMsg }}</p>

      <button class="submit-btn" :disabled="submitting" @click="submit">
        {{ submitting ? t('auth.processing') : t('review.submit') }}
      </button>
    </template>
  </section>
</template>

<style scoped>
.review {
  margin-top: var(--space-8);
  padding: var(--space-8);
  background: var(--bg-secondary);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-lg);
}
.review-head { margin-bottom: var(--space-5); text-align: center; }
.review-head h3 { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; margin-bottom: var(--space-2); }
.review-head p { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.6; }

.rate-row { display: flex; align-items: center; justify-content: center; gap: var(--space-4); margin-bottom: var(--space-4); }
.rate-label { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }
.stars { display: flex; gap: 4px; }
.star { font-size: 1.8rem; line-height: 1; color: var(--gold-border); transition: color 0.15s, transform 0.15s; }
.star:hover { transform: scale(1.15); }
.star.on { color: var(--gold-primary); }

.review-text {
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--gold-border);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  line-height: 1.6;
  resize: vertical;
  margin-bottom: var(--space-4);
}
.review-text:focus { outline: none; border-color: var(--gold-primary); box-shadow: 0 0 0 3px var(--gold-soft); }

.consent { display: flex; align-items: flex-start; gap: 8px; font-size: var(--text-sm); color: var(--text-secondary); cursor: pointer; margin-bottom: var(--space-4); }
.consent input { margin-top: 3px; accent-color: var(--gold-primary); width: 16px; height: 16px; flex-shrink: 0; }

.review-error { color: #F87171; font-size: var(--text-sm); text-align: center; margin-bottom: var(--space-3); }

.submit-btn {
  width: 100%;
  padding: 13px 18px;
  border-radius: var(--radius-md);
  border: 1px solid var(--gold-primary);
  background: var(--gold-primary);
  color: var(--text-on-gold);
  font-size: var(--text-base);
  font-weight: 700;
  transition: transform 0.15s var(--ease-out), box-shadow 0.2s;
}
.submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(201,168,76,0.30); }
.submit-btn:disabled { opacity: 0.6; cursor: progress; transform: none; box-shadow: none; }

/* thanks */
.thanks { text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--space-3); padding: var(--space-4) 0; }
.thanks-glyph { width: 56px; height: 56px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--gold-soft); color: var(--gold-light); font-family: var(--font-display); font-size: 1.6rem; font-weight: 700; }
.thanks h3 { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; }
.thanks p { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.6; }
.edit-again { margin-top: var(--space-2); font-size: var(--text-sm); color: var(--gold-primary); text-decoration: underline; text-underline-offset: 3px; }
.edit-again:hover { color: var(--gold-light); }
</style>
