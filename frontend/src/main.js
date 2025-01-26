import { createApp } from 'vue';
import './base';
import router from './router';
import { BaseFrameWork } from './base';
import './layout';
import App from './layout/app/App.vue';
import vuetify from './thema.js';


const searchBox = document.createElement('sw-searchbox');
export default searchBox;
(()=>{
  const mainMenu=()=>{
    // let menu = document.getElementById('main-menu');
    // menu.innerHTML = '';
    // searchBox.searchEvent = value =>{
    //   router.push({name:'search', query: {SearchWord: value}});
    // };
    // searchBox.classList.add('searchbox');
    // menu.appendChild(searchBox);
        
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
    dropdownMenu.addItem('History List',()=>{
      router.push({name:'history_list'});
    });
    dropdownMenu.addItem('Setting', ()=>{
      router.push({name:'setting'});
    });

        
  };
  window.addEventListener('load', mainMenu);

})();





const app = createApp(App).use(vuetify);

app.use(router);
app.mount('#app');


router.afterEach((to, _from) =>{
  const nearestWithTitle = to.matched.slice().reverse().find(r => r.meta && r.meta.title);
  if(nearestWithTitle) {
    document.title = `${nearestWithTitle.meta.title} - SoundOwl`;
  }
});



