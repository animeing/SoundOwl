import { createApp } from 'vue';
import './base';
import AudioController from './layout/footer/AudioController.vue';
import router from './router';
import { BaseFrameWork } from './base';
import './layout';


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
    dropdownMenu.addItem('History List',()=>{
      router.push({name:'history_list'});
    });
    dropdownMenu.addItem('Setting', ()=>{
      router.push({name:'setting'});
    });

        
  };
  window.addEventListener('load', mainMenu);

})();

const app = createApp({
  template:`
	<header>
		<router-link :to="{name:'home'}" class="page-title" title="Home">SoundOwl</router-link>
        <span id='view-name'></span>
		<span id="main-menu">

		</span>
	</header>
    <div id="controller" class="audio-play-controller analyser">
        <AudioController ></AudioController>
    </div>
    <div id="base" class="layout-base">
        <router-view></router-view>
    </div>
  `,
  components:{
    AudioController
  }
})

app.use(router);
app.mount('#app');


router.afterEach((to, _from) =>{
  const nearestWithTitle = to.matched.slice().reverse().find(r => r.meta && r.meta.title);
  if(nearestWithTitle) {
    document.title = `${nearestWithTitle.meta.title} - SoundOwl`;
    let viewNameElement = document.getElementById('view-name');
    viewNameElement.innerText = nearestWithTitle.meta.title;
    viewNameElement.setAttribute('data-hint', nearestWithTitle.meta.title);
  }
});



