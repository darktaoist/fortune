<script setup>
// Reusable free-reading card used in the main page's "Free" grid (and later
// in other catalog views). `badge` selects the jade FREE / purple NEW pill.
const props = defineProps({
  to: { type: [String, Object], required: true },
  glyph: { type: String, required: true },
  titleKey: { type: String, required: true },
  descKey: { type: String, required: true },
  badge: { type: String, default: 'free' }, // 'free' | 'new' | 'pro'
})
const { t } = useI18n()
const localePath = useLocalePath()
const resolvedTo = computed(() => localePath(props.to))
const badgeLabel = computed(() => props.badge.toUpperCase())
</script>

<template>
  <NuxtLink class="free-card" :to="resolvedTo">
    <div class="free-icon">{{ glyph }}</div>
    <h3 class="free-title">{{ t(titleKey) }}</h3>
    <p class="free-desc">{{ t(descKey) }}</p>
    <div class="free-foot">
      <span class="badge" :class="`badge-${badge}`">{{ badgeLabel }}</span>
      <span class="free-arrow">→</span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.free-card {
  display: block;
  text-decoration: none;
  color: inherit;
  background: var(--bg-secondary);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition: all 0.3s var(--ease-out);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.free-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--gold-primary), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}
.free-card:hover {
  border-color: var(--gold-primary);
  transform: translateY(-3px);
}
.free-card:hover::before { opacity: 1; }

.free-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  border: 1px solid var(--gold-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-2xl);
  color: var(--gold-light);
  margin-bottom: var(--space-4);
}
.free-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 600;
  margin-bottom: var(--space-2);
}
.free-desc {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  line-height: 1.6;
}
.free-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--gold-border);
}
.free-arrow {
  color: var(--gold-primary);
  font-size: var(--text-lg);
  transition: transform 0.3s;
}
.free-card:hover .free-arrow { transform: translateX(4px); }
</style>
