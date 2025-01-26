
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css'

const thema = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

// テーマカラーのオーバーライド
/**
 * @type {{background:String,primary:String,secondary:String,accent:String,error:String,info:String,success:String,warning:String, 'on-background': string ,'on-surface': string, 'on-primary': string, 'on-secondary': string ,'on-success': string, 'on-warning': string, 'on-error': string, 'on-info': string;}}
 */
export const colorThema = {
  background: thema === 'dark' ? '#3F3F3F' : '#EEE',
  'on-background': thema === 'dark' ? '#c7c7c7' : '#000000',

};

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    themes: {
      dark: {
        colors:colorThema
      },
      light: {
        colors:colorThema
      },
    }
  }
});

vuetify.theme.global.name.value = thema;

export default vuetify;