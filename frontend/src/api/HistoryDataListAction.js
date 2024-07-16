import { ApiClientClass } from './apiClient/ApiClientClass';

export class HistoryDataListAction {
  execute(params) {
    return new ApiClientClass('history_range_list.php', 'post').execute(params);
  }
}