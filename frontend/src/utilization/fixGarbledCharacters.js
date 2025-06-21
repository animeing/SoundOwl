import jschardet from 'jschardet';
import Encoding from 'encoding-japanese';

export const fixGarbledCharacters=(text)=>{
  if(text == null){
    return text;
  }
  const detect = jschardet.detect(text);
  if(detect.encoding && detect.encoding.toLowerCase() === 'utf-8'){
    return text;
  }
  try {
    const detectText = Encoding.convert(text, {
      to: 'UNICODE',
      from: detect.encoding,
      type: 'string'
    });
    return detectText;
  } catch (error) {
    return text;
  }
};
