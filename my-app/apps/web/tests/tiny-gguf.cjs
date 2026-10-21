// A ~100 KB synthetic, untrained model for native engine lifecycle tests.
// It has no study capability and must never be added to the product model catalog.
const fs=require('node:fs');
exports.createTinyGguf=function(file){
 const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n);return b;},u64=n=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(n));return b;},f32=n=>{const b=Buffer.alloc(4);b.writeFloatLE(n);return b;},str=s=>{const b=Buffer.from(s);return Buffer.concat([u64(b.length),b]);};
 const kv=[];
 const value=(k,type,b)=>kv.push(Buffer.concat([str(k),u32(type),b]));
 const integer=(k,n)=>value(k,4,u32(n)),string=(k,s)=>value(k,8,str(s));
 string('general.architecture','llama');string('general.name','Synthetic untrained lifecycle fixture');integer('general.file_type',0);
 integer('llama.context_length',4096);integer('llama.embedding_length',32);integer('llama.block_count',1);integer('llama.feed_forward_length',64);integer('llama.attention.head_count',4);integer('llama.attention.head_count_kv',4);
 value('llama.attention.layer_norm_rms_epsilon',6,f32(0.00001));value('llama.rope.freq_base',6,f32(10000));
 const tokens=['<unk>','<s>','</s>',...Array.from({length:256},(_,i)=>`<0x${i.toString(16).toUpperCase().padStart(2,'0')}>`),'▁'];
 string('tokenizer.ggml.model','llama');value('tokenizer.ggml.tokens',9,Buffer.concat([u32(8),u64(tokens.length),...tokens.map(str)]));
 value('tokenizer.ggml.scores',9,Buffer.concat([u32(6),u64(tokens.length),...tokens.map(()=>f32(0))]));
 value('tokenizer.ggml.token_type',9,Buffer.concat([u32(5),u64(tokens.length),...tokens.map((_,i)=>u32(i===0?2:i<3?3:i<259?6:1))]));
 integer('tokenizer.ggml.unknown_token_id',0);integer('tokenizer.ggml.bos_token_id',1);integer('tokenizer.ggml.eos_token_id',2);
 string('tokenizer.chat_template',"{% for message in messages %}{{ message['role'] }}: {{ message['content'] }}\n{% endfor %}assistant: ");
 const tensors=[];let offset=0;
 const tensor=(name,dims,fill)=>{const count=dims.reduce((a,b)=>a*b,1),data=Buffer.alloc(count*4);for(let i=0;i<count;i++)data.writeFloatLE(fill(i),i*4);const padding=Buffer.alloc((32-data.length%32)%32);tensors.push({info:Buffer.concat([str(name),u32(dims.length),...dims.map(u64),u32(0),u64(offset)]),data,padding});offset+=data.length+padding.length;};
 tensor('token_embd.weight',[32,tokens.length],()=>0.1);tensor('output_norm.weight',[32],()=>1);tensor('output.weight',[32,tokens.length],i=>Math.floor(i/32)===68?0.1:0);
 for(const name of ['attn_norm','ffn_norm'])tensor(`blk.0.${name}.weight`,[32],()=>1);
 for(const name of ['attn_q','attn_k','attn_v','attn_output'])tensor(`blk.0.${name}.weight`,[32,32],()=>0);
 tensor('blk.0.ffn_gate.weight',[32,64],()=>0);tensor('blk.0.ffn_down.weight',[64,32],()=>0);tensor('blk.0.ffn_up.weight',[32,64],()=>0);
 const header=Buffer.concat([Buffer.from('GGUF'),u32(3),u64(tensors.length),u64(kv.length),...kv,...tensors.map(t=>t.info)]);
 fs.writeFileSync(file,Buffer.concat([header,Buffer.alloc((32-header.length%32)%32),...tensors.flatMap(t=>[t.data,t.padding])]));
};
