import { ApiClientClass } from './apiClient/ApiClientClass';

export class PlayCountAction {
  execute() {
    return new ApiClientClass('play_count_list.php').execute();
  }
}

