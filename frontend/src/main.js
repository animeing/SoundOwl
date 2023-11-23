import { createApp } from 'vue';
import './base';
import AudioController from './layout/footer/AudioController.vue';
import router from './router';

const footer = createApp({});
footer.component('AudioController', AudioController);
footer.mount('#controller');
const app = createApp({
  template:`
    <router-view></router-view>`
});

app.use(router);


router.afterEach((to, _from) =>{
  const nearestWithTitle = to.matched.slice().reverse().find(r => r.meta && r.meta.title);
  if(nearestWithTitle) {
    document.title = `${nearestWithTitle.meta.title} - SoundOwl`;
    let viewNameElement = document.getElementById('view-name');
    viewNameElement.innerText = nearestWithTitle.meta.title;
    viewNameElement.setAttribute('data-hint', nearestWithTitle.meta.title);
  }
});

app.mount('#base');


