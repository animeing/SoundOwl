import { ApiClientClass } from './apiClient/ApiClientClass';


export class PulseDataDeleteAction {
  execute(deleteFileName) {
    return new ApiClientClass(
      'audio_pulse_data_delete.php',
      'post',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    ).execute({preset:deleteFileName});
  }
}