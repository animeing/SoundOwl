import { createApp } from 'vue';
import './base';
import router from './router';
import './layout';
import App from './layout/app/App.vue';
import vuetify from './thema.js';




const app = createApp(App).use(vuetify);

app.use(router);
app.mount('#app');

window.SoundOwlBuildInfo = __SOUNDOWL_BUILD_INFO__;
console.info('[SoundOwl] build info', window.SoundOwlBuildInfo);

router.afterEach((to, _from) =>{
  const nearestWithTitle = to.matched.slice().reverse().find(r => r.meta && r.meta.title);
  if(nearestWithTitle) {
    document.title = `${nearestWithTitle.meta.title} - SoundOwl`;
  }
});



