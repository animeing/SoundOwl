import apiClient from './ApiClient';

export class ApiClientClass {
  /**
   * 
   * @param {string} endPoint 
   * @param {string} method
   * @param {Array} options
   */
  constructor(endPoint, method = 'get', options = {}) {
    this.endPoint = endPoint;
    this.method = method;
    this.options = options;
  }

  /**
   * @private
   */
  _buildUrl(data = null) {
    if(this.method.toLowerCase() == 'get' && data != null) {
      const query = new URLSearchParams(data).toString();
      return `${this.endPoint}?${query}`;
    }
    return this.endPoint;
  }

  /**
   * @param {Array} [data=null] 
   */
  execute(data = null) {
    let payload = (this.method.toLowerCase() != 'get' ? data : null);
    return apiClient.request({
      ...this.options,
      method: this.method,
      url: this.endPoint,
      data: payload
    }).catch(error => {
      console.error('An error occurred:', error);
      throw error;
    });
  }
}