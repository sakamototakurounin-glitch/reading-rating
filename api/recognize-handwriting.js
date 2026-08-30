import { jsonResponse, parseRequest, structuredCompletion } from './_openai.js';

const schema={type:'object',additionalProperties:false,required:['text'],properties:{text:{type:'string'}}};
export default async function handler(request,response) {
  if(request.method!=='POST') return jsonResponse(response,405,{error:'Method not allowed'});
  try {
    const {image}=parseRequest(request);
    if(!image?.startsWith('data:image/')) return jsonResponse(response,400,{error:'image is required'});
    const data=await structuredCompletion({
      system:'You transcribe handwritten Japanese accurately. Preserve punctuation and line order. Return only structured data.',
      user:[{role:'user',content:[{type:'input_text',text:'Transcribe all handwriting in this image. Do not explain or correct the writing.'},{type:'input_image',image_url:image}]}],
      schema,
    });
    jsonResponse(response,200,data);
  } catch(error) { jsonResponse(response,503,{error:error.message}); }
}
