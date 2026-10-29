'use strict';
import { BaseFrameWork, MessageButtonWindow } from './base';
import { BASE } from './utilization/path';


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
    // 各曲一覧の成功通知は呼出元に任せ、失敗通知を全ての個別更新で共有する。
    this.httpRequestor.addEventListener('error', event => {
      const detail = event.detail?.response?.detail;
      const notification = new MessageButtonWindow();
      notification.value = typeof detail === 'string' && detail.trim()
        ? detail
        : 'Could not update this sound. Try again.';
      notification.setAttribute('role', 'alert');
      notification.addItem('Close', () => notification.close());
      notification.open();
    });
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


