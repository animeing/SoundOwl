import { createRouter, createWebHistory } from "vue-router";
import Home from "./layout/home/Home.vue";
import {AlbumList, ArtistList, AlbumSoundList, ArtistSoundList, Search, PlayListNames, PlaylistSoundList, Setting, SetUp} from "./page";
import { BASE } from "./utilization/path";
import NotFound from "./layout/error/NotFound.vue";

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
            component: Search,
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
            component: Setting,
            meta:{
                title:'General'
            }
        },
        {
            path: '/setting/equalizer',
            name: 'equalizer',
            component: Setting,
            meta:{
                title:'Equalizer'
            }
        },
        {
            path: '/setting/effect',
            name: 'effect',
            component: Setting,
            meta: {
                title: 'Effect'
            }
        },
        {
            path: '/setup',
            name: 'setup',
            component: SetUp,
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
    ]
});

export default router;