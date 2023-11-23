import axios from 'axios';
import { BASE } from '../../utilization/path';

const apiClient = axios.create({
  baseURL: BASE.API
});

export default apiClient;