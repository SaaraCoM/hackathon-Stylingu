import {BrowserMultiFormatReader} from '@zxing/browser';
window.StylingBarcode={async decode(dataUrl){const reader=new BrowserMultiFormatReader();try{return (await reader.decodeFromImageUrl(dataUrl)).getText();}catch{return '';}}};
