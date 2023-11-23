'use strict';
import audio from './audio/AudioPlayer';
import { AudioPlayStateEnum } from './audio/enum/AudioPlayStateEnum';
import { AudioClip } from './audio/type/AudioClip';
import { BaseFrameWork, ContextMenu, MessageButtonWindow, MessageWindow, toBoolean } from './base';
import { SoundOwlProperty } from './layout';
import LoadingListComponent from './layout/common/LoadingListComponent.vue';
import SoundClipComponent from './layout/common/SoundClipComponent.vue';
import router from './router';
import { BASE } from './utilization/path';
import { audioParamSave } from './utilization/register';


/**
 * @deprecated
 */
export class PlayCountAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'play_count_list.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);

  }
}

/**
 * @deprecated
 */
export class AlbumCountAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'album_count_list.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);

  }
}

/**
 * @deprecated
 */
export class SoundSearchAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'sound_search.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);

  }
}

/**
 * @deprecated
 */
export class AlbumSoundListAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'album_sounds.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
  }
}

/**
 * @deprecated
 */
export class SiteStatus extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'site_status.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class LockStatus extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'lock_status.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}


/**
 * @deprecated
 */
export class SoundInfomation extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'sound_data.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
  }
}

/**
 * @deprecated
 */
export class SoundAddTimeListAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'sound_addtime_list.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class AlbumListAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'album_list.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class ArtistListAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'artist_list.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class ArtistSoundListAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'artist_sounds.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class GetSetting extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'get_setting.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
  }
}

/**
 * @deprecated
 */
export class UpdateSetting extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'update_setting.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class SoundRegistAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'sound_regist.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class UpdateSoundInfomationAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'sound_regist.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
  }
}

/**
 * @deprecated
 */
export class SetupDataBase extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'setup_database_table.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class SoundPlayedAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'action/sound_played.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
  }
}


