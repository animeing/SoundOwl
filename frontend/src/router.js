import { createRouter, createWebHistory } from 'vue-router';
import AlbumList from './layout/albumList/AlbumList.vue';
import AlbumSoundList from './layout/albumSoundList/AlbumSoundList.vue';
import ArtistSoundList from './layout/artistSoundList/ArtistSoundList.vue';
import NotFound from './layout/error/NotFound.vue';
import Home from './layout/home/Home.vue';
import ArtistList from './layout/artistList/ArtistList.vue';
import PlayListNames from './layout/playlistList/PlayListNames.vue';
import PlaylistSoundList from './layout/playlistSoundList/PlaylistSoundList.vue';
import HistoryList from './layout/historyList/HistoryList.vue';
import SettingVue from './layout/settings/SettingVue.vue';
import SetUpVue from './layout/settings/SetupVue.vue';
import { BASE } from './utilization/path';

const router = createRouter({
  history: createWebHistory(BASE.VUE_HOME),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
      meta:{
        title:'Home'
      }
    },
    {
      path:'/album_list',
      name: 'album_list',
      component: AlbumList,
      meta:{
        title:'Album List'
      }
    },
    {
      path:'/artist_list',
      name:'artist_list',
      component: ArtistList,
      meta:{
        title:'Artist List'
      }
    },
    {
      path:'/history_list',
      name:'history_list',
      component:HistoryList,
      meta:{
        title:'History List'
      }
    },
    {
      path:'/album',
      name:'album',
      component: AlbumSoundList,
      meta:{
        title:'Album'
      }
    },
    {
      path:'/artist',
      name:'artist',
      component:ArtistSoundList,
      meta:{
        title:'Artist'
      }
    },
    {
      path: '/search',
      name:'search',
      component: ()=>import('./layout/search/Search.vue'),
      meta:{
        title:'Search'
      }
    },
    {
      path: '/playlists',
      name: 'playlists',
      component: PlayListNames,
      meta:{
        title: 'Play List'
      }
    },
    {
      path: '/playlists/sounds',
      name: 'playlist_sounds',
      component: PlaylistSoundList,
      meta:{
        title: 'Playlist Sounds'
      }
    },
    {
      path: '/setting',
      name: 'setting',
      component: SettingVue,
      meta:{
        title:'Server'
      }
    },
    {
      path: '/setting/equalizer',
      name: 'equalizer',
      component: SettingVue,
      meta:{
        title:'Equalizer'
      }
    },
    {
      path: '/setting/effect',
      name: 'effect',
      component: SettingVue,
      meta: {
        title: 'Effect'
      }
    },
    {
      path: '/setting/soundSculptDebug',
      name: 'soundSculptDebug',
      component: SettingVue,
      meta:{
        title:'Sound Sculpt Debug'
      }
    },
    {
      path: '/setup',
      name: 'setup',
      component: SetUpVue,
      meta:{
        title:'Setup'
      }
    },
    {
      path: '/:catchAll(.*)',
      name: 'notfound',
      component: NotFound,
      meta:{
        title:'Not Found'
      }
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  }
});

export default router;