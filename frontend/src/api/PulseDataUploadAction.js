import { ApiClientClass } from './apiClient/ApiClientClass';

export class PulseDataUploadAction {
  execute(formData) {
    return new ApiClientClass(
      'audio_pulse_data_upload.php',
      'post', 
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    ).execute(formData);
  }
}
