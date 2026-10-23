'use strict';
import { BaseFrameWork } from './base';
import { BASE } from './utilization/path';


/**
 * @deprecated
 */
export class AlbumCountAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'album_count_list', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);

  }
}

/**
 * @deprecated
 */
export class SoundSearchAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'sound_search', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);

  }
}

/**
 * @deprecated
 */
export class AlbumSoundListAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'album_sounds', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
  }
}

/**
 * @deprecated
 */
export class SiteStatus extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'site_status', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class LockStatus extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'lock_status', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}


/**
 * @deprecated
 */
export class SoundInfomation extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'sound_data', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
  }
}

/**
 * @deprecated
 */
export class SoundAddTimeListAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'sound_addtime_list', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class AlbumListAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'album_list', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class ArtistListAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'artist_list', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class ArtistSoundListAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'artist_sounds', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class GetSetting extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'get_setting', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
  }
}

/**
 * @deprecated
 */
export class UpdateSetting extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'update_setting', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class SoundRegistAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'sound_regist', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class UpdateSoundInfomationAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'sound_regist', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
  }
}

/**
 * @deprecated
 */
export class SetupDataBase extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'setup_database_table', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
  }
}

/**
 * @deprecated
 */
export class SoundPlayedAction extends BaseFrameWork.Network.RequestServerBase {
  constructor() {
    super(null, BASE.API+'action/sound_played', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
  }
}

