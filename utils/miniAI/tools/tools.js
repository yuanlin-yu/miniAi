import { query } from '../rag/rag';

export const toolsData = [
	{
		"type": "function",
		"function": {
			"name": "getWeather",
			"description": "获取指定城市的天气信息",
			"parameters": {
				"type": "object",
				"properties": {
					"location": { "type": "string", "description": "城市名称" }
				},
				"required": ["location"]
			}
		},
	},
	{
		"type": "function",
		"function": {
			"name": "ragQuery",
			"description": "根据用户需求，通过rag语义搜索获取数据库数据",
			"parameters": {
				"type": "object",
				"properties": {
					"text": { "type": "string", "description": "输入的搜索文本" },
				},
				"required": ["text"]
			}
		},
	}
]

export const functions = [
	{
		"name": "getWeather",  //注意需与上面对应
		"function": getWeather
	},
	{
		"name": "ragQuery",  //注意需与上面对应
		"function": ragQuery,
		"isAsync": true //异步函数需注明
	}
]

function getWeather(location) {
	return {
		location: location,
		weather: '晴天'
	}
}

// 定义rag tool
async function ragQuery(text) {
	const queryRes = await query(text, 3);
  return {
		results: queryRes
	}
}

// 输出tools
export const tools = {
	toolsData,
	functions
}


