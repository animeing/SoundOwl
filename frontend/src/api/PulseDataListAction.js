import { ApiClientClass } from './apiClient/ApiClientClass';

export class PulseDataListAction {
  execute() {
    return new ApiClientClass('audio_pulse_data_list.php').execute();
  }
}
