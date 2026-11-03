// Lee dimensiones antes de reservar memoria para descomprimir.
export function imageBounds(input){
  const b=new Uint8Array(input),v=new DataView(b.buffer,b.byteOffset,b.byteLength);
  const text=(offset,n)=>String.fromCharCode(...b.subarray(offset,offset+n));
  let width=0,height=0,orientation=1;
  const exif=(offset,length)=>{
    let start=offset;if(text(start,6)==='Exif\0\0')start+=6;
    const end=offset+length;if(start+8>end)return;
    const little=text(start,2)==='II';if(!little&&text(start,2)!=='MM')return;
    const u16=o=>v.getUint16(o,little),u32=o=>v.getUint32(o,little);
    if(u16(start+2)!==42)return;const first=start+u32(start+4);
    if(first<start+8||first+2>end)return;const count=u16(first);
    if(count>256||first+2+count*12>end)return;
    for(let i=0;i<count;i++){const entry=first+2+i*12;if(u16(entry)===0x112&&u16(entry+2)===3&&u32(entry+4)===1){const n=u16(entry+8);if(n>=1&&n<=8)orientation=n;}}
  };
  if(b.length>=24&&text(0,8)==='\x89PNG\r\n\x1a\n'){
    if(v.getUint32(8)!==13||text(12,4)!=='IHDR')throw new Error('INVALID_IMAGE');
    width=v.getUint32(16);height=v.getUint32(20);
    for(let i=8;i+12<=b.length;){const n=v.getUint32(i),kind=text(i+4,4);if(n>b.length-i-12)throw new Error('INVALID_IMAGE');if(kind==='acTL')throw new Error('ANIMATED_IMAGE');if(kind==='eXIf')exif(i+8,n);i+=n+12;if(kind==='IEND')break;}
  }else if(b.length>=16&&b[0]===255&&b[1]===216){
    let i=2;
    while(i<b.length){if(b[i++]!==255)throw new Error('INVALID_IMAGE');while(b[i]===255)i++;const marker=b[i++];if(marker===0xda||marker===0xd9)break;if(marker===1||(marker>=0xd0&&marker<=0xd7))continue;if(i+2>b.length)throw new Error('INVALID_IMAGE');const n=v.getUint16(i);if(n<2||i+n>b.length)throw new Error('INVALID_IMAGE');
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){if(n<8)throw new Error('INVALID_IMAGE');height=v.getUint16(i+3);width=v.getUint16(i+5);}
      if(marker===0xe1)exif(i+2,n-2);i+=n;
    }
  }else if(b.length>=30&&text(0,4)==='RIFF'&&text(8,4)==='WEBP'){
    if(v.getUint32(4,true)+8!==b.length)throw new Error('INVALID_IMAGE');
    for(let i=12;i+8<=b.length;){const kind=text(i,4),n=v.getUint32(i+4,true),o=i+8;if(kind==='ANIM'||kind==='ANMF')throw new Error('ANIMATED_IMAGE');if(n>b.length-o)throw new Error('INVALID_IMAGE');
      if(kind==='VP8X'&&n>=10){if(b[o]&2)throw new Error('ANIMATED_IMAGE');width=1+b[o+4]+(b[o+5]<<8)+(b[o+6]<<16);height=1+b[o+7]+(b[o+8]<<8)+(b[o+9]<<16);}
      if(kind==='VP8 '&&n>=10&&text(o+3,3)==='\x9d\x01\x2a'){width=v.getUint16(o+6,true)&0x3fff;height=v.getUint16(o+8,true)&0x3fff;}
      if(kind==='VP8L'&&n>=5&&b[o]===0x2f){const bits=v.getUint32(o+1,true);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;}
      if(kind==='EXIF')exif(o,n);i=o+n+(n%2);
    }
  }
  if(width<16||height<16||width*height>4000000)throw new Error('IMAGE_DIMENSIONS');
  return {width,height,orientation};
}
