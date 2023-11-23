<template>
    <div class="audio-list">
        <button
            v-for="(item,index) in playlist"
            :key="index"
            class="audio-item"
            @click="onclick(item)"
            @click.right.prevent="soundContext(item)">
            <PlaylistClipComponent :playlist="item" />
        </button>
    </div>
</template>
<script>
import { BaseFrameWork, ContextMenu, MessageWindow } from '../../base';
import { BASE } from '../../utilization/path';
import PlaylistClipComponent from './parts/PlaylistClipComponent.vue';

export default {
  name:'PlayListNames',
  components:{
    PlaylistClipComponent
  },
  
  data(){
    return {playlist:[]};
  },
  mounted() {
    this.getPlaylists();
  },
  methods:{
    soundContext(playlist) {

      let deleted = BaseFrameWork.createCustomElement('sw-libutton');
      deleted.menuItem.onclick=()=>{
                
        let action = new class extends BaseFrameWork.Network.RequestServerBase {
          constructor() {
            super(null, BASE.API+'playlist_action.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
          }
        };
        action.formDataMap.append('method', 'delete');
        action.formDataMap.append('name', playlist.play_list);
                
        action.httpRequestor.addEventListener('success', ()=>{
          let message = new MessageWindow;
          message.value = `${playlist.play_list} has been deleted.`;
          message.open();
          message.close(500);
          this.getPlaylists();
        });
        action.execute();

      };
      deleted.menuItem.value = 'Deleted';
      ContextMenu.contextMenu.appendChild(deleted);



    },
    onclick(playlistData) {
      this.$router.push({name:'playlist_sounds', query: {list: playlistData.play_list}});
    },
    getPlaylists() {

      let action = new class extends BaseFrameWork.Network.RequestServerBase {
        constructor() {
          super(null, BASE.API+'playlist_action.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
        }
      };
      action.formDataMap.append('method', 'names');
      action.httpRequestor.addEventListener('success', event=>{
        this.playlist.splice(0);
        for (const response of event.detail.response) {
          this.playlist.push(response);
        }
      });
      action.execute();
    }
  }
};
</script>