<template>
  <v-container class="py-4" fluid>
    <v-card style="background: inherit;">
      <v-card-title>SoundSculpt Debug</v-card-title>

      <v-card-text>
        <div class="d-flex" style="flex-wrap: wrap;align-content: space-around;">
          <v-card class="mb-4" outlined style="background: inherit;">
            <v-card-title>Equalizer Setting (L ch)</v-card-title>
            <v-card-text>
              <div class="equalizer-setting-container">
                <p
                  v-for="item in lhzArray"
                  :key="item.hz"
                  class="equalizer-setting-item"
                >
                  <span>{{ item.hz }} Hz</span>

                  <sw-h-progress
                    class="setting-equalizer"
                    max="15"
                    min="-15"
                    :slider-value="item.gain"
                  />
                </p>
              </div>
            </v-card-text>
          </v-card>
          <v-card class="mb-4" outlined style="background: inherit;">
            <v-card-title>Equalizer Setting (R ch)</v-card-title>

            <v-card-text>
              <div class="equalizer-setting-container">
                <p
                  v-for="item in rhzArray"
                  :key="item.hz"
                  class="equalizer-setting-item"
                >
                  <span>{{ item.hz }} Hz</span>

                  <sw-h-progress
                    class="setting-equalizer"
                    max="15"
                    min="-15"
                    :slider-value="item.gain"
                  />
                </p>
              </div>
            </v-card-text>
          </v-card>
          <v-card class="mb-4" outlined style="background: inherit;">
            <v-card-title>Sculpt multiplier (L ch)</v-card-title>
            <v-card-text>
              <v-text-field
                v-for="item in lmultiplierArray"
                :key="item.hz"
                class="w-50 mx-auto"
                :label="String(item.hz)"
                :model-value="item.multiplier"
                type="number"
                variant="filled"
                @update:model-value="updateMultiplier(leftSoundSculpt, item, $event)"
              />
            </v-card-text>
          </v-card>
          <v-card class="mb-4" outlined style="background: inherit;">
            <v-card-title>Sculpt multiplier (R ch)</v-card-title>
            <v-card-text>
              <v-text-field
                v-for="item in rmultiplierArray"
                :key="item.hz"
                class="w-50 mx-auto"
                :label="String(item.hz)"
                :model-value="item.multiplier"
                type="number"
                variant="filled"
                @update:model-value="updateMultiplier(rightSoundSculpt, item, $event)"
              />
            </v-card-text>
          </v-card>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { BaseFrameWork } from '../../../base';
import audio from '../../../audio/AudioPlayer';

const equalizer = audio.equalizer;
const leftSoundSculpt = audio.exAudioEffect.leftSoundSculptEffect;
const rightSoundSculpt = audio.exAudioEffect.rightSoundSculptEffect;
const lhzArray = ref([]);
const rhzArray = ref([]);
const lmultiplierArray = ref(createMultiplierArray(leftSoundSculpt));
const rmultiplierArray = ref(createMultiplierArray(rightSoundSculpt));

function createMultiplierArray(effect) {
  return Object.entries(effect.emphasisLevels)
    .map(([hz, multiplier]) => ({ hz: Number(hz), multiplier }));
}

function updateMultiplier(effect, item, value) {
  const multiplier = Number(value);
  if (!Number.isFinite(multiplier)) {
    return;
  }
  item.multiplier = multiplier;
  effect.setEmphasisLevel(item.hz, multiplier);
}


/* ----- アニメーション更新 ----- */
const anim = new BaseFrameWork.AnimationFrame();
const refresh = () => {
  lhzArray.value = equalizer.leftEqualizer.gains
    .map(g => {
      const f = equalizer.leftEqualizer.filters[g.hz];
      if (!f || f.gain == null) return null;
      return { hz: g.hz, gain: f.gain.value };
    })
    .filter(Boolean);
  rhzArray.value = equalizer.rightEqualizer.gains
    .map(g => {
      const f = equalizer.rightEqualizer.filters[g.hz];
      if (!f || f.gain == null) return null;
      return { hz: g.hz, gain: f.gain.value };
    })
    .filter(Boolean);
};

onMounted(() => anim.startAnimation(refresh));
onUnmounted(() => anim.stopAnimation());
</script>

<style scoped>
.equalizer-setting-container{ display:flex; flex-direction:column; gap:4px; }
.setting-equalizer{ width:220px; margin-left:8px; }
</style>
