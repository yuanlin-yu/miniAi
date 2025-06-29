const config = require('../env')
const VectorDB = require('./vector-db');
var vectorDB = null;

export const initDB = async (fileName) => {
	vectorDB = new VectorDB({ dim: config.EMBEDDER_DIMENSION, fileName: fileName});
	wx.showLoading({ title: '数据加载中' });
	await vectorDB.load();
	wx.hideLoading();
}

export const cleanChunks = async () => {
 await vectorDB.clearStorage();
}

export const embedding = (textContent) => {
	return new Promise((resolve, reject) => {
	 wx.request({
		 url: config.EMBEDDER_BASEURL,
		 method: 'POST',
		 header: {
			 'Authorization': `Bearer ${config.EMBEDDER_API_KEY}`, 
			 'Content-Type': 'application/json',
		 },
		 data: JSON.stringify({
			 model: config.EMBEDDER_MODEL,
			 input: textContent,  
			 dimension: config.EMBEDDER_DIMENSION,  
			 encoding_format: "float"
		 }),
		 success: (res) => resolve(res.data.data[0].embedding) ,
		 fail: (err) => reject(err)
	 });
	})    
 };

 export const generateVectorChunksArray = async (textContent, chunkSize = 1000, overlapSize = 200) => {
	const vectorChunksArray = [];
	wx.showLoading({ title: '数据生成中...' });
		overlapSize = Math.min(overlapSize, chunkSize);	
	for (let i = 0; i < textContent.length; i += chunkSize - overlapSize) {
			let chunks = textContent.slice(i, i + chunkSize);
			let vector = await embedding(chunks);
			vectorChunksArray.push({
					vector: vector,
					metadata: {
							text: chunks
					}
			});
	}	
	vectorDB.add(vectorChunksArray);
	wx.hideLoading();
	return vectorChunksArray;
}

 export const query = async(text, topK=3) => {
	 const queryResults = [];
	 const queryVector = await embedding(text);
	 const results = vectorDB.search(queryVector, topK);
	 results.forEach(res => {
		queryResults.push({
			id: res.id,
			content: res.metadata.text 
		})
	})
	 return queryResults
 }