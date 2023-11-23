import { createApp } from 'vue';
import './base';
import AudioController from './layout/footer/AudioController.vue';
import router from './router';
import { BaseFrameWork } from './base';


const searchBox = document.createElement('sw-searchbox');
export default searchBox;
(()=>{
  const mainMenu=()=>{
    let menu = document.getElementById('main-menu');
    menu.innerHTML = '';
    searchBox.searchEvent = value =>{
      router.push({name:'search', query: {SearchWord: value}});
    };
    searchBox.classList.add('searchbox');
    menu.appendChild(searchBox);
        
    let dropdownMenu = BaseFrameWork.createCustomElement('sw-dropdown');
    dropdownMenu.classList.add('header-item', 'nonselectable');
    dropdownMenu.displayName = 'Menu';
    menu.appendChild(dropdownMenu);
    dropdownMenu.addItem('Artist List', ()=>{
      router.push({name:'artist_list'});
    });
    dropdownMenu.addItem('Album List', ()=>{
      router.push({name:'album_list'});
    });
    dropdownMenu.addItem('Play List',()=>{
      router.push({name:'playlists'});
    });
    dropdownMenu.addItem('Setting', ()=>{
      router.push({name:'setting'});
    });

        
  };
  window.addEventListener('load', mainMenu);

})();






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


